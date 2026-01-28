import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { WizardFrame } from "~/components/wizard/wizard-frame";
import {
	selectHarnessId,
	selectReturnToStep,
	useWizardStore,
} from "~/lib/store/wizard-store";
import {
	getMaxSteps,
	getNextLabel,
	getNextStep,
	getPrevStep,
	getStepFromPath,
	getWizardSteps,
} from "~/lib/wizard-config";

export default function RootLayout() {
	const location = useLocation();
	const navigate = useNavigate();

	// Get harness from store
	const harnessId = useWizardStore(selectHarnessId);
	const returnToStep = useWizardStore(selectReturnToStep);
	const setReturnToStep = useWizardStore((s) => s.setReturnToStep);
	const reviewStepCreating = useWizardStore((s) => s.reviewStepCreating);

	// Preload provider catalog for deep links
	const ensureProvidersLoaded = useWizardStore((s) => s.ensureProvidersLoaded);

	useEffect(() => {
		void ensureProvidersLoaded();
	}, [ensureProvidersLoaded]);

	// Compute steps based on harness
	const steps = getWizardSteps(harnessId);
	const currentStep = getStepFromPath(steps, location.pathname);
	const currentStepIndex = currentStep ? steps.indexOf(currentStep) : -1;

	// Direction tracking (for animations - based on step index)
	const prevIndexRef = useRef<number | null>(null);
	const direction = useMemo(() => {
		if (prevIndexRef.current === null) return "forward" as const;
		return currentStepIndex < prevIndexRef.current
			? ("back" as const)
			: ("forward" as const);
	}, [currentStepIndex]);

	useEffect(() => {
		prevIndexRef.current = currentStepIndex;
	}, [currentStepIndex]);

	// Compute steps
	const totalSteps = steps.length || getMaxSteps();

	// Navigation handlers
	const handleNext = () => {
		// Special case: review step - call the registered handler
		if (currentStep?.id === "review") {
			const handler = useWizardStore.getState().reviewStepHandler;
			if (handler) {
				void handler();
				return;
			}
		}

		// If returnToStep is set, go there instead of natural next
		if (returnToStep) {
			const returnPath = `/flow/slot/${returnToStep}`;
			setReturnToStep(undefined);
			navigate(returnPath);
			return;
		}

		const nextStep = currentStep
			? getNextStep(steps, currentStep.id)
			: undefined;
		if (nextStep) navigate(nextStep.path);
	};

	const handleBack = () => {
		const prevStep = currentStep
			? getPrevStep(steps, currentStep.id)
			: undefined;
		if (prevStep) navigate(prevStep.path);
	};

	// Next button label
	const nextLabel = getNextLabel(currentStep?.id ?? "harness", harnessId);

	// Can go back? (not on step 1, and not while creating)
	const canGoBack = currentStepIndex > 0 && !reviewStepCreating;

	// Can go next? (harness step: only if harness selected; review step: not while creating)
	const canGoNext =
		currentStep?.id === "harness"
			? !!harnessId
			: currentStep?.id === "review"
				? !reviewStepCreating
				: true;

	return (
		<WizardFrame
			currentStep={currentStepIndex + 1}
			totalSteps={totalSteps}
			nextLabel={nextLabel}
			onNext={handleNext}
			onBack={handleBack}
			canGoNext={canGoNext}
			canGoBack={canGoBack}
			direction={direction}
		>
			<Outlet />
		</WizardFrame>
	);
}
