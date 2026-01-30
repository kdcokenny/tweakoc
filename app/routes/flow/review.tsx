import { useCallback, useEffect, useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { AdditionalSetupRequired } from "~/components/additional-setup-required";
import { CreateProfileModal } from "~/components/create-profile-modal";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { PrerequisiteGuard } from "~/components/wizard/prerequisite-guard";

import { createProfile } from "~/lib/api/client";
import { getSubmissionWithDefaults } from "~/lib/api/ref-resolver";
import type { GeneratedFile } from "~/lib/api/types";
import type { SlotDefinition } from "~/lib/harness-schema";
import {
	selectAllSlotValues,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import type { loader as flowLayoutLoader } from "./layout";

function SlotValueDisplay({
	slotDef,
	value,
	compact = false,
}: {
	slotDef: SlotDefinition;
	value: unknown;
	compact?: boolean;
}) {
	// For model slots, parse "providerId/modelId"
	if (slotDef.type === "model") {
		const modelValue = typeof value === "string" ? value : undefined;
		const modelParts = modelValue?.split("/") ?? [];
		const providerId = modelParts[0];
		const modelId = modelParts.slice(1).join("/");

		return (
			<div
				className={`flex items-center justify-between ${compact ? "text-sm" : ""}`}
			>
				<span
					className={compact ? "text-muted-foreground" : "text-sm font-medium"}
				>
					{compact ? slotDef.label : "Model"}
				</span>
				<span className="text-sm">
					{providerId}/{modelId}
				</span>
			</div>
		);
	}

	// For other slot types
	return (
		<div
			className={`flex items-center justify-between ${compact ? "text-sm" : ""}`}
		>
			<span
				className={compact ? "text-muted-foreground" : "text-sm font-medium"}
			>
				{slotDef.label}
			</span>
			<span className="text-sm">{String(value ?? "")}</span>
		</div>
	);
}

export default function ReviewStep() {
	const layoutData = useRouteLoaderData<typeof flowLayoutLoader>("flow-layout");

	const harnessId = layoutData?.harnessId;
	const harness = layoutData?.harness;
	const slotValues = useWizardStore(selectAllSlotValues);
	const providers = useWizardStore(selectProviders);
	const providersById = useWizardStore((s) => s.catalog.providersById);
	const setReviewStepHandler = useWizardStore((s) => s.setReviewStepHandler);
	const setReviewStepCreating = useWizardStore((s) => s.setReviewStepCreating);

	// Get display values with defaults
	const displayValues = harness
		? getSubmissionWithDefaults(harness, slotValues)
		: {};

	const [createdProfile, setCreatedProfile] = useState<{
		componentId: string;
		files: GeneratedFile[];
	} | null>(null);
	const [createError, setCreateError] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const handleCreateProfile = useCallback(async () => {
		// If already created, just open the modal
		if (createdProfile) {
			setModalOpen(true);
			return;
		}

		if (!harnessId || !harness) return;

		// Validate all model slots are complete
		const allSlotsComplete = Object.entries(harness.slots).every(
			([slotId, slotDef]) => {
				if (slotDef.type === "model") {
					return slotValues[slotId] !== undefined;
				}
				return true; // Non-model slots can use defaults
			},
		);
		if (!allSlotsComplete) return;

		setReviewStepCreating(true);
		setCreateError(null);

		try {
			const result = await createProfile({
				harnessId,
				slotValues,
			});

			setCreatedProfile({
				componentId: result.componentId,
				files: result.files,
			});
			setModalOpen(true);
		} catch (err) {
			setCreateError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setReviewStepCreating(false);
		}
	}, [createdProfile, harnessId, harness, slotValues, setReviewStepCreating]);

	// Register handler with wizard store
	useEffect(() => {
		setReviewStepHandler(handleCreateProfile);
		return () => setReviewStepHandler(undefined);
	}, [setReviewStepHandler, handleCreateProfile]);

	// Guard clause: no harness or no providers selected (Early Exit)
	if (!harnessId || !harness) return null;
	if (providers.length === 0) {
		return <PrerequisiteGuard requirement="providers" harnessId={harnessId} />;
	}

	return (
		<div className="flex flex-col gap-6 py-6">
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

				{/* Dynamic Slots grouped by flow structure */}
				{harness?.flow.map((page) => (
					<div key={page.id} className="space-y-3">
						{/* Page header with Edit link */}
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">{page.label}</h2>
							<Link
								to={`/flow/page/${page.id}`}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Edit
							</Link>
						</div>

						{/* Sections within this page */}
						<div className="space-y-3">
							{page.sections.map((section) => (
								<Card key={section.id} className="p-4">
									<div className="space-y-3">
										{/* Section title */}
										<div className="font-medium">{section.label}</div>

										{/* Main slots */}
										{section.slots.map((slotId) => {
											const slotDef = harness.slots[slotId];
											if (!slotDef) return null;
											const value = displayValues[slotId];

											return (
												<SlotValueDisplay
													key={slotId}
													slotDef={slotDef}
													value={value}
												/>
											);
										})}

										{/* Advanced slots */}
										{section.advanced && section.advanced.length > 0 && (
											<div className="space-y-2 pt-2 border-t">
												<div className="text-xs text-muted-foreground">
													Advanced
												</div>
												{section.advanced.map((slotId) => {
													const slotDef = harness.slots[slotId];
													if (!slotDef) return null;
													const value = displayValues[slotId];

													return (
														<SlotValueDisplay
															key={slotId}
															slotDef={slotDef}
															value={value}
															compact
														/>
													);
												})}
											</div>
										)}
									</div>
								</Card>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Additional Setup Required */}
			{(() => {
				// Get unique provider IDs from all model slots
				const usedProviderIds = [
					...new Set(
						Object.entries(harness?.slots ?? {})
							.filter(([_, slotDef]) => slotDef.type === "model")
							.map(([slotId]) => {
								const slotValue = slotValues[slotId];
								if (typeof slotValue === "string") {
									return slotValue.split("/")[0];
								}
								return undefined;
							})
							.filter((id): id is string => Boolean(id)),
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

			{/* Error message */}
			{createError && (
				<div className="text-sm text-destructive">
					Failed to create profile: {createError}
				</div>
			)}

			{/* Create Profile Modal */}
			<CreateProfileModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				componentId={createdProfile?.componentId}
				files={createdProfile?.files}
			/>
		</div>
	);
}
