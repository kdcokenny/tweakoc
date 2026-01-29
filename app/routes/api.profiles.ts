import { ZodError } from "zod";
import { generateProfileFiles } from "~/lib/api/file-generator";
import { generateComponentId } from "~/lib/api/id-generator";
import { checkRateLimit, saveProfile } from "~/lib/api/profile-store";
import { getSubmissionWithDefaults } from "~/lib/api/ref-resolver";
import { parseCreateProfileRequest } from "~/lib/api/schemas";
import { createErrorResponse, createJsonResponse } from "~/lib/api/types";
import { getHarness } from "~/lib/harness-registry";
import type { SlotDefinition } from "~/lib/harness-schema";
import type { Route } from "./+types/api.profiles";

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB

/**
 * Validate a slot value against its type definition.
 * Returns error object if invalid, null if valid.
 */
function validateSlotValue(
	slotId: string,
	value: unknown,
	slotDef: SlotDefinition,
): { path: string; slotId: string; message: string } | null {
	const path = `/slotValues/${slotId}`;

	switch (slotDef.type) {
		case "model":
			if (typeof value !== "string" || value.length === 0) {
				return { path, slotId, message: "Model must be a non-empty string" };
			}
			break;

		case "number":
			if (typeof value !== "number" || !Number.isFinite(value)) {
				return { path, slotId, message: "Value must be a number" };
			}
			if (slotDef.min !== undefined && value < slotDef.min) {
				return { path, slotId, message: `Value must be >= ${slotDef.min}` };
			}
			if (slotDef.max !== undefined && value > slotDef.max) {
				return { path, slotId, message: `Value must be <= ${slotDef.max}` };
			}
			break;

		case "enum":
			if (typeof value !== "string") {
				return { path, slotId, message: "Enum value must be a string" };
			}
			if (!slotDef.options.includes(value)) {
				return {
					path,
					slotId,
					message: `Value must be one of: ${slotDef.options.join(", ")}`,
				};
			}
			break;

		case "boolean":
			if (typeof value !== "boolean") {
				return { path, slotId, message: "Value must be a boolean" };
			}
			break;

		case "text":
			if (typeof value !== "string") {
				return { path, slotId, message: "Value must be a string" };
			}
			break;
	}

	return null;
}

export async function action({ request, context }: Route.ActionArgs) {
	// Only allow POST
	if (request.method !== "POST") {
		return createErrorResponse(
			"METHOD_NOT_ALLOWED",
			"Only POST is allowed",
			405,
		);
	}

	const kv = context.cloudflare.env.PROFILES_KV;

	// Check Content-Length
	const contentLength = request.headers.get("content-length");
	if (contentLength && Number.parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
		return createErrorResponse(
			"PAYLOAD_TOO_LARGE",
			"Request body exceeds 10KB limit",
			413,
		);
	}

	// Rate limiting
	const ip =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for")?.split(",")[0] ||
		"unknown";

	const allowed = await checkRateLimit(kv, ip);
	if (!allowed) {
		return createErrorResponse(
			"RATE_LIMITED",
			"Too many requests. Try again later.",
			429,
		);
	}

	try {
		// Parse and validate request body
		const body = await request.json();
		const validated = parseCreateProfileRequest(body);

		// 1. Load harness
		const harness = getHarness(validated.harnessId);
		if (!harness) {
			return createErrorResponse(
				"VALIDATION_ERROR",
				`Unknown harness: ${validated.harnessId}`,
				400,
				{
					error: {
						path: "/harnessId",
						message: `Unknown harness: ${validated.harnessId}`,
					},
				},
			);
		}

		// 2. Check for unknown slot IDs
		const allowedSlotIds = new Set(Object.keys(harness.slots));
		for (const slotId of Object.keys(validated.slotValues)) {
			if (!allowedSlotIds.has(slotId)) {
				return createErrorResponse(
					"VALIDATION_ERROR",
					`Unknown slot ID: ${slotId}`,
					400,
					{
						error: {
							path: `/slotValues/${slotId}`,
							slotId,
							message: `Unknown slot ID: ${slotId}`,
						},
					},
				);
			}
		}

		// Apply defaults to slot values for consistency with build-time validation
		const finalSlotValues = getSubmissionWithDefaults(
			harness,
			validated.slotValues,
		);

		// 3. Validate each slot value against its type
		for (const [slotId, slotDef] of Object.entries(harness.slots)) {
			const value = finalSlotValues[slotId];

			// Check if required slot is missing (after defaults applied)
			if (value === undefined && slotDef.default === undefined) {
				// Check if this slot is used in any flow page (model slots are required)
				if (slotDef.type === "model") {
					return createErrorResponse(
						"VALIDATION_ERROR",
						`Missing required model slot: ${slotId}`,
						400,
						{
							error: {
								path: `/slotValues/${slotId}`,
								slotId,
								message: `Missing required model slot: ${slotId}`,
							},
						},
					);
				}
			}

			// Skip validation if value is undefined (no default exists)
			if (value === undefined) continue;

			// Validate type
			const typeError = validateSlotValue(slotId, value, slotDef);
			if (typeError) {
				return createErrorResponse("VALIDATION_ERROR", typeError.message, 400, {
					error: typeError,
				});
			}
		}

		// Generate files using finalSlotValues
		const generatedFiles = generateProfileFiles(
			validated.harnessId,
			finalSlotValues,
		);

		// Generate ID and save (with retry on collision)
		let componentId: string | undefined;
		let saved = false;
		for (let attempt = 0; attempt < 3; attempt++) {
			componentId = generateComponentId();
			saved = await saveProfile(kv, componentId, validated, generatedFiles);
			if (saved) break;
		}

		if (!saved || !componentId) {
			return createErrorResponse(
				"INTERNAL_ERROR",
				"Failed to generate unique profile ID",
				500,
			);
		}

		// Transform generated files to registry format
		const registryFiles = generatedFiles.map((f) => ({ ...f, target: f.path }));
		return createJsonResponse(
			{ componentId, files: registryFiles },
			{ status: 200 },
		);
	} catch (error) {
		if (error instanceof ZodError) {
			return createErrorResponse(
				"VALIDATION_ERROR",
				"Invalid request body",
				400,
				{ issues: error.issues },
			);
		}
		if (error instanceof SyntaxError) {
			return createErrorResponse(
				"INVALID_JSON",
				"Invalid JSON in request body",
				400,
			);
		}
		console.error("Profile creation failed:", error);
		return createErrorResponse(
			"INTERNAL_ERROR",
			"Failed to create profile",
			500,
		);
	}
}
