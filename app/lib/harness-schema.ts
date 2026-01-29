import { z } from "zod";
import {
	buildResolverContext,
	getSubmissionWithDefaults,
	resolveRefs,
} from "./api/ref-resolver.js";

// ============================================================================
// Slot Schemas (Discriminated Union)
// ============================================================================

const SlotTypeSchema = z.enum(["model", "number", "enum", "boolean", "text"]);

const BaseSlotSchema = z.object({
	type: SlotTypeSchema,
	label: z.string(),
	description: z.string().optional(),
});

const ModelSlotSchema = BaseSlotSchema.extend({
	type: z.literal("model"),
	default: z.string().optional(),
});

const NumberSlotSchema = BaseSlotSchema.extend({
	type: z.literal("number"),
	default: z.number().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
})
	.refine(
		(data) => {
			if (data.min !== undefined && data.max !== undefined) {
				return data.min <= data.max;
			}
			return true;
		},
		{ message: "min must be <= max" },
	)
	.refine(
		(data) => {
			if (data.default !== undefined) {
				if (data.min !== undefined && data.default < data.min) return false;
				if (data.max !== undefined && data.default > data.max) return false;
			}
			return true;
		},
		{ message: "default must be within min/max range" },
	);

const EnumSlotSchema = BaseSlotSchema.extend({
	type: z.literal("enum"),
	default: z.string().optional(),
	options: z.array(z.string()),
}).refine(
	(data) => {
		if (data.default !== undefined) {
			return data.options.includes(data.default);
		}
		return true;
	},
	{ message: "default must be in options" },
);

const BooleanSlotSchema = BaseSlotSchema.extend({
	type: z.literal("boolean"),
	default: z.boolean().optional(),
});

const TextSlotSchema = BaseSlotSchema.extend({
	type: z.literal("text"),
	default: z.string().optional(),
});

export const SlotSchema = z.discriminatedUnion("type", [
	ModelSlotSchema,
	NumberSlotSchema,
	EnumSlotSchema,
	BooleanSlotSchema,
	TextSlotSchema,
]);

export type SlotDefinition = z.infer<typeof SlotSchema>;

// ============================================================================
// Flow Page Schema
// ============================================================================

const SectionSchema = z.object({
	id: z.string(),
	label: z.string(),
	slots: z.array(z.string()),
	advanced: z.array(z.string()).optional(),
});

export const FlowPageSchema = z.object({
	id: z.string(),
	label: z.string(),
	sections: z.array(SectionSchema),
});

export type Section = z.infer<typeof SectionSchema>;
export type FlowPage = z.infer<typeof FlowPageSchema>;

// ============================================================================
// Output Definition
// ============================================================================

export const HarnessOutputSchema = z.object({
	path: z.string().min(1),
	label: z.string().min(1),
});

export type HarnessOutput = z.infer<typeof HarnessOutputSchema>;

// ============================================================================
// Template Definition (JSON with $ref placeholders)
// ============================================================================

export const HarnessTemplateSchema = z.object({
	output: z.string(), // matches HarnessOutput.path
	template: z.record(z.string(), z.unknown()), // JSON object with $ref
});

export type HarnessTemplate = z.infer<typeof HarnessTemplateSchema>;

// ============================================================================
// Full Harness Config
// ============================================================================

export const HarnessConfigSchema = z
	.object({
		schemaVersion: z.number().optional(),
		id: z.string().min(1),
		name: z.string().min(1),
		description: z.string(),

		slots: z.record(z.string(), SlotSchema),
		flow: z.array(FlowPageSchema).min(1),

		outputs: z.array(HarnessOutputSchema).min(1),
		templates: z.array(HarnessTemplateSchema).min(1),
	})
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

// ============================================================================
// Validation
// ============================================================================

export class HarnessValidationError extends Error {
	constructor(
		public path: string,
		message: string,
		public slotId?: string,
		public pageId?: string,
	) {
		super(message);
	}
}

export function validateHarness(harness: HarnessConfig): void {
	const definedSlotIds = new Set(Object.keys(harness.slots));
	const usedSlotIds = new Set<string>();
	const pageIds = new Set<string>();

	// Check for duplicate page IDs and validate slot references in flow
	for (const page of harness.flow) {
		if (pageIds.has(page.id)) {
			throw new HarnessValidationError(
				`/flow`,
				`Duplicate page ID: ${page.id}`,
				undefined,
				page.id,
			);
		}
		pageIds.add(page.id);

		for (const section of page.sections) {
			// Validate main slots
			for (const slotId of section.slots) {
				if (!definedSlotIds.has(slotId)) {
					throw new HarnessValidationError(
						`/flow/${page.id}/sections/${section.id}/slots`,
						`Unknown slot ID: ${slotId}`,
						slotId,
						page.id,
					);
				}
				usedSlotIds.add(slotId);
			}

			// Validate advanced slots
			if (section.advanced) {
				for (const slotId of section.advanced) {
					if (!definedSlotIds.has(slotId)) {
						throw new HarnessValidationError(
							`/flow/${page.id}/sections/${section.id}/advanced`,
							`Unknown slot ID: ${slotId}`,
							slotId,
							page.id,
						);
					}
					usedSlotIds.add(slotId);
				}
			}
		}
	}

	// Check for unused slots (must also check templates - do this after ref-resolver is updated)
	// For now, just validate flow references

	// Dry run: simulate "untouched submit" with all defaults
	// This ensures a user can submit without touching Advanced section
	try {
		const mockValues = getSubmissionWithDefaults(harness, {});
		const context = buildResolverContext(harness, mockValues);

		for (let i = 0; i < harness.templates.length; i++) {
			const template = harness.templates[i];
			// Clone to avoid mutation
			const templateClone = structuredClone(template.template);
			try {
				resolveRefs(templateClone, context);
			} catch (error) {
				throw new HarnessValidationError(
					`/templates/${i}`,
					`Template "${template.output}" fails with default values: ${String(error instanceof Error ? error.message : error)}. ` +
						`Ensure all slots referenced in templates have defaults or are visible to users.`,
					undefined,
					undefined,
				);
			}
		}
	} catch (error) {
		if (error instanceof HarnessValidationError) {
			throw error;
		}
		throw new HarnessValidationError(
			"/templates",
			`Dry run validation failed: ${String(error instanceof Error ? error.message : error)}`,
			undefined,
			undefined,
		);
	}
}

// ============================================================================
// Parser Function
// ============================================================================

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
