import * as React from "react";
import { href, useNavigate, useParams } from "react-router";
import { getHarness } from "~/lib/harness-registry";
import { useWizardStore } from "~/lib/store/wizard-store";

interface FlowNavigatorProps {
	children?: React.ReactNode;
}

export function useFlowNavigation() {
	const navigate = useNavigate();
	const { harnessId: urlHarnessId } = useParams<{ harnessId?: string }>();
	const storeHarnessId = useWizardStore((state) => state.harnessId);
	const harnessId = urlHarnessId || storeHarnessId;
	const harness = harnessId ? getHarness(harnessId) : null;

	const goToFirstFlowPage = React.useCallback(() => {
		if (!harnessId) return;
		if (harness && harness.flow.length > 0) {
			navigate(
				href("/flow/:harnessId/page/:pageId", {
					harnessId,
					pageId: harness.flow[0].id,
				}),
			);
		} else {
			// Fallback to review if no flow pages
			navigate(href("/flow/:harnessId/review", { harnessId }));
		}
	}, [harness, harnessId, navigate]);

	const goToProviders = React.useCallback(() => {
		if (!harnessId) return;
		navigate(href("/flow/:harnessId/providers", { harnessId }));
	}, [harnessId, navigate]);

	const goToReview = React.useCallback(() => {
		if (!harnessId) return;
		navigate(href("/flow/:harnessId/review", { harnessId }));
	}, [harnessId, navigate]);

	return {
		harness,
		harnessId,
		goToFirstFlowPage,
		goToProviders,
		goToReview,
		flowPageCount: harness?.flow.length ?? 0,
	};
}

export function FlowNavigator({ children }: FlowNavigatorProps) {
	return <>{children}</>;
}
