import { useEffect } from "react";
import { Outlet } from "react-router";
import { requireHarness } from "~/lib/guards";
import { useWizardStore } from "~/lib/store/wizard-store";
import type { Route } from "./+types/layout";

export async function loader({ params }: Route.LoaderArgs) {
	const harness = requireHarness(params.harnessId);
	// requireHarness throws redirect if harnessId is missing, so it's safe here
	const harnessId = params.harnessId as string;
	return { harnessId, harness };
}

// Export loader type for useRouteLoaderData in children
export type FlowLayoutLoader = typeof loader;

export default function FlowLayout({ loaderData }: Route.ComponentProps) {
	const { harnessId } = loaderData;
	const resetForHarness = useWizardStore((s) => s.resetForHarness);

	// Reset state when harness changes (e.g., navigating from /h/harness1 to /h/harness2)
	// This only synchronizes Zustand state with URL state - no navigation side effects
	useEffect(() => {
		resetForHarness(harnessId);
	}, [harnessId, resetForHarness]);

	return <Outlet />;
}
