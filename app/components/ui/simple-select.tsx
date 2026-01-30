import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SimpleSelectProps {
	options: SelectOption[];
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	disabled?: boolean;
	renderOption?: (option: SelectOption) => React.ReactNode;
	renderValue?: (option: SelectOption) => React.ReactNode;
	id?: string;
	name?: string;
}

export function SimpleSelect({
	options,
	value,
	onChange,
	placeholder,
	className,
	triggerClassName,
	disabled,
	renderOption,
	renderValue,
	id,
	name,
}: SimpleSelectProps) {
	// Find selected option for display
	const selectedOption = React.useMemo(
		() => options.find((opt) => opt.value === value),
		[options, value],
	);

	// Determine what to display in the trigger
	const displayValue = React.useMemo(() => {
		if (!selectedOption) {
			return placeholder ?? "Select...";
		}
		if (renderValue) {
			return renderValue(selectedOption);
		}
		return selectedOption.label;
	}, [selectedOption, placeholder, renderValue]);

	const handleValueChange = React.useCallback(
		(newValue: string | null) => {
			if (newValue !== null && onChange) {
				onChange(newValue);
			}
		},
		[onChange],
	);

	return (
		<Select
			value={value}
			onValueChange={handleValueChange}
			disabled={disabled}
			name={name}
		>
			<SelectTrigger id={id} className={cn(triggerClassName, className)}>
				<SelectValue>{displayValue}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem
						key={option.value}
						value={option.value}
						disabled={option.disabled}
					>
						{renderOption ? renderOption(option) : option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
