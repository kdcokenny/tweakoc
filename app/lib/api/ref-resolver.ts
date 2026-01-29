/**
 * JSON Pointer $ref Resolver
 *
 * Resolves $ref placeholders in JSON templates using RFC 6901 JSON Pointer syntax.
 *
 * Example:
 *   Template: { "model": { "$ref": "#/slots/orchestrator" } }
 *   Context: { slots: { orchestrator: "openai/gpt-5" } }
 *   Result: { "model": "openai/gpt-5" }
 */

import type { HarnessConfig } from "~/lib/harness-schema";

const MAX_DEPTH = 100;

/**
 * Context for resolving $ref pointers.
 */
export interface ResolverContext {
	slots: Record<string, unknown>; // slotId → value (flat)
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
 * Parse a JSON Pointer string and validate format.
 * Only accepts #/slots/<slotId> format.
 *
 * @param pointer - JSON Pointer string (e.g., "#/slots/orchestrator")
 * @returns slotId
 */
function parseJsonPointer(pointer: string): string {
	// Must start with #/slots/
	if (!pointer.startsWith("#/slots/")) {
		throw new Error(
			`Invalid JSON Pointer "${pointer}": must start with "#/slots/"`,
		);
	}

	// Extract slot ID
	const slotId = pointer.slice(8); // Remove "#/slots/" prefix

	// Must not be empty
	if (slotId === "") {
		throw new Error(`Invalid JSON Pointer "${pointer}": slot ID is empty`);
	}

	// Must not contain additional path segments
	if (slotId.includes("/")) {
		throw new Error(
			`Invalid JSON Pointer "${pointer}": nested paths are not supported. Use flat slot IDs only (e.g., "#/slots/orchestrator")`,
		);
	}

	return slotId;
}

/**
 * Resolve a JSON Pointer against a context object.
 *
 * @param pointer - JSON Pointer string
 * @param context - Context object to resolve against
 * @returns Resolved value
 */
function resolvePointer(pointer: string, context: ResolverContext): unknown {
	const slotId = parseJsonPointer(pointer);

	if (!(slotId in context.slots)) {
		throw new Error(
			`Failed to resolve "${pointer}": slot "${slotId}" not found in context`,
		);
	}

	return context.slots[slotId];
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
 * Applies slot defaults to user-provided values.
 * Used at runtime (API) and build-time (validation) for consistency.
 */
export function getSubmissionWithDefaults(
	harness: HarnessConfig,
	userValues: Record<string, unknown> = {},
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [slotId, slotDef] of Object.entries(harness.slots)) {
		// User value takes precedence, then default
		result[slotId] = userValues[slotId] ?? slotDef.default;
	}

	return result;
}

/**
 * Build a resolver context from harness config and slot values.
 * Applies defaults for missing values.
 */
export function buildResolverContext(
	harness: HarnessConfig,
	slotValues: Record<string, unknown>,
): ResolverContext {
	const slots = getSubmissionWithDefaults(harness, slotValues);
	return { slots };
}
