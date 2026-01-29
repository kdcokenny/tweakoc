import { z } from "zod";
import { getHarness } from "~/lib/harness-registry";

// Base profile request schema (without harness-specific validation)
export const createProfileRequestSchema = z
	.object({
		harnessId: z.string().min(1),
		slotValues: z.record(z.string(), z.unknown()),
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
		const slotValue = request.slotValues[slotId];
		const slotDef = harness.slots[slotId];

		// Check if value is missing and no default is available
		if (slotValue === undefined && slotDef?.default === undefined) {
			return {
				valid: false,
				error: `Missing required slot: "${slotId}"`,
			};
		}
	}

	// Validate no extra slots
	const validSlotIds = new Set(harnessSlotIds);
	for (const slotId of Object.keys(request.slotValues)) {
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
