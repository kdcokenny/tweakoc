import { z } from "zod";

// Slot definition
export const HarnessSlotSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	description: z.string(),
});

export type HarnessSlot = z.infer<typeof HarnessSlotSchema>;

// Option definition
export const HarnessOptionSchema = z.object({
	id: z.string().min(1),
	type: z.enum(["boolean", "text", "select"]),
	label: z.string().min(1),
	description: z.string().optional(),
	default: z.unknown().optional(),
	options: z
		.array(
			z.object({
				value: z.string(),
				label: z.string(),
			}),
		)
		.optional(),
});

export type HarnessOption = z.infer<typeof HarnessOptionSchema>;

// Output definition
export const HarnessOutputSchema = z.object({
	path: z.string().min(1),
	label: z.string().min(1),
});

export type HarnessOutput = z.infer<typeof HarnessOutputSchema>;

// Template definition (JSON with $ref placeholders)
export const HarnessTemplateSchema = z.object({
	output: z.string(), // matches HarnessOutput.path
	template: z.record(z.string(), z.unknown()), // JSON object with $ref
});

export type HarnessTemplate = z.infer<typeof HarnessTemplateSchema>;

// Full harness config
export const HarnessConfigSchema = z
	.object({
		schemaVersion: z.literal(1),
		id: z.string().min(1),
		name: z.string().min(1),
		description: z.string(),

		slots: z.array(HarnessSlotSchema).min(1),
		options: z.array(HarnessOptionSchema).optional().default([]),
		outputs: z.array(HarnessOutputSchema).min(1),
		templates: z.array(HarnessTemplateSchema).min(1),
	})
	.refine(
		// Ensure slot IDs are unique
		(config) => {
			const ids = config.slots.map((s) => s.id);
			return new Set(ids).size === ids.length;
		},
		{ message: "Slot IDs must be unique" },
	)
	.refine(
		// Ensure output paths are unique
		(config) => {
			const paths = config.outputs.map((o) => o.path);
			return new Set(paths).size === paths.length;
		},
		{ message: "Output paths must be unique" },
	)
	.refine(
		// Ensure every template.output matches an output.path
		(config) => {
			const outputPaths = new Set(config.outputs.map((o) => o.path));
			return config.templates.every((t) => outputPaths.has(t.output));
		},
		{ message: "Template output must match a defined output path" },
	);

export type HarnessConfig = z.infer<typeof HarnessConfigSchema>;

/**
 * Parse and validate a harness config.
 * Throws with descriptive error if invalid.
 */
export function parseHarnessConfig(
	raw: unknown,
	sourceFile?: string,
): HarnessConfig {
	// Guard clause: ensure we have raw data (Early Exit)
	if (!raw) {
		const prefix = sourceFile ? `[${sourceFile}] ` : "";
		throw new Error(`${prefix}No harness config provided`);
	}

	try {
		// Parse at boundary (Parse Don't Validate)
		return HarnessConfigSchema.parse(raw);
	} catch (error) {
		// Fail fast with descriptive error (Fail Fast, Fail Loud)
		const prefix = sourceFile ? `[${sourceFile}] ` : "";
		if (error instanceof z.ZodError) {
			const issues = error.issues
				.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
				.join("\n");
			throw new Error(`${prefix}Invalid harness config:\n${issues}`);
		}
		throw new Error(`${prefix}Failed to parse harness config: ${error}`);
	}
}
