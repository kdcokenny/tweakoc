import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { WizardFrame } from "~/components/wizard/wizard-frame";
import {
	selectHarnessId,
	selectReturnToStep,
	useWizardStore,
} from "~/lib/store/wizard-store";
import {
	getActiveSteps,
	getMaxSteps,
	getNextLabel,
	getNextStepPath,
	getPrevStepPath,
	getStepIndex,
	PATH_TO_STEP,
	STEP_ORDER,
	type StepId,
} from "~/lib/wizard-config";

export default function RootLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const prevOrderRef = useRef<number | null>(null);

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

	// Derive step from path (deterministic map lookup)
	const currentStepId = (PATH_TO_STEP[location.pathname] ??
		"harness") as StepId;
	const currentOrder = STEP_ORDER[currentStepId] ?? 0;

	// Direction tracking (stable order, not active steps)
	const direction = useMemo(() => {
		if (prevOrderRef.current === null) return "forward" as const;
		return currentOrder < prevOrderRef.current
			? ("back" as const)
			: ("forward" as const);
	}, [currentOrder]);

	useEffect(() => {
		prevOrderRef.current = currentOrder;
	}, [currentOrder]);

	// Compute steps
	const activeSteps = harnessId ? getActiveSteps(harnessId) : null;
	const totalSteps = activeSteps?.length ?? getMaxSteps();
	const currentIndex = getStepIndex(currentStepId, harnessId);

	// Navigation handlers
	const handleNext = () => {
		// Special case: review step - call the registered handler
		if (currentStepId === "review") {
			const handler = useWizardStore.getState().reviewStepHandler;
			if (handler) {
				void handler();
				return;
			}
		}

		// If returnToStep is set, go there instead of natural next
		if (returnToStep) {
			const returnPath =
				returnToStep === "primary"
					? "/flow/models/primary"
					: "/flow/models/secondary";
			setReturnToStep(undefined);
			navigate(returnPath);
			return;
		}

		const nextPath = getNextStepPath(currentStepId, harnessId);
		if (nextPath) navigate(nextPath);
	};

	const handleBack = () => {
		const prevPath = getPrevStepPath(currentStepId, harnessId);
		if (prevPath) navigate(prevPath);
	};

	// Next button label
	const nextLabel = getNextLabel(currentStepId, harnessId);

	// Can go back? (not on step 1, and not while creating)
	const canGoBack = currentIndex > 0 && !reviewStepCreating;

	// Can go next? (harness step: only if harness selected; review step: not while creating)
	const canGoNext =
		currentStepId === "harness"
			? !!harnessId
			: currentStepId === "review"
				? !reviewStepCreating
				: true;

	return (
		<WizardFrame
			currentStep={currentIndex + 1}
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
