/**
 * JSON Pointer $ref Resolver
 *
 * Resolves $ref placeholders in JSON templates using RFC 6901 JSON Pointer syntax.
 *
 * Example:
 *   Template: { "model": { "$ref": "#/slots/ultrabrain/model" } }
 *   Context: { slots: { ultrabrain: { model: "openai/gpt-5" } } }
 *   Result: { "model": "openai/gpt-5" }
 */

import type { HarnessConfig, SlotProperty } from "~/lib/harness-schema";
import { isConfigurableProperty, isFixedProperty } from "~/lib/harness-schema";

const MAX_DEPTH = 100;

/**
 * Context for resolving $ref pointers.
 */
export interface ResolverContext {
	slots: Record<string, Record<string, unknown>>; // slotId -> propertyName -> value
	options: Record<string, unknown>;
	mcp: Record<string, string>; // serverId -> url (for selected MCP servers)
}

/**
 * Check if a value is a $ref object.
 * A $ref object must have exactly one key: "$ref"
 * Fails fast if $ref has sibling keys (no merge behavior).
 */
function isRefObject(value: unknown): value is { $ref: string } {
	if (typeof value !== "object" || value === null) return false;
	if (!("$ref" in value)) return false;

	const keys = Object.keys(value);
	if (keys.length !== 1) {
		throw new Error(
			`Invalid $ref: found sibling keys ${JSON.stringify(keys.filter((k) => k !== "$ref"))}. ` +
				`$ref objects cannot have other properties.`,
		);
	}

	if (typeof (value as { $ref: unknown }).$ref !== "string") {
		throw new Error(`Invalid $ref: value must be a string`);
	}

	return true;
}

/**
 * Parse a JSON Pointer string into segments.
 * Handles RFC 6901 escaping: ~0 = ~, ~1 = /
 *
 * @param pointer - JSON Pointer string (e.g., "#/slots/ultrabrain/model")
 * @returns Array of path segments
 */
function parseJsonPointer(pointer: string): string[] {
	// Must start with #/
	if (!pointer.startsWith("#/")) {
		throw new Error(`Invalid JSON Pointer "${pointer}": must start with "#/"`);
	}

	// Remove #/ prefix and split
	const path = pointer.slice(2);
	if (path === "") return [];

	return path.split("/").map((segment) => {
		// RFC 6901 unescaping: ~1 -> /, ~0 -> ~
		// Order matters: ~1 first, then ~0
		return segment.replace(/~1/g, "/").replace(/~0/g, "~");
	});
}

/**
 * Resolve a JSON Pointer against a context object.
 *
 * @param pointer - JSON Pointer string
 * @param context - Context object to resolve against
 * @returns Resolved value
 */
function resolvePointer(pointer: string, context: ResolverContext): unknown {
	const segments = parseJsonPointer(pointer);

	let current: unknown = context;
	const visited: string[] = [];

	for (const segment of segments) {
		visited.push(segment);

		if (current === null || current === undefined) {
			throw new Error(
				`Failed to resolve "${pointer}": path "${visited.join("/")}" is ${current}`,
			);
		}

		if (typeof current !== "object") {
			throw new Error(
				`Failed to resolve "${pointer}": cannot access "${segment}" on ${typeof current}`,
			);
		}

		if (!(segment in current)) {
			throw new Error(
				`Failed to resolve "${pointer}": key "${segment}" not found at "/${visited.slice(0, -1).join("/")}"`,
			);
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return current;
}

/**
 * Recursively resolve all $ref objects in a template.
 *
 * @param template - Template object with $ref placeholders
 * @param context - Context for resolving pointers
 * @param depth - Current recursion depth (for cycle detection)
 * @param path - Current path in template (for error messages)
 * @returns Resolved template with all $ref replaced
 */
export function resolveRefs(
	template: unknown,
	context: ResolverContext,
	depth = 0,
	path = "",
): unknown {
	// Cycle/depth protection
	if (depth > MAX_DEPTH) {
		throw new Error(
			`Max depth (${MAX_DEPTH}) exceeded at "${path}". ` +
				`This may indicate a circular reference.`,
		);
	}

	// Null/undefined pass through
	if (template === null || template === undefined) {
		return template;
	}

	// Primitives pass through
	if (typeof template !== "object") {
		return template;
	}

	// Handle $ref objects
	if (isRefObject(template)) {
		return resolvePointer(template.$ref, context);
	}

	// Handle arrays
	if (Array.isArray(template)) {
		return template.map((item, index) =>
			resolveRefs(item, context, depth + 1, `${path}[${index}]`),
		);
	}

	// Handle objects
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(template)) {
		result[key] = resolveRefs(value, context, depth + 1, `${path}.${key}`);
	}

	return result;
}

/**
 * Resolve a single property value using precedence rules.
 * 1. Fixed value (if property has 'value' field)
 * 2. Store override (if provided)
 * 3. Default (if property has 'default' field)
 * 4. Error (missing required)
 */
function resolvePropertyValue(
	slotId: string,
	propertyName: string,
	property: SlotProperty,
	storeValue: unknown,
): unknown {
	// 1. Fixed value always wins
	if (isFixedProperty(property)) {
		return property.value;
	}

	// 2. Store override
	if (storeValue !== undefined) {
		return storeValue;
	}

	// 3. Default value (for configurable properties)
	if (
		isConfigurableProperty(property) &&
		"default" in property &&
		property.default !== undefined
	) {
		return property.default;
	}

	// 4. Missing required value
	// For model type, this is an error
	// For other types with no default, this is also an error
	if (property.type === "model") {
		throw new Error(`Missing required model for slot '${slotId}'`);
	}

	throw new Error(
		`Missing required value for slot '${slotId}' property '${propertyName}'`,
	);
}

/**
 * Build a resolver context from harness config and store state.
 * Applies precedence rules for all slot properties.
 */
export function buildResolverContext(
	harness: HarnessConfig,
	storeSlots: Record<string, Record<string, unknown>>,
	selectedMcpServers: string[],
): ResolverContext {
	const slots: Record<string, Record<string, unknown>> = {};

	// Resolve each slot's properties
	for (const [slotId, slotDef] of Object.entries(harness.slots)) {
		const slotStore = storeSlots[slotId] ?? {};
		const resolvedProps: Record<string, unknown> = {};

		for (const [propName, propDef] of Object.entries(slotDef.properties)) {
			resolvedProps[propName] = resolvePropertyValue(
				slotId,
				propName,
				propDef,
				slotStore[propName],
			);
		}

		slots[slotId] = resolvedProps;
	}

	// Build MCP server map (selected servers only)
	const mcp: Record<string, string> = {};
	for (const server of harness.mcpServers ?? []) {
		if (selectedMcpServers.includes(server.id)) {
			mcp[server.id] = server.url;
		}
	}

	return {
		slots,
		options: {}, // Can be extended later for generic options
		mcp,
	};
}
