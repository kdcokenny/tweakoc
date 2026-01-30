import { useEffect, useMemo } from "react";
import { href, Link, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Field, FieldLabel } from "~/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { createAPIModelLoader } from "~/lib/api/client";
import type { ProviderSummary } from "~/lib/api/types";
import {
	selectDefaultProvider,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { ModelPicker } from "./model-picker";

interface ModelSlotProps {
	slotId: string;
	showError?: boolean;
}

export function ModelSlot({ slotId, showError }: ModelSlotProps) {
	const { harnessId } = useParams<{ harnessId?: string }>();
	const providers = useWizardStore(selectProviders);
	const defaultProvider = useWizardStore(selectDefaultProvider);
	const slotValue = useWizardStore((s) => s.slotValues[slotId]);
	const setSlotValue = useWizardStore((s) => s.setSlotValue);
	const setReturnToStep = useWizardStore((s) => s.setReturnToStep);
	const banner = useWizardStore((s) => s.banner);
	const dismissBanner = useWizardStore((s) => s.dismissBanner);
	const providersById = useWizardStore((s) => s.catalog.providersById);
	const ensureProvidersLoaded = useWizardStore((s) => s.ensureProvidersLoaded);

	// Defensive load - idempotent if already loaded
	useEffect(() => {
		void ensureProvidersLoaded();
	}, [ensureProvidersLoaded]);

	// Extract model value (format: "providerId/modelId")
	const modelValue = typeof slotValue === "string" ? slotValue : undefined;
	const modelParts = modelValue?.split("/") ?? [];
	const providerId = modelParts[0] || defaultProvider;
	const modelId = modelParts.slice(1).join("/") || undefined;

	// Map selected providers - keep unknown ones visible with warning!
	interface UIProvider extends ProviderSummary {
		isUnknown?: boolean;
	}

	const sortedProviders = useMemo((): UIProvider[] => {
		return providers
			.map((id): UIProvider => {
				const provider = providersById[id];
				if (provider) {
					return { ...provider, isUnknown: false };
				}
				// Unknown provider - don't drop, show with warning
				return {
					id,
					name: `Unknown provider (${id})`,
					authType: "unknown",
					envHints: [],
					modelCount: 0,
					isUnknown: true,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [providers, providersById]);

	const handleProviderChange = (newProviderId: string | null) => {
		if (!newProviderId) return;
		// Clear the model when provider changes
		setSlotValue(slotId, `${newProviderId}/`);
	};

	const handleModelChange = (newModelId: string) => {
		// Format: "providerId/modelId"
		setSlotValue(slotId, `${providerId}/${newModelId}`);
	};

	const handleEditProviders = () => {
		setReturnToStep(slotId);
	};

	const showProviderDropdown = providers.length > 1;

	// Memoize model loader to prevent recreation on every render
	const modelLoader = useMemo(
		() => createAPIModelLoader(providerId),
		[providerId],
	);

	return (
		<div className="flex flex-col gap-4">
			{/* Banner for provider removal effects */}
			{banner && (
				<div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
					<span>{banner.message}</span>
					<button
						type="button"
						onClick={dismissBanner}
						className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Provider dropdown (hidden if only one provider) */}
			{showProviderDropdown ? (
				<Field>
					<FieldLabel htmlFor={`${slotId}-provider`}>Provider</FieldLabel>
					<Select value={providerId} onValueChange={handleProviderChange}>
						<SelectTrigger id={`${slotId}-provider`}>
							<SelectValue>
								{providerId
									? (providersById[providerId]?.name ?? providerId)
									: "Select provider"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{sortedProviders.map((provider) => (
								<SelectItem
									key={provider.id}
									value={provider.id}
									disabled={provider.isUnknown}
									className={
										provider.isUnknown ? "text-muted-foreground" : undefined
									}
								>
									<div className="flex items-center gap-2">
										<span>{provider.name}</span>
										{provider.isUnknown && (
											<span className="text-xs text-amber-500">
												(unavailable)
											</span>
										)}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			) : (
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Provider:</span>
					<Badge variant="secondary">
						{providersById[providerId ?? ""]?.name ??
							providerId ??
							"None selected"}
					</Badge>
				</div>
			)}

			{/* Model picker */}
			<Field>
				<FieldLabel htmlFor={`${slotId}-model`}>Model</FieldLabel>
				{providerId ? (
					<ModelPicker
						providerId={providerId}
						value={modelId}
						onChange={handleModelChange}
						onClear={() => setSlotValue(slotId, undefined)}
						loader={modelLoader}
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						Select a provider first
					</p>
				)}
				{/* Inline error when model required but not selected */}
				{showError && !modelValue && (
					<p className="text-sm text-destructive">Please select a model</p>
				)}
			</Field>

			{/* Edit providers link */}
			<div className="flex items-center justify-between">
				{harnessId && (
					<Link
						to={href("/flow/:harnessId/providers", { harnessId })}
						onClick={handleEditProviders}
						className="text-sm text-primary hover:underline"
					>
						Edit providers
					</Link>
				)}

				{/* Env var hints */}
				{providerId && (
					<div className="text-xs text-muted-foreground">
						{providersById[providerId]?.envHints.join(", ")}
					</div>
				)}
			</div>
		</div>
	);
}
