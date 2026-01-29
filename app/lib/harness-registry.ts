import kdcoWorkspaceRaw from "~/config/harnesses/kdco-workspace.json";
import omoRaw from "~/config/harnesses/oh-my-opencode.json";
import opencodeNativeRaw from "~/config/harnesses/opencode-native.json";
import { type HarnessConfig, parseHarnessConfig } from "./harness-schema";

/**
 * List of all harness IDs in the registry.
 * Used for validation and iteration.
 */
export const HARNESS_IDS = [
	"kdco-workspace",
	"opencode-native",
	"omo",
] as const;

// Parse at load time; full validation via `bun run harness:validate`
const kdcoWorkspace = parseHarnessConfig(
	kdcoWorkspaceRaw,
	"kdco-workspace.json",
);
const opencodeNative = parseHarnessConfig(
	opencodeNativeRaw,
	"opencode-native.json",
);
const omo = parseHarnessConfig(omoRaw, "oh-my-opencode.json");

/**
 * Registry of all available harnesses.
 * To add a new harness:
 * 1. Create config/harnesses/your-harness.json
 * 2. Import and parse it here
 * 3. Add to HARNESSES object
 */
export const HARNESSES: Record<string, HarnessConfig> = {
	"kdco-ws": kdcoWorkspace,
	native: opencodeNative,
	omo: omo,
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
