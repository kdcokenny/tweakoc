import { useRef } from "react";
import { useRouteLoaderData } from "react-router";
import { ProviderList } from "~/components/provider-list";
import {
	selectHasProviders,
	selectReturnToStep,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { getWizardSteps } from "~/lib/wizard-config";
import { toStepId } from "~/lib/wizard-step-id";
import type { loader as flowLayoutLoader } from "./layout";

export default function ProvidersStep() {
	const layoutData = useRouteLoaderData<typeof flowLayoutLoader>("flow-layout");
	const returnToStep = useWizardStore(selectReturnToStep);
	const harnessId = layoutData?.harnessId;
	const hasProviders = useWizardStore(selectHasProviders);

	const bannerRef = useRef<HTMLDivElement>(null);

	// Compute step ID and check if attempted
	const steps = harnessId ? getWizardSteps(harnessId) : [];
	const providersStep = steps.find((s) => s.id === "providers");
	const stepId = providersStep ? toStepId(providersStep) : null;

	// Always call hook, but selector will return false if stepId is null
	const attemptedByStepId = useWizardStore((state) => state.attemptedByStepId);
	const isAttempted = stepId ? !!attemptedByStepId[stepId] : false;

	const showErrorBanner = isAttempted && !hasProviders;

	return (
		<div className="flex flex-col gap-6 py-6">
			{/* Error banner */}
			{showErrorBanner && (
				<div
					data-error-banner
					ref={bannerRef}
					tabIndex={-1}
					aria-live="polite"
					className="mb-4 rounded-md bg-destructive/10 p-4 text-destructive text-sm"
				>
					Please select at least one provider to continue.
				</div>
			)}

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
