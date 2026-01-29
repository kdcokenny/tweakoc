import { ModelSlot } from "~/components/model-slot";
import { PropertyControl } from "~/components/property-control";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { HarnessSlot } from "~/lib/harness-schema";
import { isConfigurableProperty } from "~/lib/harness-schema";
import { useWizardStore } from "~/lib/store/wizard-store";

interface SlotCardProps {
	slotId: string;
	slot: HarnessSlot;
}

export function SlotCard({ slotId, slot }: SlotCardProps) {
	const setSlotProperty = useWizardStore((state) => state.setSlotProperty);
	const slotData = useWizardStore((state) => state.slots[slotId] ?? {});

	// Separate model property from other properties
	const modelProperty = slot.properties.model;
	const otherProperties = Object.entries(slot.properties).filter(
		([key]) => key !== "model",
	);

	// Determine which properties are in advanced group
	const advancedGroup = slot.advancedGroup;
	const advancedPropSet = new Set(advancedGroup?.properties ?? []);

	// Split configurable properties into basic and advanced
	const basicProperties = otherProperties.filter(
		([key, prop]) => isConfigurableProperty(prop) && !advancedPropSet.has(key),
	);

	const advancedProperties = otherProperties.filter(
		([key, prop]) => isConfigurableProperty(prop) && advancedPropSet.has(key),
	);

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>{slot.label}</CardTitle>
				{slot.description && (
					<CardDescription>{slot.description}</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Model selector (if configurable) */}
				{modelProperty && isConfigurableProperty(modelProperty) && (
					<ModelSlot slotId={slotId} />
				)}

				{/* Basic configurable properties */}
				{basicProperties.map(([propertyName, property]) => (
					<PropertyControl
						key={propertyName}
						propertyName={propertyName}
						property={property}
						value={slotData[propertyName]}
						onChange={(value) => setSlotProperty(slotId, propertyName, value)}
					/>
				))}

				{/* Advanced group accordion */}
				{advancedGroup &&
					advancedProperties.length > 0 &&
					(advancedGroup.collapsible ? (
						<details
							open={!advancedGroup.collapsed}
							className="rounded-lg border border-zinc-200 dark:border-zinc-700"
						>
							<summary className="cursor-pointer px-4 py-2 font-medium text-sm text-zinc-700 dark:text-zinc-300">
								{advancedGroup.label ?? "Advanced"}
							</summary>
							<div className="px-4 pb-4 pt-2 space-y-4">
								{advancedProperties.map(([propertyName, property]) => (
									<PropertyControl
										key={propertyName}
										propertyName={propertyName}
										property={property}
										value={slotData[propertyName]}
										onChange={(value) =>
											setSlotProperty(slotId, propertyName, value)
										}
									/>
								))}
							</div>
						</details>
					) : (
						<div className="space-y-4">
							{advancedProperties.map(([propertyName, property]) => (
								<PropertyControl
									key={propertyName}
									propertyName={propertyName}
									property={property}
									value={slotData[propertyName]}
									onChange={(value) =>
										setSlotProperty(slotId, propertyName, value)
									}
								/>
							))}
						</div>
					))}
			</CardContent>
		</Card>
	);
}
