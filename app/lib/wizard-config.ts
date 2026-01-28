import { getHarness } from "./harness-registry";

// Base steps that are always present
const BASE_STEPS_START = [
	{ id: "harness", path: "/", label: "Harness" },
	{ id: "providers", path: "/flow/providers", label: "Providers" },
];

const BASE_STEPS_END = [
	{ id: "review", path: "/flow/review", label: "Review" },
];

export interface WizardStep {
	id: string;
	path: string;
	label: string;
	slotId?: string; // For slot steps
}

/**
 * Generate wizard steps based on harness configuration.
 * Steps are: harness → providers → [slot steps] → [options if any] → review
 */
export function getWizardSteps(harnessId: string | undefined): WizardStep[] {
	if (!harnessId) {
		return [...BASE_STEPS_START, ...BASE_STEPS_END];
	}

	const harness = getHarness(harnessId);
	if (!harness) {
		return [...BASE_STEPS_START, ...BASE_STEPS_END];
	}

	const steps: WizardStep[] = [...BASE_STEPS_START];

	// Add slot steps
	for (const slot of harness.slots) {
		steps.push({
			id: `slot-${slot.id}`,
			path: `/flow/slot/${slot.id}`,
			label: slot.label,
			slotId: slot.id,
		});
	}

	// Add options step if harness has options
	if (harness.options && harness.options.length > 0) {
		steps.push({
			id: "options",
			path: "/flow/options",
			label: "Options",
		});
	}

	// Add review step
	steps.push(...BASE_STEPS_END);

	return steps;
}

/**
 * Get active steps (for backward compatibility during transition).
 * Now just calls getWizardSteps.
 */
export function getActiveSteps(harnessId: string | undefined): WizardStep[] {
	return getWizardSteps(harnessId);
}

// Keep HARNESSES export for backward compatibility, but update to use new registry
export { getAllHarnesses, getHarness, HARNESSES } from "./harness-registry";

// Step navigation helpers
export function getStepIndex(steps: WizardStep[], stepId: string): number {
	return steps.findIndex((s) => s.id === stepId);
}

export function getNextStep(
	steps: WizardStep[],
	currentStepId: string,
): WizardStep | undefined {
	const index = getStepIndex(steps, currentStepId);
	return index >= 0 && index < steps.length - 1 ? steps[index + 1] : undefined;
}

export function getPrevStep(
	steps: WizardStep[],
	currentStepId: string,
): WizardStep | undefined {
	const index = getStepIndex(steps, currentStepId);
	return index > 0 ? steps[index - 1] : undefined;
}

// Helper to identify current step from path
export function getStepFromPath(
	steps: WizardStep[],
	path: string,
): WizardStep | undefined {
	// Handle slot paths: /flow/slot/visual-engineering → slot-visual-engineering
	if (path.startsWith("/flow/slot/")) {
		const slotId = path.replace("/flow/slot/", "");
		return steps.find((s) => s.slotId === slotId);
	}
	return steps.find((s) => s.path === path);
}

// Get next button label based on current step
export function getNextLabel(
	currentStepId: string,
	harnessId: string | undefined,
): "Next" | "Review" | "Create Profile" {
	if (currentStepId === "review") return "Create Profile";

	const steps = getWizardSteps(harnessId);
	const nextStep = getNextStep(steps, currentStepId);
	if (nextStep?.id === "review") return "Review";

	return "Next";
}

// Get max possible steps (for pre-harness display)
export function getMaxSteps(): number {
	// Max possible: harness, providers, 2 slots (typical), options, review
	return 6;
}
