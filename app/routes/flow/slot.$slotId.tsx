import { Navigate, useParams } from "react-router";
import { getHarness } from "~/lib/harness-registry";
import { useWizardStore } from "~/lib/store/wizard-store";

export default function SlotRedirect() {
	const { slotId } = useParams<{ slotId: string }>();
	const harnessId = useWizardStore((state) => state.harnessId);
	const harness = harnessId ? getHarness(harnessId) : null;

	if (!harness || !slotId) {
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
