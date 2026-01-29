import { create } from "zustand";
import { fetchProviders } from "~/lib/api/client";
import type { ProviderSummary } from "~/lib/api/types";
import { getHarness } from "~/lib/harness-registry";
import { validateStep } from "~/lib/wizard-validation";
import type { StepId } from "../wizard-step-id";

interface CatalogState {
	providersById: Record<string, ProviderSummary>;
	providersOrder: string[]; // sorted alphabetically by name
	status: "idle" | "loading" | "ready" | "error";
	error?: string;
}

interface FocusBannerRequest {
	id: number;
	targetStepId: StepId;
}

interface WizardState {
	// Selections
	harnessId?: string;
	providers: string[]; // insertion order maintained
	slotValues: Record<string, unknown>; // slotId → value directly

	// Backtracking
	returnToStep?: string;

	// Calm banner (for provider removal effects)
	banner?: { message: string; dismissKey: string };

	// Provider catalog (loaded from API)
	catalog: CatalogState;

	// Review step handler and state
	reviewStepHandler?: () => void | Promise<void>;
	reviewStepCreating?: boolean;

	// Submit-attempt validation state
	attemptedByStepId: Partial<Record<StepId, true>>;
	focusBannerRequest: FocusBannerRequest | null;
	lastHandledFocusBannerRequestId: number;
	focusBannerRequestCounter: number;
}

interface WizardActions {
	// Core actions
	setHarness: (id: string) => void;
	toggleProvider: (id: string) => void;

	// Initialize slots from harness config
	initializeSlotsFromHarness: () => void;

	// Set a slot value directly
	setSlotValue: (slotId: string, value: unknown) => void;

	// Clear a specific slot
	clearSlot: (slotId: string) => void;

	// Backtracking
	setReturnToStep: (step?: string) => void;

	// Review step handler
	setReviewStepHandler: (handler?: () => void | Promise<void>) => void;
	setReviewStepCreating: (creating: boolean) => void;

	// Banner
	dismissBanner: () => void;

	// Provider changes
	applyProviderChanges: (
		prevProviders: string[],
		nextProviders: string[],
	) => void;

	// Catalog loading
	ensureProvidersLoaded: () => Promise<void>;

	// Submit-attempt validation actions
	markStepAttempted: (stepId: StepId) => void;
	requestBannerFocus: (targetStepId: StepId) => void;
	consumeFocusRequest: (requestId: number) => void;
	clearAttempted: () => void;

	// Reset
	reset: () => void;
}

const initialState: WizardState = {
	providers: [],
	slotValues: {},
	catalog: {
		providersById: {},
		providersOrder: [],
		status: "idle",
	},
	attemptedByStepId: {},
	focusBannerRequest: null,
	lastHandledFocusBannerRequestId: 0,
	focusBannerRequestCounter: 0,
};

// Module-level for stampede protection - NOT part of store state
let _catalogInFlight: Promise<void> | null = null;

