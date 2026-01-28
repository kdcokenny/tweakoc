import { create } from "zustand";
import { fetchProviders } from "~/lib/api/client";
import type { ProviderSummary } from "~/lib/api/types";
import { getHarness } from "~/lib/harness-registry";

interface CatalogState {
	providersById: Record<string, ProviderSummary>;
	providersOrder: string[]; // sorted alphabetically by name
	status: "idle" | "loading" | "ready" | "error";
	error?: string;
}

interface WizardState {
	// Selections
	harnessId?: string;
	providers: string[]; // insertion order maintained
	slots: Record<string, { providerId?: string; modelId?: string }>;
	options: Record<string, unknown>;

	// Backtracking
	returnToStep?: string;

	// Calm banner (for provider removal effects)
	banner?: { message: string; dismissKey: string };

	// Provider catalog (loaded from API)
	catalog: CatalogState;

	// Review step handler and state
	reviewStepHandler?: () => void | Promise<void>;
	reviewStepCreating?: boolean;
}

interface WizardActions {
	// Core actions
	setHarness: (id: string) => void;
	toggleProvider: (id: string) => void;

	// Initialize slots from harness config
	initializeSlotsFromHarness: () => void;

	// Set slot provider (dynamic slot ID)
	setSlotProvider: (slotId: string, providerId: string) => void;

	// Set slot model (dynamic slot ID)
	setSlotModel: (slotId: string, modelId: string | undefined) => void;

	// Clear a specific slot
	clearSlot: (slotId: string) => void;

	setOption: (key: string, value: unknown) => void;

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

	// Reset
	reset: () => void;
}

const initialState: WizardState = {
	providers: [],
	slots: {},
	options: {},
	catalog: {
		providersById: {},
		providersOrder: [],
		status: "idle",
	},
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
				slots: {},
				options: {},
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

			// Create empty slot for each harness slot
			const slots: Record<string, { providerId?: string; modelId?: string }> =
				{};
			for (const slot of harness.slots) {
				slots[slot.id] = { providerId: undefined, modelId: undefined };
			}

			set({ slots });
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

		setSlotProvider: (slotId, providerId) => {
			set((state) => ({
				slots: {
					...state.slots,
					[slotId]: {
						...state.slots[slotId],
						providerId,
						modelId: undefined, // Clear model when provider changes
					},
				},
			}));
		},

		setSlotModel: (slotId, modelId) => {
			set((state) => ({
				slots: {
					...state.slots,
					[slotId]: {
						...state.slots[slotId],
						modelId,
					},
				},
			}));
		},

		clearSlot: (slotId) => {
			set((state) => ({
				slots: {
					...state.slots,
					[slotId]: { providerId: undefined, modelId: undefined },
				},
			}));
		},

		setOption: (key, value) => {
			set((state) => ({
				options: { ...state.options, [key]: value },
			}));
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
			const { slots } = get();

			// Clear slots that reference removed providers
			const updatedSlots = { ...slots };
			for (const [slotId, slot] of Object.entries(updatedSlots)) {
				if (slot.providerId && removed.includes(slot.providerId)) {
					updatedSlots[slotId] = { providerId: undefined, modelId: undefined };
				}
			}

			set({
				providers: nextProviders,
				slots: updatedSlots,
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

		reset: () => {
			set({
				harnessId: undefined,
				providers: [],
				slots: {},
				options: {},
				returnToStep: undefined,
				banner: undefined,
				// Note: catalog is NOT reset - it's cached data
			});
		},
	}),
);

// Selectors for common access patterns
export const selectHarnessId = (state: WizardState) => state.harnessId;
export const selectProviders = (state: WizardState) => state.providers;
export const selectOptions = (state: WizardState) => state.options;
export const selectReturnToStep = (state: WizardState) => state.returnToStep;
export const selectBanner = (state: WizardState) => state.banner;

// Slot selectors
// Select a specific slot
export const selectSlot = (slotId: string) => (state: WizardState) =>
	state.slots[slotId];

// Select all slots
export const selectAllSlots = (state: WizardState) => state.slots;

// Check if a slot is complete (has both provider and model)
export const selectIsSlotComplete =
	(slotId: string) => (state: WizardState) => {
		const slot = state.slots[slotId];
		return Boolean(slot?.providerId && slot?.modelId);
	};

// Check if all slots are complete
export const selectAreAllSlotsComplete = (state: WizardState) => {
	const harnessId = state.harnessId;
	if (!harnessId) return false;

	const harness = getHarness(harnessId);
	if (!harness) return false;

	return harness.slots.every((slot) => {
		const slotData = state.slots[slot.id];
		return slotData?.providerId && slotData?.modelId;
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
