import { getHarness } from "~/lib/harness-registry";
import { buildResolverContext, resolveRefs } from "./ref-resolver";
import type { GeneratedFile } from "./types";

/**
 * Normalize and validate an output path.
 * - Prevents path traversal (../)
 * - Prevents absolute paths
 * - Ensures POSIX-style paths
 */
function normalizeOutputPath(path: string): string {
	// Guard: reject empty paths
	if (!path || path.trim() === "") {
		throw new Error("Output path cannot be empty");
	}

	// Guard: reject absolute paths
	if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
		throw new Error(`Absolute paths not allowed: "${path}"`);
	}

	// Normalize to POSIX-style (forward slashes)
	const normalized = path.replace(/\\/g, "/");

	// Split and filter empty segments
	const segments = normalized.split("/").filter(Boolean);

	// Guard: reject path traversal
	const result: string[] = [];
	for (const segment of segments) {
		if (segment === "..") {
			throw new Error(`Path traversal not allowed: "${path}"`);
		}
		if (segment !== ".") {
			result.push(segment);
		}
	}

	if (result.length === 0) {
		throw new Error(`Invalid output path: "${path}"`);
	}

	return result.join("/");
}

/**
 * Generate profile files from harness templates.
 *
 * @param harnessId - The harness ID
 * @param slots - Slot selections { slotId: { providerId, modelId } }
 * @param options - Option values
 * @returns Array of generated files
 */
export function generateProfileFiles(
	harnessId: string,
	slots: Record<string, { providerId: string; modelId: string }>,
	options: Record<string, unknown> = {},
): GeneratedFile[] {
	// Guard: harness must exist
	const harness = getHarness(harnessId);
	if (!harness) {
		throw new Error(`Unknown harness: "${harnessId}"`);
	}

	// Guard: all required slots must be provided
	for (const slotConfig of harness.slots) {
		const slot = slots[slotConfig.id];
		if (!slot?.providerId || !slot?.modelId) {
			throw new Error(`Missing slot: "${slotConfig.id}"`);
		}
	}

	// Build resolver context
	const context = buildResolverContext(slots, options);

	// Track output paths for duplicate detection
	const seenPaths = new Set<string>();

	// Generate files from templates
	const files: GeneratedFile[] = [];

	for (const templateConfig of harness.templates) {
		// Normalize and validate output path
		const normalizedPath = normalizeOutputPath(templateConfig.output);

		// Check for duplicates (case-sensitive)
		if (seenPaths.has(normalizedPath)) {
			throw new Error(`Duplicate output path: "${normalizedPath}"`);
		}
		seenPaths.add(normalizedPath);

		// Resolve $ref placeholders in template
		const resolved = resolveRefs(templateConfig.template, context);

		// Serialize to JSON with consistent formatting
		const content = JSON.stringify(resolved, null, 2);

		files.push({
			path: normalizedPath,
			content,
		});
	}

	return files;
}
