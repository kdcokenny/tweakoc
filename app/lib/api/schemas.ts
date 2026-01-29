import { z } from "zod";
import { getHarness } from "~/lib/harness-registry";

// Credential pattern blocklist (defense-in-depth)
const CREDENTIAL_PATTERNS = [
	/^sk-[a-zA-Z0-9]+/, // OpenAI/Anthropic keys
	/^glpat-[a-zA-Z0-9]+/, // GitLab tokens
	/^AKIA[A-Z0-9]{16}/, // AWS access keys
	/^Bearer\s+\S+/, // Bearer tokens
	/^ghp_[a-zA-Z0-9]+/, // GitHub tokens
	/^gho_[a-zA-Z0-9]+/, // GitHub OAuth tokens
	/^github_pat_/, // GitHub PATs
];

function containsCredentialPattern(value: string): boolean {
	return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}

const safeString = (maxLength: number) =>
	z
		.string()
		.min(1)
		.max(maxLength)
		.refine((val) => !containsCredentialPattern(val), {
			message: "Value appears to contain a credential pattern",
		});

// Base profile request schema (without harness-specific validation)
export const createProfileRequestSchema = z
	.object({
		harnessId: z.string().min(1),
		providers: z.array(safeString(64)).min(1).max(20),
		slots: z.record(z.string(), z.record(z.string(), z.unknown())),
		selectedMcpServers: z.array(z.string()).optional().default([]),
		options: z.record(z.string(), z.unknown()).optional(),
	})
	.strict();

export type ValidatedCreateProfileRequest = z.infer<
	typeof createProfileRequestSchema
>;

/**
 * Validate a profile request against its harness configuration.
 * Ensures all required slots are present and valid.
 */
export function validateProfileRequest(
	request: ValidatedCreateProfileRequest,
): { valid: true } | { valid: false; error: string } {
	const harness = getHarness(request.harnessId);

	if (!harness) {
		return { valid: false, error: `Unknown harness: "${request.harnessId}"` };
	}

	// Validate all required slots are present
	const harnessSlotIds = Object.keys(harness.slots);
	for (const slotId of harnessSlotIds) {
		const slot = request.slots[slotId];
		if (!slot) {
			return {
				valid: false,
				error: `Missing required slot: "${slotId}"`,
			};
		}
	}

	// Validate no extra slots
	const validSlotIds = new Set(harnessSlotIds);
	for (const slotId of Object.keys(request.slots)) {
		if (!validSlotIds.has(slotId)) {
			return { valid: false, error: `Unknown slot: "${slotId}"` };
		}
	}

	return { valid: true };
}

/**
 * Parse and validate a create profile request.
 * Validates both schema and harness configuration.
 */
export function parseCreateProfileRequest(
	data: unknown,
): ValidatedCreateProfileRequest {
	// First, parse with Zod
	const parsed = createProfileRequestSchema.parse(data);

	// Then validate against harness config
	const validation = validateProfileRequest(parsed);
	if (!validation.valid) {
		throw new Error(validation.error);
	}

	return parsed;
}

// Cursor schema for pagination
export const cursorSchema = z.object({
	offset: z.number().int().min(0),
});

export function parseCursor(cursor: string | null): { offset: number } | null {
	if (!cursor) return null;
	try {
		const decoded = JSON.parse(atob(cursor));
		return cursorSchema.parse(decoded);
	} catch {
		return null;
	}
}

export function encodeCursor(offset: number): string {
	return btoa(JSON.stringify({ offset }));
}
