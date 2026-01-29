import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { ROUTES } from "~/lib/routes";
import {
	selectAllSlots,
	selectAreAllSlotsComplete,
	selectHarnessId,
	selectHasProviders,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { getStepFromPath, getWizardSteps } from "~/lib/wizard-config";
import { toStepId } from "~/lib/wizard-step-id";
import {
	validateStep,
	type WizardValidationContext,
} from "~/lib/wizard-validation";

interface GuardRequirements {
	harness?: boolean;
	providers?: boolean;
	allSlotsComplete?: boolean;
}

interface GuardResult {
	allowed: boolean;
}

/**
 * Route guard hook that redirects if wizard prerequisites are not met.
 * Returns { allowed: false } during redirect to prevent content flash.
 *
 * Usage:
 * ```tsx
 * const { allowed } = useWizardGuard({ harness: true, providers: true });
 * if (!allowed) return null;
 * return <ActualContent />;
 * ```
 */
export function useWizardGuard(requirements: GuardRequirements): GuardResult {
	const navigate = useNavigate();
	const location = useLocation();

	// Select only what we need to minimize re-renders
	const harnessId = useWizardStore(selectHarnessId);
	const hasProviders = useWizardStore(selectHasProviders);
	const allSlotsComplete = useWizardStore(selectAreAllSlotsComplete);
	const providers = useWizardStore(selectProviders);
	const slots = useWizardStore(selectAllSlots);

	// Compute redirect target based on missing requirements
	const redirectTo = useMemo(() => {
		// BACKWARD COMPATIBILITY: Existing requirement checks run first
		// Guard: No harness selected (Early Exit)
		if (requirements.harness && !harnessId) {
			return ROUTES.home;
		}
		// Guard: No providers selected (Early Exit)
		if (requirements.providers && !hasProviders) {
			return ROUTES.flow.providers;
		}
		// Guard: Slots incomplete (Early Exit)
		if (requirements.allSlotsComplete && !allSlotsComplete) {
			return ROUTES.flow.providers;
		}

		// DEEP LINK PROTECTION: Validate all prerequisite steps
		// Get current step from path
		const steps = getWizardSteps(harnessId);
		const currentStep = getStepFromPath(steps, location.pathname);

		// Guard: Unknown step → redirect to first incomplete (Early Exit)
		if (!currentStep) {
			// Create validation context
			const ctx: WizardValidationContext = { harnessId, providers, slots };

			// Find first incomplete step
			for (const step of steps) {
				const stepId = toStepId(step);
				const { isValid } = validateStep(stepId, ctx);
				if (!isValid) {
					return step.path; // First incomplete step
				}
			}

			// All steps valid → go to last step (review)
			return steps[steps.length - 1]?.path ?? ROUTES.home;
		}

		// Guard: No steps available - redirect to home (Early Exit)
		if (steps.length === 0) {
			return ROUTES.home;
		}

		// Find current step index
		const currentIndex = steps.findIndex((s) => s.id === currentStep.id);

		// Guard: Step not found - allow access (Early Exit)
		if (currentIndex === -1) {
			return null;
		}

		// Validate all prerequisite steps (Parse Don't Validate)
		for (let i = 0; i < currentIndex; i++) {
			const step = steps[i];
			const { isValid } = validateStep(step.id, {
				harnessId,
				providers,
				slots,
			});

			// Guard: Prerequisite incomplete - redirect to first incomplete step (Fail Fast)
			if (!isValid) {
				return step.path;
			}
		}

		return null;
	}, [
		requirements,
		harnessId,
		hasProviders,
		allSlotsComplete,
		providers,
		slots,
		location.pathname,
	]);

	// Navigate when redirect target changes from null to a path
	useEffect(() => {
		if (redirectTo) {
			navigate(redirectTo, { replace: true });
		}
	}, [redirectTo, navigate]);

	return { allowed: redirectTo === null };
}
