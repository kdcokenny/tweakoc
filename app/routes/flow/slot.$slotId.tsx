import { Navigate, useParams } from "react-router";
import { ModelSlot } from "~/components/model-slot";
import { getHarness } from "~/lib/harness-registry";
import { useWizardGuard } from "~/lib/hooks";
import { useWizardStore } from "~/lib/store/wizard-store";

export default function SlotStep() {
	const { slotId } = useParams<{ slotId: string }>();
	const harnessId = useWizardStore((s) => s.harnessId);

	// Guard: must have harness and providers selected
	useWizardGuard({ harness: true, providers: true });

	// Get harness config
	const harness = harnessId ? getHarness(harnessId) : undefined;

	// Find the slot config
	const slotConfig = harness?.slots.find((s) => s.id === slotId);

	// If slot not found, redirect to first slot or home
	if (!slotId || !harness || !slotConfig) {
		const firstSlotId = harness?.slots[0]?.id;
		if (firstSlotId) {
			return <Navigate to={`/flow/slot/${firstSlotId}`} replace />;
		}
		return <Navigate to="/" replace />;
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold">{slotConfig.label}</h1>
				<p className="text-muted-foreground mt-1">{slotConfig.description}</p>
			</div>

			<ModelSlot slotId={slotId} />
		</div>
	);
}
