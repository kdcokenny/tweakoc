"use client";

import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { createAPIModelLoader } from "~/lib/api/client";
import type { ProviderSummary } from "~/lib/api/types";
import { ROUTES } from "~/lib/routes";
import {
	selectDefaultProvider,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { ModelPicker } from "./model-picker";

interface ModelSlotProps {
	slotId: string;
}

export function ModelSlot({ slotId }: ModelSlotProps) {
	const providers = useWizardStore(selectProviders);
	const defaultProvider = useWizardStore(selectDefaultProvider);
	const slotData = useWizardStore((s) => s.slots[slotId]);
	const setSlotProvider = useWizardStore((s) => s.setSlotProvider);
	const setSlotModel = useWizardStore((s) => s.setSlotModel);
	const setReturnToStep = useWizardStore((s) => s.setReturnToStep);
	const banner = useWizardStore((s) => s.banner);
	const dismissBanner = useWizardStore((s) => s.dismissBanner);
	const providersById = useWizardStore((s) => s.catalog.providersById);
	const ensureProvidersLoaded = useWizardStore((s) => s.ensureProvidersLoaded);

	// Defensive load - idempotent if already loaded
	useEffect(() => {
		void ensureProvidersLoaded();
	}, [ensureProvidersLoaded]);

	// Current provider (defaults to first selected if not set)
	const currentProviderId = slotData.providerId ?? defaultProvider;

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

	const handleProviderChange = (providerId: string | null) => {
		if (providerId) {
			setSlotProvider(slotId, providerId);
		}
	};

	const handleModelChange = (modelId: string) => {
		// Ensure provider is set before model
		if (!slotData.providerId && currentProviderId) {
			setSlotProvider(slotId, currentProviderId);
		}
		setSlotModel(slotId, modelId);
	};

	const handleEditProviders = () => {
		setReturnToStep(slotId);
	};

	const showProviderDropdown = providers.length > 1;

	// Memoize model loader to prevent recreation on every render
	const modelLoader = useMemo(
		() => createAPIModelLoader(currentProviderId),
		[currentProviderId],
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
				<div className="flex flex-col gap-2">
					<div className="text-sm font-medium">Provider</div>
					<Select
						value={currentProviderId}
						onValueChange={handleProviderChange}
					>
						<SelectTrigger>
							<SelectValue>
								{currentProviderId
									? (providersById[currentProviderId]?.name ??
										currentProviderId)
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
				</div>
			) : (
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Provider:</span>
					<Badge variant="secondary">
						{providersById[currentProviderId ?? ""]?.name ??
							currentProviderId ??
							"None selected"}
					</Badge>
				</div>
			)}

			{/* Model picker */}
			<div className="flex flex-col gap-2">
				<div className="text-sm font-medium">Model</div>
				{currentProviderId ? (
					<ModelPicker
						providerId={currentProviderId}
						value={slotData.modelId}
						onChange={handleModelChange}
						onClear={() => setSlotModel(slotId, undefined)}
						loader={modelLoader}
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						Select a provider first
					</p>
				)}
			</div>

			{/* Edit providers link */}
			<div className="flex items-center justify-between">
				<Link
					to={ROUTES.flow.providers}
					onClick={handleEditProviders}
					className="text-sm text-primary hover:underline"
				>
					Edit providers
				</Link>

				{/* Env var hints */}
				{currentProviderId && (
					<div className="text-xs text-muted-foreground">
						{providersById[currentProviderId]?.envHints.join(", ")}
					</div>
				)}
			</div>
		</div>
	);
}
