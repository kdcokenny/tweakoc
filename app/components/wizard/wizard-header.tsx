import { Link } from "react-router";

interface WizardHeaderProps {
	currentStep: number;
	totalSteps: number;
}

export function WizardHeader({ currentStep, totalSteps }: WizardHeaderProps) {
	return (
		<header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
			{/* Logo + wordmark */}
			<Link to="/" className="flex items-center gap-2">
				<img src="/brand/logo.svg" alt="Tweak logo" className="h-6 w-6" />
				<span className="font-semibold tracking-tight">tweak</span>
			</Link>

			{/* Step indicator */}
			<div className="text-sm text-muted-foreground">
				Step {currentStep} of {totalSteps}
			</div>
		</header>
	);
}
