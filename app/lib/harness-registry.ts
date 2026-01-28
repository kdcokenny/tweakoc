import kdcoWorkspaceRaw from "~/config/harnesses/kdco-workspace.json";

// Import harness configs
import omoRaw from "~/config/harnesses/omo.json";
import { type HarnessConfig, parseHarnessConfig } from "./harness-schema";

/**
 * List of all harness IDs in the registry.
 * Used for validation and iteration.
 */
export const HARNESS_IDS = ["omo", "kdco-workspace"] as const;

// Parse and validate at load time (fail fast)
const omo = parseHarnessConfig(omoRaw, "omo.json");
const kdcoWorkspace = parseHarnessConfig(
	kdcoWorkspaceRaw,
	"kdco-workspace.json",
);

/**
 * Registry of all available harnesses.
 * To add a new harness:
 * 1. Create config/harnesses/your-harness.json
 * 2. Import and parse it here
 * 3. Add to HARNESSES object
 */
export const HARNESSES: Record<string, HarnessConfig> = {
	omo,
	"kdco-workspace": kdcoWorkspace,
};

/**
 * Get a harness by ID.
 * Returns undefined if not found.
 */
export function getHarness(id: string): HarnessConfig | undefined {
	return HARNESSES[id];
}

/**
 * Get all available harnesses.
 */
export function getAllHarnesses(): HarnessConfig[] {
	return Object.values(HARNESSES);
}

/**
 * Get all harness IDs.
 */
export function getHarnessIds(): string[] {
	return Object.keys(HARNESSES);
}
