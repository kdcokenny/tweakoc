import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import type { SlotProperty } from "~/lib/harness-schema";
import { isConfigurableProperty } from "~/lib/harness-schema";
import { cn } from "~/lib/utils";

interface PropertyControlProps {
	propertyName: string;
	property: SlotProperty;
	value: unknown;
	onChange: (value: unknown) => void;
	className?: string;
}

export function PropertyControl({
	propertyName,
	property,
	value,
	onChange,
	className,
}: PropertyControlProps) {
	// Don't render fixed properties (they're not configurable)
	if (!isConfigurableProperty(property)) {
		return null;
	}

	const renderControl = () => {
		switch (property.type) {
			case "number": {
				const numValue =
					typeof value === "number"
						? value
						: (property.default ?? property.min ?? 0);
				const min = property.min ?? 0;
				const max = property.max ?? 100;
				const step = property.step ?? 1;

				return (
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-zinc-500 dark:text-zinc-400">
								{min}
							</span>
							<span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{numValue}
							</span>
							<span className="text-sm text-zinc-500 dark:text-zinc-400">
								{max}
							</span>
						</div>
						<Slider
							value={numValue}
							min={min}
							max={max}
							step={step}
							onValueChange={(v) => onChange(v)}
						/>
					</div>
				);
			}

			case "text": {
				const textValue =
					typeof value === "string" ? value : (property.default ?? "");
				return (
					<Input
						value={textValue}
						onChange={(e) => onChange(e.target.value)}
						placeholder={`Enter ${propertyName}...`}
					/>
				);
			}

			case "enum": {
				const enumValue =
					typeof value === "string"
						? value
						: (property.default ?? property.options[0]);
				return (
					<Select value={enumValue} onValueChange={(v) => onChange(v)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder={`Select ${propertyName}`} />
						</SelectTrigger>
						<SelectContent>
							{property.options.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			}

			case "boolean": {
				const boolValue =
					typeof value === "boolean" ? value : (property.default ?? false);
				return (
					<div className="flex items-center gap-2">
						<Checkbox
							checked={boolValue}
							onCheckedChange={(checked) => onChange(checked)}
						/>
						<span className="text-sm text-zinc-700 dark:text-zinc-300">
							{boolValue ? "Enabled" : "Disabled"}
						</span>
					</div>
				);
			}

			case "model":
				// Model is handled separately by ModelSlot component
				return null;

			default:
				return null;
		}
	};

	// Get a nice display label from property name
	const label = propertyName
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();

	return (
		<div className={cn("space-y-2", className)}>
			<div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
				{label}
			</div>
			{renderControl()}
		</div>
	);
}
