import { ProviderList } from "~/components/provider-list";
import { useWizardGuard } from "~/lib/hooks";
import { selectReturnToStep, useWizardStore } from "~/lib/store/wizard-store";

export default function ProvidersStep() {
	const { allowed } = useWizardGuard({ harness: true });
	const returnToStep = useWizardStore(selectReturnToStep);

	if (!allowed) return null;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Select Providers
				</h1>
				<p className="text-muted-foreground mt-1">
					Choose the AI providers you have access to.
				</p>
				{returnToStep && (
					<p className="text-sm text-muted-foreground mt-2 italic">
						Make your changes, then click Next to return to model selection.
					</p>
				)}
			</div>

			<ProviderList />
		</div>
	);
}
