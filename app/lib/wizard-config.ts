// Wizard step definitions
export const WIZARD_STEPS = [
	{ id: "harness", path: "/", label: "Harness" },
	{ id: "providers", path: "/flow/providers", label: "Providers" },
	{ id: "primary", path: "/flow/models/primary", label: "Primary Model" },
	{ id: "secondary", path: "/flow/models/secondary", label: "Secondary Model" },
	{ id: "options", path: "/flow/options", label: "Options", conditional: true },
	{ id: "review", path: "/flow/review", label: "Review" },
] as const;

export type StepId = (typeof WIZARD_STEPS)[number]["id"];

// Stable step order for direction tracking (never changes even when steps are skipped)
export const STEP_ORDER: Record<string, number> = {
	harness: 0,
	providers: 1,
	primary: 2,
	secondary: 3,
	options: 4,
	review: 5,
};

// Path to stepId map (deterministic, no pathname parsing)
export const PATH_TO_STEP: Record<string, StepId> = {
	"/": "harness",
	"/flow/providers": "providers",
	"/flow/models/primary": "primary",
	"/flow/models/secondary": "secondary",
	"/flow/options": "options",
	"/flow/review": "review",
};

// Mock harness definitions (Phase 1)
export const HARNESSES = {
	"kdco-workspace": {
		id: "kdco-workspace",
		name: "KDCO Workspace",
		description: "Full-featured development environment",
		hasOptions: true,
		defaultProfileName: "kdco-workspace",
	},
	omo: {
		id: "omo",
		name: "Oh-My-OpenCode",
		description: "Lightweight orchestrator setup",
		hasOptions: false,
		defaultProfileName: "omo",
	},
} as const;

export type HarnessId = keyof typeof HARNESSES;

// Compute active steps based on harness (excludes conditional steps if harness doesn't support them)
export function getActiveSteps(harnessId?: HarnessId) {
	const harness = harnessId ? HARNESSES[harnessId] : null;
	return WIZARD_STEPS.filter(
		(step) => !("conditional" in step) || harness?.hasOptions,
	);
}

// Get max possible steps (for pre-harness display)
export function getMaxSteps() {
	return WIZARD_STEPS.length;
}

// Get step by ID
export function getStepById(stepId: StepId) {
	return WIZARD_STEPS.find((s) => s.id === stepId);
}

// Get next step in the active flow
export function getNextStep(currentStepId: StepId, harnessId?: HarnessId) {
	const steps = getActiveSteps(harnessId);
	const currentIndex = steps.findIndex((s) => s.id === currentStepId);
	return steps[currentIndex + 1] ?? null;
}

// Get previous step in the active flow
export function getPrevStep(currentStepId: StepId, harnessId?: HarnessId) {
	const steps = getActiveSteps(harnessId);
	const currentIndex = steps.findIndex((s) => s.id === currentStepId);
	return steps[currentIndex - 1] ?? null;
}

// Get current step index (1-based for display)
export function getStepIndex(stepId: StepId, harnessId?: HarnessId) {
	const steps = getActiveSteps(harnessId);
	return steps.findIndex((s) => s.id === stepId);
}

// Get next button label based on current step
export function getNextLabel(
	currentStepId: StepId,
	harnessId?: HarnessId,
): "Next" | "Review" | "Create Profile" {
	if (currentStepId === "review") return "Create Profile";

	const nextStep = getNextStep(currentStepId, harnessId);
	if (nextStep?.id === "review") return "Review";

	return "Next";
}

import { STEP_ROUTES } from "./routes";

// Get next step path (type-safe, uses active steps)
export function getNextStepPath(
	currentStepId: StepId,
	harnessId?: HarnessId,
): string | null {
	const nextStep = getNextStep(currentStepId, harnessId);
	return nextStep ? (STEP_ROUTES[nextStep.id] ?? null) : null;
}

// Get previous step path (type-safe, uses active steps)
export function getPrevStepPath(
	currentStepId: StepId,
	harnessId?: HarnessId,
): string | null {
	const prevStep = getPrevStep(currentStepId, harnessId);
	return prevStep ? (STEP_ROUTES[prevStep.id] ?? null) : null;
}
