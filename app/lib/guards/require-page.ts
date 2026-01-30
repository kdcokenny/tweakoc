/**
 * Guard helper that validates pageId exists in harness flow.
 * Throws redirect to providers if invalid.
 *
 * Usage in loaders:
 *   const page = requirePage(harness, params.pageId, harnessId);
 */
import { href, redirect } from "react-router";
import type { HarnessConfig } from "~/lib/harness-schema";

// Get the FlowPage type from the harness schema
type FlowPage = HarnessConfig["flow"][number];

export function requirePage(
	harness: HarnessConfig,
	pageId: string | undefined,
	harnessId: string,
): FlowPage {
	if (!pageId) {
		throw redirect(href("/flow/:harnessId/providers", { harnessId }));
	}

	const page = harness.flow.find((p) => p.id === pageId);
	if (!page) {
		throw redirect(href("/flow/:harnessId/providers", { harnessId }));
	}

	return page;
}
