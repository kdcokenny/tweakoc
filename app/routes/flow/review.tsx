import { useState } from "react";
import { AdditionalSetupRequired } from "~/components/additional-setup-required";
import { CreateProfileModal } from "~/components/create-profile-modal";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ViewFilesDialog } from "~/components/view-files-dialog";
import { createProfile } from "~/lib/api/client";
import type { GeneratedFile } from "~/lib/api/types";
import { useWizardGuard } from "~/lib/hooks";
import {
	selectHarnessId,
	selectOptions,
	selectPrimary,
	selectProviders,
	selectSecondary,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { HARNESSES } from "~/lib/wizard-config";

export default function ReviewStep() {
	const { allowed } = useWizardGuard({
		harness: true,
		providers: true,
		primaryComplete: true,
		secondaryComplete: true,
	});

	const harnessId = useWizardStore(selectHarnessId);
	const providers = useWizardStore(selectProviders);
	const primary = useWizardStore(selectPrimary);
	const secondary = useWizardStore(selectSecondary);
	const options = useWizardStore(selectOptions);
	const providersById = useWizardStore((s) => s.catalog.providersById);

	const [viewFilesOpen, setViewFilesOpen] = useState(false);
	const [createdProfile, setCreatedProfile] = useState<{
		componentId: string;
		files: GeneratedFile[];
	} | null>(null);
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	if (!allowed) return null;

	const harness = harnessId ? HARNESSES[harnessId] : null;

	const enabledOptions = Object.entries(options)
		.filter(([_, v]) => v)
		.map(([k]) => k);

	const handleCreateProfile = async () => {
		if (!harnessId || !primary.providerId || !primary.modelId) return;
		if (!secondary.providerId || !secondary.modelId) return;

		setCreating(true);
		setCreateError(null);

		try {
			const result = await createProfile({
				harnessId,
				providers,
				primary: {
					providerId: primary.providerId,
					modelId: primary.modelId,
				},
				secondary: {
					providerId: secondary.providerId,
					modelId: secondary.modelId,
				},
				options: {
					context7: options.context7,
					renameWindow: options.renameWindow,
				},
			});

			setCreatedProfile({
				componentId: result.componentId,
				files: result.files,
			});
		} catch (err) {
			setCreateError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Review</h1>
				<p className="text-muted-foreground mt-1">
					Review your configuration before creating your profile.
				</p>
			</div>

			{/* Configuration summary */}
			<div className="flex flex-col gap-4">
				{/* Harness */}
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Harness</span>
						<Badge variant="secondary">{harness?.name ?? "Unknown"}</Badge>
					</div>
				</Card>

				{/* Primary Model */}
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Primary Model</span>
						<span className="text-sm">
							{providersById[primary.providerId ?? ""]?.name ??
								primary.providerId}
							/{primary.modelId}
						</span>
					</div>
				</Card>

				{/* Secondary Model */}
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Secondary Model</span>
						<span className="text-sm">
							{providersById[secondary.providerId ?? ""]?.name ??
								secondary.providerId}
							/{secondary.modelId}
						</span>
					</div>
				</Card>

				{/* Options (if any) */}
				{enabledOptions.length > 0 && (
					<Card className="p-4">
						<div className="flex items-start justify-between">
							<span className="text-sm font-medium">Options</span>
							<div className="flex flex-wrap gap-1 justify-end">
								{enabledOptions.map((opt) => (
									<Badge key={opt} variant="outline">
										{opt}
									</Badge>
								))}
							</div>
						</div>
					</Card>
				)}
			</div>

			{/* Additional Setup Required */}
			{(() => {
				// Get unique provider IDs from model slots
				const usedProviderIds = [
					...new Set(
						[primary?.providerId, secondary?.providerId].filter(
							(id): id is string => Boolean(id),
						),
					),
				];

				// Map to provider data
				const usedProviders = usedProviderIds
					.map((id) => providersById[id])
					.filter(Boolean)
					.map((p) => ({
						id: p.id,
						name: p.name,
						docUrl: p.docUrl,
					}));

				return <AdditionalSetupRequired providers={usedProviders} />;
			})()}

			{/* Action buttons */}
			<div className="flex items-center justify-between pt-4">
				<Button variant="outline" onClick={() => setViewFilesOpen(true)}>
					View files
				</Button>
				{createdProfile ? (
					<CreateProfileModal
						componentId={createdProfile.componentId}
						onViewFiles={() => setViewFilesOpen(true)}
					>
						<Button size="lg">View Install Instructions</Button>
					</CreateProfileModal>
				) : (
					<Button size="lg" onClick={handleCreateProfile} disabled={creating}>
						{creating ? "Creating..." : "Create Profile"}
					</Button>
				)}
			</div>

			{/* Error message */}
			{createError && (
				<div className="text-sm text-destructive">
					Failed to create profile: {createError}
				</div>
			)}

			{/* View Files Dialog */}
			<ViewFilesDialog
				open={viewFilesOpen}
				onOpenChange={setViewFilesOpen}
				files={createdProfile?.files}
			/>
		</div>
	);
}
