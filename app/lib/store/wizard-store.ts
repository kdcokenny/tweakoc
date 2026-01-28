import { create } from "zustand";
import { fetchProviders } from "~/lib/api/client";
import type { ProviderSummary } from "~/lib/api/types";
import type { HarnessId } from "~/lib/wizard-config";

interface ModelSlot {
	providerId?: string;
	modelId?: string;
}

interface CatalogState {
	providersById: Record<string, ProviderSummary>;
	providersOrder: string[]; // sorted alphabetically by name
	status: "idle" | "loading" | "ready" | "error";
	error?: string;
}

interface WizardState {
	// Selections
	harnessId?: HarnessId;
	providers: string[]; // insertion order maintained
	primary: ModelSlot;
	secondary: ModelSlot;
	options: Record<string, boolean>;

	// Backtracking
	returnToStep?: "primary" | "secondary";

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
	setHarness: (id: HarnessId) => void;
	toggleProvider: (id: string) => void;
	setSlotProvider: (slot: "primary" | "secondary", providerId: string) => void;
	setSlotModel: (
		slot: "primary" | "secondary",
		modelId: string | undefined,
	) => void;
	setOption: (key: string, value: boolean) => void;

	// Backtracking
	setReturnToStep: (step?: "primary" | "secondary") => void;

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
	primary: {},
	secondary: {},
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
				primary: {},
				secondary: {},
				options: {},
				returnToStep: undefined,
				banner: undefined,
			});
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

		setSlotProvider: (slot, providerId) => {
			// Changing provider clears the model for that slot
			set({
				[slot]: { providerId, modelId: undefined },
			});
		},

		setSlotModel: (slot, modelId) => {
			const currentSlot = get()[slot];
			set({
				[slot]: { ...currentSlot, modelId },
			});
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
			const { primary, secondary } = get();

			let newPrimary = primary;
			let newSecondary = secondary;
			let bannerMessage: string | undefined;

			// Default provider = first in new selection (insertion order)
			const defaultProvider = nextProviders[0];

			// Check if primary slot used a removed provider
			if (primary.providerId && removed.includes(primary.providerId)) {
				newPrimary = { providerId: defaultProvider, modelId: undefined };
				bannerMessage = `Primary model was reset because ${primary.providerId} was removed.`;
			}

			// Check if secondary slot used a removed provider
			if (secondary.providerId && removed.includes(secondary.providerId)) {
				newSecondary = { providerId: defaultProvider, modelId: undefined };
				bannerMessage = bannerMessage
					? "Model selections were reset because providers were removed."
					: `Secondary model was reset because ${secondary.providerId} was removed.`;
			}

			set({
				providers: nextProviders,
				primary: newPrimary,
				secondary: newSecondary,
				banner: bannerMessage
					? {
							message: bannerMessage,
							dismissKey: `provider-removed-${Date.now()}`,
						}
					: undefined,
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
				primary: {},
				secondary: {},
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
export const selectPrimary = (state: WizardState) => state.primary;
export const selectSecondary = (state: WizardState) => state.secondary;
export const selectOptions = (state: WizardState) => state.options;
export const selectReturnToStep = (state: WizardState) => state.returnToStep;
export const selectBanner = (state: WizardState) => state.banner;

// Computed selectors
export const selectDefaultProvider = (state: WizardState) => state.providers[0];
export const selectHasProviders = (state: WizardState) =>
	state.providers.length > 0;
export const selectIsPrimaryComplete = (state: WizardState) =>
	!!state.primary.providerId && !!state.primary.modelId;
export const selectIsSecondaryComplete = (state: WizardState) =>
	!!state.secondary.providerId && !!state.secondary.modelId;

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
