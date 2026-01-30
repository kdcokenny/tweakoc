import {
	Navigate,
	redirect,
	useLoaderData,
	useRouteLoaderData,
} from "react-router";
import { requireHarness } from "~/lib/guards";
import { ROUTES } from "~/lib/routes";
import type { Route } from "./+types/slot.$slotId";
import type { loader as flowLayoutLoader } from "./layout";

export async function loader({ params }: Route.LoaderArgs) {
	const harness = requireHarness(params.harnessId);
	const { slotId } = params;

	// Validate slotId exists in harness
	if (!slotId || !harness.slots[slotId]) {
		// Invalid slot, redirect to providers
		return redirect(ROUTES.flow.providers(harness.id));
	}

	return { slotId };
}

export default function SlotRedirect() {
	const loaderData = useLoaderData<typeof loader>();
	const layoutData = useRouteLoaderData<typeof flowLayoutLoader>("flow-layout");
	const { slotId } = loaderData;
	const harness = layoutData?.harness;

	if (!harness) {
		return <Navigate to="/flow" replace />;
	}

	// Find which page/section contains this slot
	for (const page of harness.flow) {
		for (const section of page.sections) {
			if (
				section.slots.includes(slotId) ||
				section.advanced?.includes(slotId)
			) {
				return <Navigate to={`/flow/page/${page.id}#${section.id}`} replace />;
			}
		}
	}

	// Fallback: go to first page
	const firstPageId = harness.flow[0]?.id ?? "orchestration";
	return <Navigate to={`/flow/page/${firstPageId}`} replace />;
}
