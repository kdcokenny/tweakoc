import { z } from "zod";
import type { GeneratedFile } from "./types";

// Timeout for registry fetches (5 seconds)
export const REGISTRY_FETCH_TIMEOUT = 5000;

// Zod schema for npm-style packument (Parse, Don't Validate)
const PackumentFileSchema = z.object({
	path: z.string(),
	target: z.string(),
	content: z.string(),
});

const PackumentSchema = z.object({
	"dist-tags": z.object({ latest: z.string() }),
	versions: z.record(
		z.string(),
		z.object({
			files: z.array(PackumentFileSchema),
		}),
	),
});

/**
 * Fetch files from the registry for a given component.
 * Uses the same endpoint OCX uses when installing profiles.
 *
 * @param registryUrl - Origin URL (e.g., "https://tweak.kdco.dev")
 * @param componentId - Component ID (e.g., "p-abc123")
 * @param signal - Optional AbortSignal for timeout
 * @returns Array of generated files
 */
export async function fetchRegistryFiles(
	registryUrl: string,
	componentId: string,
	signal?: AbortSignal,
): Promise<GeneratedFile[]> {
	// Guard clauses (Early Exit)
	if (!registryUrl) {
		throw new Error("REGISTRY_URL is not configured");
	}
	if (!componentId) {
		throw new Error("componentId is required");
	}

	// Safe URL construction (origin-only contract)
	const url = new URL(
		`/r/components/${encodeURIComponent(componentId)}.json`,
		registryUrl,
	);

	const response = await fetch(url.toString(), { signal });

	// Fail fast, fail loud
	if (!response.ok) {
		throw new Error(
			`Registry fetch failed for ${componentId}: ${response.status} ${response.statusText}`,
		);
	}

	// Parse at boundary (Parse, Don't Validate)
	const json = await response.json();
	const packument = PackumentSchema.parse(json);
	const latest = packument["dist-tags"].latest;

	// Explicit check: latest version must exist
	const version = packument.versions[latest];
	if (!version) {
		throw new Error(
			`Version "${latest}" not found in packument for ${componentId}`,
		);
	}

	return version.files;
}

/**
 * Fetch registry files with timeout.
 * Wraps fetchRegistryFiles with an AbortController.
 */
export async function fetchRegistryFilesWithTimeout(
	registryUrl: string,
	componentId: string,
	timeout = REGISTRY_FETCH_TIMEOUT,
): Promise<GeneratedFile[]> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		return await fetchRegistryFiles(
			registryUrl,
			componentId,
			controller.signal,
		);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(
				`Registry fetch timed out for ${componentId} after ${timeout}ms`,
			);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}
