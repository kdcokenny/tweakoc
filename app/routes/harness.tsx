import { href, redirect } from "react-router";
import { requireHarness } from "~/lib/guards";
import type { Route } from "./+types/harness";

/**
 * Legacy deep link handler: /h/:harnessId
 * Validates harnessId and redirects to the canonical flow route.
 * Component never renders - loader always redirects.
 */
export async function loader({ params }: Route.LoaderArgs) {
	const harness = requireHarness(params.harnessId);
	// Redirect to canonical flow route
	return redirect(
		href("/flow/:harnessId/providers", { harnessId: harness.id }),
	);
}

export default function HarnessRedirect() {
	// Never renders - loader always redirects
	return null;
}
