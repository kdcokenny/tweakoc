import { useState } from "react";
import { CreateProfileModal } from "~/components/create-profile-modal";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ViewFilesDialog } from "~/components/view-files-dialog";
import { useWizardGuard } from "~/lib/hooks";
import { getProviderById } from "~/lib/mock/catalog";
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

	const [viewFilesOpen, setViewFilesOpen] = useState(false);

	if (!allowed) return null;

	const harness = harnessId ? HARNESSES[harnessId] : null;
	const primaryProvider = primary.providerId
		? getProviderById(primary.providerId)
		: null;
	const secondaryProvider = secondary.providerId
		? getProviderById(secondary.providerId)
		: null;

	const enabledOptions = Object.entries(options)
		.filter(([_, v]) => v)
		.map(([k]) => k);

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

				{/* Providers */}
				<Card className="p-4">
					<div className="flex items-start justify-between">
						<span className="text-sm font-medium">Providers</span>
						<div className="flex flex-wrap gap-1 justify-end">
							{providers.map((id) => (
								<Badge key={id} variant="outline">
									{getProviderById(id)?.name ?? id}
								</Badge>
							))}
						</div>
					</div>
				</Card>

				{/* Primary Model */}
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Primary Model</span>
						<span className="text-sm">
							{primaryProvider?.name}/{primary.modelId}
						</span>
					</div>
				</Card>

				{/* Secondary Model */}
				<Card className="p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Secondary Model</span>
						<span className="text-sm">
							{secondaryProvider?.name}/{secondary.modelId}
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

			{/* Action buttons */}
			<div className="flex items-center justify-between pt-4">
				<Button variant="outline" onClick={() => setViewFilesOpen(true)}>
					View files
				</Button>
				<CreateProfileModal onViewFiles={() => setViewFilesOpen(true)}>
					<Button size="lg">Create Profile</Button>
				</CreateProfileModal>
			</div>

			{/* View Files Dialog */}
			<ViewFilesDialog open={viewFilesOpen} onOpenChange={setViewFilesOpen} />
		</div>
	);
}
