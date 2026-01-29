import { z } from "zod";

// ============================================================================
// Slot Property Schemas (Discriminated Union)
// ============================================================================

// Fixed variants (harness dev sets value, user never sees)
const FixedNumberSchema = z.object({
	type: z.literal("number"),
	value: z.number(),
});

const FixedTextSchema = z.object({
	type: z.literal("text"),
	value: z.string(),
});

const FixedEnumSchema = z
	.object({
		type: z.literal("enum"),
		value: z.string(),
		options: z.array(z.string()).min(1),
	})
	.refine((data) => data.options.includes(data.value), {
		message: "Fixed enum value must be in options",
	});

const FixedBooleanSchema = z.object({
	type: z.literal("boolean"),
	value: z.boolean(),
});

// Configurable variants (user can change)
const ConfigurableModelSchema = z.object({
	type: z.literal("model"),
	configurable: z.literal(true),
});

const ConfigurableNumberSchema = z
	.object({
		type: z.literal("number"),
		configurable: z.literal(true),
		default: z.number().optional(),
		min: z.number().optional(),
		max: z.number().optional(),
		step: z.number().positive().optional(),
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

const ConfigurableTextSchema = z.object({
	type: z.literal("text"),
	configurable: z.literal(true),
	default: z.string().optional(),
});

const ConfigurableEnumSchema = z
	.object({
		type: z.literal("enum"),
		configurable: z.literal(true),
		options: z.array(z.string()).min(1),
		default: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.default !== undefined) {
				return data.options.includes(data.default);
			}
			return true;
		},
		{ message: "default must be in options" },
	);

const ConfigurableBooleanSchema = z.object({
	type: z.literal("boolean"),
	configurable: z.literal(true),
	default: z.boolean().optional(),
});

// Union all property types
export const SlotPropertySchema = z.union([
	FixedNumberSchema,
	FixedTextSchema,
	FixedEnumSchema,
	FixedBooleanSchema,
	ConfigurableModelSchema,
	ConfigurableNumberSchema,
	ConfigurableTextSchema,
	ConfigurableEnumSchema,
	ConfigurableBooleanSchema,
]);

export type SlotProperty = z.infer<typeof SlotPropertySchema>;

// ============================================================================
// Advanced Group Schema
// ============================================================================

export const AdvancedGroupSchema = z
	.object({
		label: z.string().min(1).default("Advanced"),
		collapsible: z.boolean().default(true),
		collapsed: z.boolean().default(true),
		properties: z.array(z.string().min(1)).min(1),
	})
	.superRefine((group, ctx) => {
		if (group.collapsed && !group.collapsible) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"advancedGroup.collapsed requires advancedGroup.collapsible = true",
			});
		}
	});

export type AdvancedGroup = z.infer<typeof AdvancedGroupSchema>;

// ============================================================================
// Slot Definition
// ============================================================================

export const HarnessSlotSchema = z
	.object({
		label: z.string().min(1),
		description: z.string(),
		properties: z.record(z.string(), SlotPropertySchema),
		advancedGroup: AdvancedGroupSchema.optional(),
	})
	.superRefine((slot, ctx) => {
		const group = slot.advancedGroup;
		if (!group) return;

		const propKeys = new Set(Object.keys(slot.properties));
		const seen = new Set<string>();

		for (const name of group.properties) {
			// Check for duplicates
			if (seen.has(name)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `advancedGroup property duplicated: ${name}`,
				});
				continue;
			}
			seen.add(name);

			// Check property exists
			if (!propKeys.has(name)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `advancedGroup references unknown property: ${name}`,
				});
			}

			// Prevent model in advancedGroup
			if (name === "model") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "advancedGroup cannot include 'model'",
				});
			}
		}
	});

export type HarnessSlot = z.infer<typeof HarnessSlotSchema>;

// ============================================================================
// MCP Server Schema
// ============================================================================

export const McpServerSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	url: z.string().url(),
});

export type McpServer = z.infer<typeof McpServerSchema>;

// ============================================================================
// Flow Component and Page Schemas
// ============================================================================

export const FlowComponentSchema = z.union([
	z.object({
		type: z.literal("slot"),
		id: z.string().min(1),
	}),
	z.object({
		type: z.literal("mcp"),
	}),
]);

export type FlowComponent = z.infer<typeof FlowComponentSchema>;

export const FlowPageSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	components: z.array(FlowComponentSchema).min(1),
});

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
		schemaVersion: z.literal(1),
		id: z.string().min(1),
		name: z.string().min(1),
		description: z.string(),

		slots: z.record(z.string(), HarnessSlotSchema),
		mcpServers: z.array(McpServerSchema).optional().default([]),
		flow: z.array(FlowPageSchema).min(1),

		outputs: z.array(HarnessOutputSchema).min(1),
		templates: z.array(HarnessTemplateSchema).min(1),
	})
	.refine(
		// Ensure slot IDs referenced in flow exist
		(config) => {
			const slotIds = new Set(Object.keys(config.slots));
			return config.flow.every((page) =>
				page.components.every(
					(comp) => comp.type !== "slot" || slotIds.has(comp.id),
				),
			);
		},
		{ message: "Flow references non-existent slot ID" },
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

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Check if a property is configurable (user can change).
 */
export function isConfigurableProperty(
	prop: SlotProperty,
): prop is Extract<SlotProperty, { configurable: true }> {
	return "configurable" in prop && prop.configurable === true;
}

/**
 * Check if a property is fixed (harness dev sets value).
 */
export function isFixedProperty(
	prop: SlotProperty,
): prop is Extract<SlotProperty, { value: unknown }> {
	return "value" in prop;
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
