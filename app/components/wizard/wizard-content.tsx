import { useEffect } from "react";
import { useWizardStore } from "~/lib/store/wizard-store";
import { cn } from "~/lib/utils";
import type { StepId } from "~/lib/wizard-step-id";

interface WizardContentProps {
	children: React.ReactNode;
	direction: "forward" | "back";
	currentStepId: StepId | null; // NEW: for focus scoping
}

export function WizardContent({
	children,
	direction,
	currentStepId,
}: WizardContentProps) {
	const focusBannerRequest = useWizardStore(
		(state) => state.focusBannerRequest,
	);
	const lastHandledId = useWizardStore(
		(state) => state.lastHandledFocusBannerRequestId,
	);
	const consumeFocusRequest = useWizardStore(
		(state) => state.consumeFocusRequest,
	);

	useEffect(() => {
		// Guard: no pending request
		if (!focusBannerRequest) return;

		// Guard: already handled
		if (focusBannerRequest.id <= lastHandledId) return;

		// Guard: wrong step (focus should go to the target step's banner)
		if (focusBannerRequest.targetStepId !== currentStepId) return;

		// Capture the request ID we're handling
		const handlingRequestId = focusBannerRequest.id;

		// Defer focus to next frame to ensure banner is rendered
		const rafId = requestAnimationFrame(() => {
			// Find the error banner in this content area
			const banner = document.querySelector("[data-error-banner]");
			if (!banner || !(banner instanceof HTMLElement)) return; // Don't consume if no banner

			banner.focus();
			consumeFocusRequest(handlingRequestId);
		});

		// Cleanup: cancel pending focus on unmount or re-run
		return () => cancelAnimationFrame(rafId);
	}, [focusBannerRequest, lastHandledId, currentStepId, consumeFocusRequest]);

	return (
		<main
			className={cn(
				"flex-1 overflow-y-auto overscroll-contain",
				"motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
				direction === "forward" && "motion-safe:animate-slide-left",
				direction === "back" && "motion-safe:animate-slide-right",
			)}
		>
			<div className="max-w-2xl mx-auto px-6">{children}</div>
		</main>
	);
}
