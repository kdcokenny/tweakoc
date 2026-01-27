import { ModelSlot } from "~/components/model-slot";
import { useWizardGuard } from "~/lib/hooks";

export default function SecondaryModelStep() {
	const { allowed } = useWizardGuard({
		harness: true,
		providers: true,
		primaryComplete: true,
	});

	if (!allowed) return null;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Secondary Model
				</h1>
				<p className="text-muted-foreground mt-1">
					Select a fast model for quick tasks. This will be used for simpler
					operations.
				</p>
			</div>

			<ModelSlot
				slot="secondary"
				title="Secondary Model"
				description="A faster model for quick tasks"
			/>
		</div>
	);
}
