"use client";

import { useMemo } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { getProviderById } from "~/lib/mock/catalog";
import { ROUTES } from "~/lib/routes";
import {
	selectDefaultProvider,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { ModelPicker } from "./model-picker";

interface ModelSlotProps {
	slot: "primary" | "secondary";
	title: string;
	description: string;
}

export function ModelSlot({ slot }: ModelSlotProps) {
	const providers = useWizardStore(selectProviders);
	const defaultProvider = useWizardStore(selectDefaultProvider);
	const slotData = useWizardStore((s) => s[slot]);
	const setSlotProvider = useWizardStore((s) => s.setSlotProvider);
	const setSlotModel = useWizardStore((s) => s.setSlotModel);
	const setReturnToStep = useWizardStore((s) => s.setReturnToStep);
	const banner = useWizardStore((s) => s.banner);
	const dismissBanner = useWizardStore((s) => s.dismissBanner);

	// Current provider (defaults to first selected if not set)
	const currentProviderId = slotData.providerId ?? defaultProvider;

	// Sort providers alphabetically for display
	const sortedProviders = useMemo(() => {
		return [...providers]
			.map((id) => getProviderById(id))
			.filter(Boolean)
			.sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
	}, [providers]);

	const handleProviderChange = (providerId: string | null) => {
		if (providerId) {
			setSlotProvider(slot, providerId);
		}
	};

	const handleModelChange = (modelId: string) => {
		// Ensure provider is set before model
		if (!slotData.providerId && currentProviderId) {
			setSlotProvider(slot, currentProviderId);
		}
		setSlotModel(slot, modelId);
	};

	const handleEditProviders = () => {
		setReturnToStep(slot);
	};

	const showProviderDropdown = providers.length > 1;

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
							<SelectValue placeholder="Select provider" />
						</SelectTrigger>
						<SelectContent>
							{sortedProviders.map((provider) => (
								<SelectItem key={provider?.id} value={provider?.id}>
									<div className="flex items-center gap-2">
										<span>{provider?.name}</span>
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
						{getProviderById(currentProviderId ?? "")?.name ?? "None selected"}
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
						onClear={() => setSlotModel(slot, undefined)}
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
						{getProviderById(currentProviderId)?.envHints.join(", ")}
					</div>
				)}
			</div>
		</div>
	);
}
