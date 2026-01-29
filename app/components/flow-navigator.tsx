import * as React from "react";
import { useNavigate } from "react-router";
import { getHarness } from "~/lib/harness-registry";
import { ROUTES } from "~/lib/routes";
import { useWizardStore } from "~/lib/store/wizard-store";

interface FlowNavigatorProps {
	children?: React.ReactNode;
}

export function useFlowNavigation() {
	const navigate = useNavigate();
	const harnessId = useWizardStore((state) => state.harnessId);
	const harness = harnessId ? getHarness(harnessId) : null;

	const goToFirstFlowPage = React.useCallback(() => {
		if (harness && harness.flow.length > 0) {
			navigate(ROUTES.flow.page(harness.flow[0].id));
		} else {
			// Fallback to review if no flow pages
			navigate(ROUTES.flow.review);
		}
	}, [harness, navigate]);

	const goToProviders = React.useCallback(() => {
		navigate(ROUTES.flow.providers);
	}, [navigate]);

	const goToReview = React.useCallback(() => {
		navigate(ROUTES.flow.review);
	}, [navigate]);

	return {
		harness,
		goToFirstFlowPage,
		goToProviders,
		goToReview,
		flowPageCount: harness?.flow.length ?? 0,
	};
}

export function FlowNavigator({ children }: FlowNavigatorProps) {
	return <>{children}</>;
}
