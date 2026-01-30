/**
 * Guard helper that validates harnessId and returns the harness config.
 * Throws redirect("/") if invalid or missing.
 *
 * Usage in loaders:
 *   const harness = requireHarness(params.harnessId);
 */
import { redirect } from "react-router";
import { getHarness } from "~/lib/harness-registry";
import type { HarnessConfig } from "~/lib/harness-schema";

export function requireHarness(harnessId: string | undefined): HarnessConfig {
	if (!harnessId) {
		throw redirect("/");
	}

	const harness = getHarness(harnessId);
	if (!harness) {
		throw redirect("/");
	}

	return harness;
}
