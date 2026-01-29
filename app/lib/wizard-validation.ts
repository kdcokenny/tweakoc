import { getHarness } from "~/lib/harness-registry";
import type { FlowPage } from "~/lib/harness-schema";

export interface StepValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface WizardValidationContext {
	harnessId: string | undefined;
	providers: string[];
	slotValues: Record<string, unknown>;
}

interface WizardState {
	harnessId?: string;
	providers: string[];
	slotValues: Record<string, unknown>;
}

/**
 * Main validation function for wizard steps.
 * Handles validation for all step types: harness, providers, page-{id}, and review.
 *
 * @param stepId - The step identifier (e.g., "harness", "providers", "page-abc", "review")
 * @param state - The current wizard state
 * @returns Validation result with isValid flag and error messages
 */
export function validateStep(
	stepId: string,
	state: WizardState,
): StepValidationResult {
	// Guard: Handle harness step (Early Exit)
	if (stepId === "harness") {
		if (!state.harnessId) {
			return {
				isValid: false,
				errors: ["Please select a harness"],
			};
		}
		return { isValid: true, errors: [] };
	}

	// Guard: Ensure harnessId exists for all other steps (Fail Fast)
	if (!state.harnessId) {
		return {
			isValid: false,
			errors: ["Harness must be selected first"],
		};
	}

	// Guard: Handle providers step (Early Exit)
	if (stepId === "providers") {
		if (state.providers.length === 0) {
			return {
				isValid: false,
				errors: ["Please select at least one provider"],
			};
		}
		return { isValid: true, errors: [] };
	}

	// Guard: Handle review step (Early Exit)
	if (stepId === "review") {
		return validateAllSlots(state.harnessId, state.slotValues);
	}

	// Guard: Handle page-{id} steps (Early Exit)
	if (stepId.startsWith("page-")) {
		const pageId = stepId.slice(5); // Remove "page-" prefix
		return validateFlowPage(pageId, state.harnessId, state.slotValues);
	}

	// Guard: Unknown step type (Fail Fast)
	return {
		isValid: false,
		errors: [`Unknown step type: ${stepId}`],
	};
}

/**
 * Validate all slots on a specific flow page.
 * Checks that all model slots on the page have values set.
 *
 * @param pageId - The flow page ID
 * @param harnessId - The harness identifier
 * @param slotValues - The current slot values
 * @returns Validation result with errors for incomplete slots
 */
export function validateFlowPage(
	pageId: string,
	harnessId: string,
	slotValues: Record<string, unknown>,
): StepValidationResult {
	// Guard: Get harness config (Fail Fast)
	const harness = getHarness(harnessId);
	if (!harness) {
		return {
			isValid: false,
			errors: [`Harness not found: ${harnessId}`],
		};
	}

	// Guard: Find page in flow (Fail Fast)
	const page = harness.flow.find((p) => p.id === pageId);
	if (!page) {
		return {
			isValid: false,
			errors: [`Page not found: ${pageId}`],
		};
	}

	// Collect errors for incomplete slots (Intentional Naming)
	const errors = collectPageSlotErrors(page, harness.slots, slotValues);

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validate all slots across all flow pages.
 * Used for the review step to ensure complete configuration.
 *
 * @param harnessId - The harness identifier
 * @param slotValues - The current slot values
 * @returns Validation result with errors for all incomplete slots
 */
export function validateAllSlots(
	harnessId: string,
	slotValues: Record<string, unknown>,
): StepValidationResult {
	// Guard: Get harness config (Fail Fast)
	const harness = getHarness(harnessId);
	if (!harness) {
		return {
			isValid: false,
			errors: [`Harness not found: ${harnessId}`],
		};
	}

	// Collect errors from all pages (Atomic Predictability)
	const allErrors: string[] = [];

	for (const page of harness.flow) {
		const pageErrors = collectPageSlotErrors(page, harness.slots, slotValues);
		allErrors.push(...pageErrors);
	}

	return {
		isValid: allErrors.length === 0,
		errors: allErrors,
	};
}

/**
 * Helper: Collect error messages for incomplete slots on a page.
 * A slot is complete when it has a value set or has a default.
 *
 * @param page - The flow page to validate
 * @param slotDefinitions - The harness slot definitions
 * @param slotValues - The current slot values
 * @returns Array of error messages for incomplete slots
 */
function collectPageSlotErrors(
	page: FlowPage,
	slotDefinitions: Record<
		string,
		{ label: string; type: string; default?: unknown }
	>,
	slotValues: Record<string, unknown>,
): string[] {
	const errors: string[] = [];

	// Collect all slot IDs from all sections
	for (const section of page.sections) {
		const slotIds = [...section.slots, ...(section.advanced ?? [])];

		// Check each slot in the section
		for (const slotId of slotIds) {
			const slotDef = slotDefinitions[slotId];
			if (!slotDef) continue;

			// Model slots must have a value set
			if (slotDef.type === "model") {
				const value = slotValues[slotId];
				if (!value) {
					const slotLabel = slotDef.label ?? slotId;
					errors.push(`Model required for ${slotLabel}`);
				}
			}
			// Other slot types can use defaults
		}
	}

	return errors;
}
