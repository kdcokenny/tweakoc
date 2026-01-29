import { ZodError } from "zod";
import { getCatalog, providerExists } from "~/lib/api/catalog-service";
import { generateProfileFiles } from "~/lib/api/file-generator";
import { generateComponentId } from "~/lib/api/id-generator";
import { checkRateLimit, saveProfile } from "~/lib/api/profile-store";
import { fetchRegistryFilesWithTimeout } from "~/lib/api/registry-client";
import { parseCreateProfileRequest } from "~/lib/api/schemas";
import { createErrorResponse, createJsonResponse } from "~/lib/api/types";
import type { Route } from "./+types/api.profiles";

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB

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

		// Semantic validation: check all providers exist in catalog
		const catalog = await getCatalog(kv);
		const invalidProviders = validated.providers.filter(
			(p) => !providerExists(catalog, p),
		);
		if (invalidProviders.length > 0) {
			return createErrorResponse(
				"INVALID_PROVIDER",
				`Unknown provider(s): ${invalidProviders.join(", ")}`,
				400,
				{ invalidProviders },
			);
		}

		// Generate files
		const generatedFiles = generateProfileFiles(
			validated.harnessId,
			validated.slots,
			validated.selectedMcpServers ?? [],
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

		// Fetch from registry (single source of truth)
		const registryUrl = context.cloudflare.env.REGISTRY_URL;
		try {
			const registryFiles = await fetchRegistryFilesWithTimeout(
				registryUrl,
				componentId,
			);
			return createJsonResponse(
				{ componentId, files: registryFiles },
				{ status: 200 },
			);
		} catch (error) {
			console.error("Registry fetch failed:", error);
			return createErrorResponse(
				"REGISTRY_FETCH_ERROR",
				error instanceof Error
					? error.message
					: "Failed to fetch files from registry",
				500,
				{ componentId },
			);
		}
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
