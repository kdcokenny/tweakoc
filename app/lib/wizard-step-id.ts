import type { WizardStep } from "./wizard-config";

declare const StepIdBrand: unique symbol;
export type StepId = string & { readonly [StepIdBrand]: true };

/**
 * Safe factory to create StepId from a known WizardStep.
 * Use this when you have a step from getWizardSteps().
 */
export function toStepId(step: WizardStep): StepId {
	return step.id as StepId;
}

/**
 * Parse boundary for user-controlled input (route params, deep links).
 * Returns null if the step ID is not found - caller should redirect.
 */
export function parseStepId(
	steps: WizardStep[],
	stepIdString: string,
): StepId | null {
	const found = steps.find((s) => s.id === stepIdString);
	return found ? toStepId(found) : null;
}

/**
 * Internal invariant - throws on unknown step ID.
 * Use only for programmer errors, never for user input.
 */
export function requireStepId(
	steps: WizardStep[],
	stepIdString: string,
): StepId {
	const result = parseStepId(steps, stepIdString);
	if (!result) throw new Error(`[Invariant] Unknown step ID: ${stepIdString}`);
	return result;
}
