import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "~/lib/routes";
import {
	selectHarnessId,
	selectHasProviders,
	selectIsPrimaryComplete,
	selectIsSecondaryComplete,
	useWizardStore,
} from "~/lib/store/wizard-store";

interface GuardRequirements {
	harness?: boolean;
	providers?: boolean;
	primaryComplete?: boolean;
	secondaryComplete?: boolean;
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

	// Select only what we need to minimize re-renders
	const harnessId = useWizardStore(selectHarnessId);
	const hasProviders = useWizardStore(selectHasProviders);
	const isPrimaryComplete = useWizardStore(selectIsPrimaryComplete);
	const isSecondaryComplete = useWizardStore(selectIsSecondaryComplete);

	// Compute redirect target based on missing requirements
	const redirectTo = useMemo(() => {
		if (requirements.harness && !harnessId) {
			return ROUTES.home;
		}
		if (requirements.providers && !hasProviders) {
			return ROUTES.flow.providers;
		}
		if (requirements.primaryComplete && !isPrimaryComplete) {
			return ROUTES.flow.modelsPrimary;
		}
		if (requirements.secondaryComplete && !isSecondaryComplete) {
			return ROUTES.flow.modelsSecondary;
		}
		return null;
	}, [
		requirements,
		harnessId,
		hasProviders,
		isPrimaryComplete,
		isSecondaryComplete,
	]);

	// Navigate when redirect target changes from null to a path
	useEffect(() => {
		if (redirectTo) {
			navigate(redirectTo, { replace: true });
		}
	}, [redirectTo, navigate]);

	return { allowed: redirectTo === null };
}
