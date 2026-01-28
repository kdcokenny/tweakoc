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

const MAX_DEPTH = 100;

/**
 * Context for resolving $ref pointers.
 */
export interface ResolverContext {
	slots: Record<
		string,
		{
			providerId: string;
			modelId: string;
			model: string; // "providerId/modelId" combined
		}
	>;
	options: Record<string, unknown>;
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
 * Build a resolver context from slot and option data.
 */
export function buildResolverContext(
	slots: Record<string, { providerId: string; modelId: string }>,
	options: Record<string, unknown>,
): ResolverContext {
	return {
		slots: Object.fromEntries(
			Object.entries(slots).map(([id, slot]) => [
				id,
				{
					...slot,
					model: `${slot.providerId}/${slot.modelId}`,
				},
			]),
		),
		options,
	};
}
