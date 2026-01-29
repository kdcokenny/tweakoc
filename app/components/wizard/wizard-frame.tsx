import type { StepId } from "~/lib/wizard-step-id";
import { WizardContent } from "./wizard-content";
import { WizardHeader } from "./wizard-header";
import { WizardNav } from "./wizard-nav";

interface WizardFrameProps {
	children: React.ReactNode;
	currentStep: number;
	totalSteps: number;
	nextLabel: "Next" | "Review" | "Create Profile";
	onNext: () => void;
	onBack: () => void;
	canGoNext: boolean;
	canGoBack: boolean;
	direction: "forward" | "back";
	showStepIndicator?: boolean;
	isCreating?: boolean; // For review step creating state
	currentStepId: StepId | null; // NEW: for focus scoping
}

export function WizardFrame({
	children,
	currentStep,
	totalSteps,
	nextLabel,
	onNext,
	onBack,
	canGoNext,
	canGoBack,
	direction,
	showStepIndicator = true,
	isCreating,
	currentStepId,
}: WizardFrameProps) {
	return (
		<div className="flex h-dvh flex-col bg-background">
			{/* ARIA live region for step announcements */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				Step {currentStep} of {totalSteps}
			</div>

			<WizardHeader
				currentStep={currentStep}
				totalSteps={totalSteps}
				showStepIndicator={showStepIndicator}
			/>

			<WizardContent direction={direction} currentStepId={currentStepId}>
				{children}
			</WizardContent>

			<WizardNav
				nextLabel={nextLabel}
				onNext={onNext}
				onBack={onBack}
				canGoNext={canGoNext}
				canGoBack={canGoBack}
				isCreating={isCreating}
			/>
		</div>
	);
}
