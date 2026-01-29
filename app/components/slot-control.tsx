import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import type { SlotDefinition } from "~/lib/harness-schema";
import { useWizardStore } from "~/lib/store/wizard-store";
import { ModelSlot } from "./model-slot";

interface SlotControlProps {
	slotId: string;
	slotDef: SlotDefinition;
	showError?: boolean;
}

export function SlotControl({
	slotId,
	slotDef,
	showError = false,
}: SlotControlProps) {
	const value = useWizardStore((state) => state.slotValues[slotId]);
	const setSlotValue = useWizardStore((state) => state.setSlotValue);

	// Guard clause: handle model slots
	if (slotDef.type === "model") {
		const modelValue = value as string | undefined;
		return <ModelSlot slotId={slotId} showError={showError && !modelValue} />;
	}

	// Guard clause: handle number slots
	if (slotDef.type === "number") {
		const numValue = (value as number) ?? slotDef.default ?? slotDef.min ?? 0;
		return (
			<Field>
				<div className="flex items-center justify-between">
					<FieldLabel htmlFor={slotId}>{slotDef.label}</FieldLabel>
					<span className="text-sm text-muted-foreground">{numValue}</span>
				</div>
				<Slider
					id={slotId}
					min={slotDef.min ?? 0}
					max={slotDef.max ?? 1}
					step={slotDef.step ?? 0.1}
					value={numValue}
					onValueChange={(v) => setSlotValue(slotId, v)}
				/>
			</Field>
		);
	}

	// Guard clause: handle enum slots
	if (slotDef.type === "enum") {
		return (
			<Field>
				<FieldLabel htmlFor={slotId}>{slotDef.label}</FieldLabel>
				<Select
					value={(value as string) ?? slotDef.default ?? ""}
					onValueChange={(v) => setSlotValue(slotId, v)}
				>
					<SelectTrigger id={slotId}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{slotDef.options.map((opt) => (
							<SelectItem key={opt} value={opt}>
								{opt}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
		);
	}

	// Guard clause: handle boolean slots
	if (slotDef.type === "boolean") {
		return (
			<Field orientation="horizontal">
				<FieldLabel htmlFor={slotId}>{slotDef.label}</FieldLabel>
				<Checkbox
					id={slotId}
					checked={(value as boolean) ?? slotDef.default ?? false}
					onCheckedChange={(v) => setSlotValue(slotId, v)}
				/>
			</Field>
		);
	}

	// Guard clause: handle text slots
	if (slotDef.type === "text") {
		return (
			<Field>
				<FieldLabel htmlFor={slotId}>{slotDef.label}</FieldLabel>
				<Input
					id={slotId}
					value={(value as string) ?? slotDef.default ?? ""}
					onChange={(e) => setSlotValue(slotId, e.target.value)}
				/>
			</Field>
		);
	}

	// Fail fast: unknown slot type
	return null;
}
