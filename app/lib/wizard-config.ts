import { getHarness } from "./harness-registry";
import { ROUTES } from "./routes";

// Base steps that are always present
const BASE_STEPS_START = [{ id: "harness", path: "/", label: "Harness" }];

export interface WizardStep {
	id: string;
	path: string;
	label: string;
	slotId?: string; // For slot steps
}

/**
 * Generate wizard steps based on harness configuration.
 * Steps are: harness → providers → [flow pages] → review
 */
export function getWizardSteps(harnessId: string | undefined): WizardStep[] {
	if (!harnessId) {
		return BASE_STEPS_START;
	}

	const harness = getHarness(harnessId);
	if (!harness) {
		return BASE_STEPS_START;
	}

	const steps: WizardStep[] = [...BASE_STEPS_START];

	// Add providers step
	steps.push({
		id: "providers",
		path: ROUTES.flow.providers(harnessId),
		label: "Providers",
	});

	// Add flow pages from harness configuration
	for (const page of harness.flow) {
		steps.push({
			id: `page-${page.id}`,
			path: ROUTES.flow.page(harnessId, page.id),
			label: page.label,
		});
	}

	// Add review step
	steps.push({
		id: "review",
		path: ROUTES.flow.review(harnessId),
		label: "Review",
	});

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
	// Extract harnessId from path patterns like /flow/:harnessId/...
	const flowMatch = path.match(/^\/flow\/([^/]+)\/(.*)/);
	if (flowMatch) {
		const [, , restPath] = flowMatch;
		// Handle flow page paths: /flow/:harnessId/page/:pageId → page-:pageId
		if (restPath.startsWith("page/")) {
			const pageId = restPath.replace("page/", "");
			return steps.find((s) => s.id === `page-${pageId}`);
		}
		// Handle slot paths: /flow/:harnessId/slot/:slotId → slot-:slotId
		if (restPath.startsWith("slot/")) {
			const slotId = restPath.replace("slot/", "");
			return steps.find((s) => s.slotId === slotId);
		}
		// Handle providers or review: /flow/:harnessId/providers or /flow/:harnessId/review
		return steps.find((s) => s.id === restPath);
	}
	// Fallback: exact path match
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
