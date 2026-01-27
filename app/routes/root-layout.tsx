import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { WizardFrame } from "~/components/wizard/wizard-frame";
import { STEP_ROUTES } from "~/lib/routes";
import {
	getActiveSteps,
	getMaxSteps,
	getNextLabel,
	getNextStep,
	getPrevStep,
	getStepIndex,
	type HarnessId,
	PATH_TO_STEP,
	STEP_ORDER,
	type StepId,
} from "~/lib/wizard-config";

export default function RootLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const prevOrderRef = useRef<number | null>(null);

	// Derive step from path (deterministic map lookup)
	const currentStepId = (PATH_TO_STEP[location.pathname] ??
		"harness") as StepId;
	const currentOrder = STEP_ORDER[currentStepId] ?? 0;

	// TODO: Get from Zustand store (Phase 1 placeholder)
	const harnessId: HarnessId | undefined = undefined;

	// Guard: redirect to / if in /flow/* without harness
	const isFlowRoute = location.pathname.startsWith("/flow");
	// biome-ignore lint/correctness/useExhaustiveDependencies: harnessId is intentionally included
	useEffect(() => {
		if (isFlowRoute && !harnessId) {
			navigate("/", { replace: true });
		}
	}, [isFlowRoute, harnessId, navigate]);

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
		const nextStep = getNextStep(currentStepId, harnessId);
		if (nextStep) {
			const route = STEP_ROUTES[nextStep.id];
			if (route) navigate(route);
		}
	};

	const handleBack = () => {
		const prevStep = getPrevStep(currentStepId, harnessId);
		if (prevStep) {
			const route = STEP_ROUTES[prevStep.id];
			if (route) navigate(route);
		}
	};

	// Next button label
	const nextLabel = getNextLabel(currentStepId, harnessId);

	// Can go back? (not on step 1)
	const canGoBack = currentIndex > 0;

	// Can go next? (harness step: only if harness selected)
	const canGoNext = currentStepId === "harness" ? !!harnessId : true;

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