export const useWizardStore = create<WizardState & WizardActions>(
	(set, get) => ({
		...initialState,

		setHarness: (id) => {
			// Setting harness clears all downstream selections
			set({
				harnessId: id,
				providers: [],
				slotValues: {},
				returnToStep: undefined,
				banner: undefined,
			});
			// Initialize slots from harness config
			get().initializeSlotsFromHarness();
		},

		initializeSlotsFromHarness: () => {
			const { harnessId } = get();
			if (!harnessId) return;

			const harness = getHarness(harnessId);
			if (!harness) return;

			// Initialize slot values with defaults
			const slotValues: Record<string, unknown> = {};
			for (const [slotId, slotDef] of Object.entries(harness.slots)) {
				if (slotDef.default !== undefined) {
					slotValues[slotId] = slotDef.default;
				}
			}

			set({ slotValues });
		},

		toggleProvider: (id) => {
			const { providers } = get();
			const isSelected = providers.includes(id);

			if (isSelected) {
				// Remove provider
				const nextProviders = providers.filter((p) => p !== id);
				get().applyProviderChanges(providers, nextProviders);
			} else {
				// Add provider (maintain insertion order)
				set({ providers: [...providers, id] });
			}
		},

		setSlotValue: (slotId, value) => {
			set((state) => ({
				slotValues: {
					...state.slotValues,
					[slotId]: value,
				},
			}));
		},

		clearSlot: (slotId) => {
			set((state) => {
				const { [slotId]: _, ...rest } = state.slotValues;
				return { slotValues: rest };
			});
		},

		setReturnToStep: (step) => {
			set({ returnToStep: step });
		},

		setReviewStepHandler: (handler) => {
			set({ reviewStepHandler: handler });
		},

		setReviewStepCreating: (creating) => {
			set({ reviewStepCreating: creating });
		},

		applyProviderChanges: (prevProviders, nextProviders) => {
			const removed = prevProviders.filter((p) => !nextProviders.includes(p));
			const { slotValues, harnessId } = get();

			if (!harnessId) {
				set({ providers: nextProviders });
				return;
			}

			const harness = getHarness(harnessId);
			if (!harness) {
				set({ providers: nextProviders });
				return;
			}

			// Clear model slots that reference removed providers
			const updatedSlotValues = { ...slotValues };
			for (const [slotId, slotDef] of Object.entries(harness.slots)) {
				if (slotDef.type === "model") {
					const value = updatedSlotValues[slotId];
					if (typeof value === "string") {
						const providerId = value.split("/")[0];
						if (removed.includes(providerId)) {
							delete updatedSlotValues[slotId];
						}
					}
				}
			}

			set({
				providers: nextProviders,
				slotValues: updatedSlotValues,
			});
		},

		dismissBanner: () => {
			set({ banner: undefined });
		},

		ensureProvidersLoaded: async () => {
			const { catalog } = get();

			// Guard: already ready
			if (catalog.status === "ready") return;

			// Guard: already loading - await existing promise
			if (catalog.status === "loading" && _catalogInFlight) {
				return _catalogInFlight;
			}

			// Set loading BEFORE creating promise (synchronous)
			set({ catalog: { ...catalog, status: "loading", error: undefined } });

			_catalogInFlight = (async () => {
				try {
					const response = await fetchProviders();

					// Normalize at boundary - parse, don't validate
					const providersById: Record<string, ProviderSummary> = {};
					for (const p of response.providers) {
						if (!p.id || !p.name) {
							console.error("Skipping invalid provider:", p);
							continue;
						}
						providersById[p.id] = p;
					}

					// Sort by display name for consistent ordering
					const providersOrder = Object.values(providersById)
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((p) => p.id);

					set({
						catalog: {
							providersById,
							providersOrder,
							status: "ready",
							error: undefined,
						},
					});
				} catch (error) {
					set({
						catalog: {
							...get().catalog,
							status: "error",
							error:
								error instanceof Error
									? error.message
									: "Failed to load providers",
						},
					});
				} finally {
					_catalogInFlight = null; // Always clear for retry
				}
			})();

			return _catalogInFlight;
		},

		markStepAttempted: (stepId: StepId) =>
			set((state) => ({
				attemptedByStepId: { ...state.attemptedByStepId, [stepId]: true },
			})),

		requestBannerFocus: (targetStepId: StepId) =>
			set((state) => {
				const newId = state.focusBannerRequestCounter + 1;
				return {
					focusBannerRequestCounter: newId,
					focusBannerRequest: { id: newId, targetStepId },
				};
			}),

		consumeFocusRequest: (requestId: number) =>
			set((state) => ({
				lastHandledFocusBannerRequestId: Math.max(
					state.lastHandledFocusBannerRequestId,
					requestId,
				),
				focusBannerRequest:
					state.focusBannerRequest?.id === requestId
						? null
						: state.focusBannerRequest,
			})),

		clearAttempted: () => set({ attemptedByStepId: {} }),

		reset: () => {
			set({
				harnessId: undefined,
				providers: [],
				slotValues: {},
				returnToStep: undefined,
				banner: undefined,
				attemptedByStepId: {},
				focusBannerRequest: null,
				lastHandledFocusBannerRequestId: 0,
				focusBannerRequestCounter: 0,
				// Note: catalog is NOT reset - it's cached data
			});
		},
	}),
);

// Selectors for common access patterns
export const selectHarnessId = (state: WizardState) => state.harnessId;
export const selectProviders = (state: WizardState) => state.providers;
export const selectReturnToStep = (state: WizardState) => state.returnToStep;
export const selectBanner = (state: WizardState) => state.banner;

// Slot selectors
// Select a specific slot value
export const selectSlotValue = (slotId: string) => (state: WizardState) =>
	state.slotValues[slotId];

// Select all slot values
export const selectAllSlotValues = (state: WizardState) => state.slotValues;

// Check if a slot has a value
export const selectIsSlotComplete =
	(slotId: string) => (state: WizardState) => {
		return state.slotValues[slotId] !== undefined;
	};

// Check if all slots are complete
export const selectAreAllSlotsComplete = (state: WizardState) => {
	const harnessId = state.harnessId;
	if (!harnessId) return false;

	const harness = getHarness(harnessId);
	if (!harness) return false;

	// Check each model slot has a value
	return Object.entries(harness.slots).every(([slotId, slotDef]) => {
		if (slotDef.type === "model") {
			return state.slotValues[slotId] !== undefined;
		}
		// Non-model slots can use defaults
		return (
			state.slotValues[slotId] !== undefined || slotDef.default !== undefined
		);
	});
};

// Computed selectors
export const selectDefaultProvider = (state: WizardState) => state.providers[0];
export const selectHasProviders = (state: WizardState) =>
	state.providers.length > 0;

// Catalog selectors - MUST return stable references (no .map/.filter in selectors!)
export const selectCatalogStatus = (state: WizardState & WizardActions) =>
	state.catalog.status;
export const selectCatalogError = (state: WizardState & WizardActions) =>
	state.catalog.error;

// Stable selectors - return raw store references
export const selectCatalogProviderIds = (state: WizardState & WizardActions) =>
	state.catalog.providersOrder;
export const selectCatalogProvidersById = (
	state: WizardState & WizardActions,
) => state.catalog.providersById;

export const selectProviderById =
	(id: string) => (state: WizardState & WizardActions) =>
		state.catalog.providersById[id];

// Validation selector - computes step validity on demand
export const selectIsStepValid = (stepId: string) => (state: WizardState) => {
	const { isValid } = validateStep(stepId, {
		harnessId: state.harnessId,
		providers: state.providers,
		slotValues: state.slotValues,
	});
	return isValid;
};

// Submit-attempt validation selector
export const selectIsStepAttempted = (stepId: StepId) => (state: WizardState) =>
	!!state.attemptedByStepId[stepId];
