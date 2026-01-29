import { Check } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
	selectAllSlots,
	selectHarnessId,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { cn } from "~/lib/utils";
import { getWizardSteps } from "~/lib/wizard-config";
import { toStepId } from "~/lib/wizard-step-id";
import {
	validateStep,
	type WizardValidationContext,
} from "~/lib/wizard-validation";

interface WizardHeaderProps {
	currentStep: number;
	totalSteps: number;
	showStepIndicator?: boolean;
}

export function WizardHeader({
	currentStep,
	totalSteps,
	showStepIndicator = true,
}: WizardHeaderProps) {
	const navigate = useNavigate();
	const harnessId = useWizardStore(selectHarnessId);
	const providers = useWizardStore(selectProviders);
	const slots = useWizardStore(selectAllSlots);
	const markStepAttempted = useWizardStore((s) => s.markStepAttempted);
	const requestBannerFocus = useWizardStore((s) => s.requestBannerFocus);

	// Get wizard steps if harness is selected
	const steps = harnessId ? getWizardSteps(harnessId) : [];

	// Handle step click with validation
	const handleStepClick = (targetIndex: number) => {
		const currentIndex = currentStep - 1; // currentStep is 1-indexed

		// Guard: backward always allowed (Early Exit)
		if (targetIndex <= currentIndex) {
			navigate(steps[targetIndex].path);
			return;
		}

		const ctx: WizardValidationContext = { harnessId, providers, slots };

		// Forward: find first blocking step
		for (let i = currentIndex; i < targetIndex; i++) {
			const step = steps[i];
			const stepId = toStepId(step);
			const { isValid } = validateStep(step.id, ctx);
			if (!isValid) {
				markStepAttempted(stepId);
				requestBannerFocus(stepId);
				navigate(step.path); // Navigate TO the blocking step
				return;
			}
		}

		// All intermediate valid, allow forward jump
		navigate(steps[targetIndex].path);
	};

	// Compute which steps are complete and which are accessible
	const stepStates = steps.map((step, index) => {
		const { isValid } = validateStep(step.id, { harnessId, providers, slots });

		// A step is accessible if:
		// - It's a previous step (always accessible for backward nav)
		// - It's the current step
		// - It's the next step AND all previous steps are valid
		const isAccessible =
			index <= currentStep - 1 ||
			(index === currentStep &&
				steps.slice(0, index).every((_, i) => {
					const { isValid: prevValid } = validateStep(steps[i].id, {
						harnessId,
						providers,
						slots,
					});
					return prevValid;
				}));

		return {
			...step,
			isComplete: isValid,
			isAccessible,
			isCurrent: index === currentStep - 1, // currentStep is 1-indexed
		};
	});

	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
			{/* Logo + wordmark */}
			<Link to="/" className="flex items-center gap-2">
				<img src="/brand/logo.svg" alt="Tweak logo" className="h-6 w-6" />
				<span className="font-semibold tracking-tight">tweak</span>
			</Link>

			{/* Step indicators */}
			{showStepIndicator && steps.length > 0 && (
				<nav className="flex items-center gap-2" aria-label="Wizard progress">
					{stepStates.map((step, index) => {
						const stepClasses = cn(
							"flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
							step.isCurrent && "bg-primary text-primary-foreground",
							step.isComplete &&
								!step.isCurrent &&
								"bg-primary/20 text-primary",
							!step.isComplete &&
								!step.isCurrent &&
								"bg-muted text-muted-foreground",
							step.isAccessible &&
								!step.isCurrent &&
								"hover:bg-primary/30 cursor-pointer",
							!step.isAccessible && "cursor-not-allowed opacity-50",
						);

						if (step.isAccessible) {
							return (
								<button
									key={step.id}
									type="button"
									onClick={() => handleStepClick(index)}
									className={stepClasses}
									aria-current={step.isCurrent ? "step" : undefined}
								>
									{step.isComplete && !step.isCurrent ? (
										<Check className="h-4 w-4" />
									) : (
										index + 1
									)}
								</button>
							);
						}

						return (
							<span
								key={step.id}
								className={stepClasses}
								aria-current={step.isCurrent ? "step" : undefined}
								aria-disabled={true}
							>
								{step.isComplete && !step.isCurrent ? (
									<Check className="h-4 w-4" />
								) : (
									index + 1
								)}
							</span>
						);
					})}
				</nav>
			)}

			{/* Fallback for no harness selected */}
			{showStepIndicator && steps.length === 0 && (
				<div className="text-sm text-muted-foreground">
					Step {currentStep} of {totalSteps}
				</div>
			)}
		</header>
	);
}
