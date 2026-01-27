import { ModelSlot } from "~/components/model-slot";
import { useWizardGuard } from "~/lib/hooks";

export default function PrimaryModelStep() {
	const { allowed } = useWizardGuard({ harness: true, providers: true });

	if (!allowed) return null;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Primary Model</h1>
				<p className="text-muted-foreground mt-1">
					Select the main model for your workflow. This will be used for complex
					tasks.
				</p>
			</div>

			<ModelSlot
				slot="primary"
				title="Primary Model"
				description="Your main model for complex tasks"
			/>
		</div>
	);
}
