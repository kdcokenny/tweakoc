import { create } from "zustand";
import type { HarnessId } from "~/lib/wizard-config";

interface ModelSlot {
	providerId?: string;
	modelId?: string;
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

	// Provider removal effects
	applyProviderChanges: (
		prevProviders: string[],
		nextProviders: string[],
	) => void;

	// Banner
	dismissBanner: () => void;

	// Reset
	reset: () => void;
}

const initialState: WizardState = {
	providers: [],
	primary: {},
	secondary: {},
	options: {},
};

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

		reset: () => {
			set(initialState);
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
