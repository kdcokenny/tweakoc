import { ModelSlot } from "~/components/model-slot";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { SlotDefinition } from "~/lib/harness-schema";
import { useWizardStore } from "~/lib/store/wizard-store";

interface SlotCardProps {
	slotId: string;
	slot: SlotDefinition;
	showErrors?: boolean;
}

export function SlotCard({ slotId, slot, showErrors = false }: SlotCardProps) {
	const setSlotValue = useWizardStore((state) => state.setSlotValue);
	const slotValue = useWizardStore((state) => state.slotValues[slotId]);

	// For model slots, the value is the model ID string
	const modelValue =
		slot.type === "model" ? (slotValue as string | undefined) : undefined;

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>{slot.label}</CardTitle>
				{slot.description && (
					<CardDescription>{slot.description}</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Model selector (if this is a model slot) */}
				{slot.type === "model" && (
					<ModelSlot slotId={slotId} showError={showErrors && !modelValue} />
				)}

				{/* For non-model slots, render value controls */}
				{slot.type === "number" && (
					<div className="flex flex-col gap-2">
						<label htmlFor={slotId} className="text-sm font-medium">
							Value
						</label>
						<input
							id={slotId}
							type="number"
							value={(slotValue as number) ?? slot.default ?? 0}
							onChange={(e) => setSlotValue(slotId, Number(e.target.value))}
							min={slot.min}
							max={slot.max}
							step={slot.step}
							className="border rounded px-3 py-2"
						/>
					</div>
				)}

				{slot.type === "enum" && (
					<div className="flex flex-col gap-2">
						<label htmlFor={slotId} className="text-sm font-medium">
							Value
						</label>
						<select
							id={slotId}
							value={(slotValue as string) ?? slot.default ?? ""}
							onChange={(e) => setSlotValue(slotId, e.target.value)}
							className="border rounded px-3 py-2"
						>
							{slot.options.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>
				)}

				{slot.type === "boolean" && (
					<div className="flex items-center gap-2">
						<input
							id={slotId}
							type="checkbox"
							checked={(slotValue as boolean) ?? slot.default ?? false}
							onChange={(e) => setSlotValue(slotId, e.target.checked)}
							className="h-4 w-4"
						/>
						<label htmlFor={slotId} className="text-sm font-medium">
							Enabled
						</label>
					</div>
				)}

				{slot.type === "text" && (
					<div className="flex flex-col gap-2">
						<label htmlFor={slotId} className="text-sm font-medium">
							Value
						</label>
						<input
							id={slotId}
							type="text"
							value={(slotValue as string) ?? slot.default ?? ""}
							onChange={(e) => setSlotValue(slotId, e.target.value)}
							className="border rounded px-3 py-2"
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
