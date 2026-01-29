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
import { toStepId } from "~/lib/wizard-step-id";
import {
	validateStep,
	type WizardValidationContext,
} from "~/lib/wizard-validation";

export default function RootLayout() {
	const location = useLocation();
	const navigate = useNavigate();

	// Get harness from store
	const harnessId = useWizardStore(selectHarnessId);
	const returnToStep = useWizardStore(selectReturnToStep);
	const setReturnToStep = useWizardStore((s) => s.setReturnToStep);
	const reviewStepCreating = useWizardStore((s) => s.reviewStepCreating);
	const providers = useWizardStore((s) => s.providers);
	const slotValues = useWizardStore((s) => s.slotValues);
	const markStepAttempted = useWizardStore((s) => s.markStepAttempted);
	const requestBannerFocus = useWizardStore((s) => s.requestBannerFocus);

	// Preload provider catalog for deep links
	const ensureProvidersLoaded = useWizardStore((s) => s.ensureProvidersLoaded);

	useEffect(() => {
		void ensureProvidersLoaded();
	}, [ensureProvidersLoaded]);

	// Compute steps based on harness
	const steps = getWizardSteps(harnessId);
	const currentStep = getStepFromPath(steps, location.pathname);
	const currentStepIndex = currentStep ? steps.indexOf(currentStep) : -1;
	const currentStepId = currentStep ? toStepId(currentStep) : null;

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
		// Guard: No current step (Early Exit)
		if (!currentStep) return;

		const stepId = toStepId(currentStep);
		const ctx: WizardValidationContext = { harnessId, providers, slotValues };

		// Mark attempted before validation (errors will now show)
		markStepAttempted(stepId);

		const { isValid } = validateStep(currentStep.id, ctx);

		if (!isValid) {
			requestBannerFocus(stepId);
			return; // Stay on current step, errors now visible
		}

		// Special case: review step - call the registered handler
		if (currentStep.id === "review") {
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

		const nextStep = getNextStep(steps, currentStep.id);
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

	// Can go next? Use validation utility for all steps
	const canGoNext = useMemo(() => {
		if (!currentStep) return false;

		// Review step has special handling for creation state
		if (currentStep.id === "review") {
			return !reviewStepCreating;
		}

		const { isValid } = validateStep(currentStep.id, {
			harnessId,
			providers,
			slotValues,
		});

		return isValid;
	}, [currentStep, harnessId, providers, slotValues, reviewStepCreating]);

	// Show step indicator only if we're not on the first page OR if harness is selected
	const showStepIndicator = currentStepIndex > 0 || !!harnessId;

	return (
		<WizardFrame
			currentStep={currentStepIndex + 1}
			totalSteps={totalSteps}
			currentStepId={currentStepId}
			nextLabel={nextLabel}
			onNext={handleNext}
			onBack={handleBack}
			canGoNext={canGoNext}
			canGoBack={canGoBack}
			direction={direction}
			showStepIndicator={showStepIndicator}
			isCreating={reviewStepCreating}
		>
			<Outlet />
		</WizardFrame>
	);
}
