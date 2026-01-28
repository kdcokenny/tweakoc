import { z } from "zod";

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

const modelSlotSchema = z
	.object({
		providerId: safeString(64),
		modelId: safeString(128),
	})
	.strict();

export const createProfileSchema = z
	.object({
		harnessId: z.enum(["kdco-workspace", "omo"]),
		providers: z.array(safeString(64)).min(1).max(20),
		primary: modelSlotSchema,
		secondary: modelSlotSchema,
		options: z
			.object({
				context7: z.boolean().optional(),
				renameWindow: z.boolean().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

export type ValidatedCreateProfileRequest = z.infer<typeof createProfileSchema>;

export function parseCreateProfileRequest(
	data: unknown,
): ValidatedCreateProfileRequest {
	return createProfileSchema.parse(data);
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
