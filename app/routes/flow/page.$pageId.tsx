import { useRef } from "react";
import { useParams } from "react-router";
import { SlotControl } from "~/components/slot-control";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FieldGroup } from "~/components/ui/field";
import { getHarness } from "~/lib/harness-registry";
import { useWizardGuard } from "~/lib/hooks/use-wizard-guard";
import {
	selectAllSlotValues,
	selectHarnessId,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { getWizardSteps } from "~/lib/wizard-config";
import { toStepId } from "~/lib/wizard-step-id";
import {
	validateStep,
	type WizardValidationContext,
} from "~/lib/wizard-validation";

export default function FlowPage() {
	useWizardGuard({ harness: true, providers: true });
	const { pageId } = useParams<{ pageId: string }>();

	const harnessId = useWizardStore(selectHarnessId);
	const providers = useWizardStore(selectProviders);
	const slotValues = useWizardStore(selectAllSlotValues);
	const harness = harnessId ? getHarness(harnessId) : null;

	const bannerRef = useRef<HTMLDivElement>(null);

	// Compute step ID and check if attempted (before guards to satisfy hooks rules)
	const steps = harnessId ? getWizardSteps(harnessId) : [];
	const currentStep = steps.find((s) => s.id === `page-${pageId}`);
	const stepId = currentStep ? toStepId(currentStep) : null;

	// Always call hook, but selector will return false if stepId is null
	const attemptedByStepId = useWizardStore((state) => state.attemptedByStepId);
	const isAttempted = stepId ? !!attemptedByStepId[stepId] : false;

	// Guard clause: invalid harness or pageId (Early Exit)
	if (!harness || !pageId) {
		return (
			<div className="flex flex-col gap-6 py-6">
				<p className="text-muted-foreground">Invalid page configuration.</p>
			</div>
		);
	}

	// Find current page and its index
	const currentPageIndex = harness.flow.findIndex((p) => p.id === pageId);
	const currentPage = harness.flow[currentPageIndex];

	// Guard clause: page not found (Early Exit)
	if (!currentPage) {
		return (
			<div className="flex flex-col gap-6 py-6">
				<p className="text-muted-foreground">Page not found: {pageId}</p>
			</div>
		);
	}

	// Validate step
	const ctx: WizardValidationContext = {
		harnessId,
		providers,
		slotValues,
	};
	const validation = stepId
		? validateStep(stepId, ctx)
		: { isValid: true, errors: [] };
	const showErrorBanner = isAttempted && !validation.isValid;

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Error banner */}
			{showErrorBanner && (
				<div
					data-error-banner
					ref={bannerRef}
					tabIndex={-1}
					aria-live="polite"
					className="mb-4 rounded-md bg-destructive/10 p-4 text-destructive text-sm"
				>
					Please complete all required fields before continuing.
				</div>
			)}

			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					{currentPage.label}
				</h1>
			</div>

			{/* Sections */}
			<div className="flex flex-col gap-6">
				{currentPage.sections.map((section) => (
					<div key={section.id} className="space-y-4">
						<Card id={section.id}>
							<CardHeader>
								<CardTitle>{section.label}</CardTitle>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									{section.slots.map((slotId) => {
										const slotDef = harness.slots[slotId];
										if (!slotDef) return null;
										return (
											<SlotControl
												key={slotId}
												slotId={slotId}
												slotDef={slotDef}
												showError={isAttempted}
											/>
										);
									})}
								</FieldGroup>

								{/* Advanced slots - collapsible INSIDE the same card */}
								{section.advanced && section.advanced.length > 0 && (
									<details className="mt-4 border-t pt-4">
										<summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
											Advanced
										</summary>
										<FieldGroup className="mt-3">
											{section.advanced.map((slotId) => {
												const slotDef = harness.slots[slotId];
												if (!slotDef) return null;
												return (
													<SlotControl
														key={slotId}
														slotId={slotId}
														slotDef={slotDef}
														showError={isAttempted}
													/>
												);
											})}
										</FieldGroup>
									</details>
								)}
							</CardContent>
						</Card>
					</div>
				))}
			</div>
		</div>
	);
}
