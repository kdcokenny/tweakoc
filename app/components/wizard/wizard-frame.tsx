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
}: WizardFrameProps) {
	return (
		<div className="flex h-dvh flex-col bg-background">
			<WizardHeader
				currentStep={currentStep}
				totalSteps={totalSteps}
				showStepIndicator={showStepIndicator}
			/>

			<WizardContent direction={direction}>{children}</WizardContent>

			<WizardNav
				nextLabel={nextLabel}
				onNext={onNext}
				onBack={onBack}
				canGoNext={canGoNext}
				canGoBack={canGoBack}
			/>
		</div>
	);
}
