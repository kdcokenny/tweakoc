import * as React from "react";
import { cn } from "~/lib/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
	value?: number;
	onValueChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
	(
		{ className, value, onValueChange, min = 0, max = 100, step = 1, ...props },
		ref,
	) => {
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = Number.parseFloat(e.target.value);
			onValueChange?.(newValue);
		};

		return (
			<input
				type="range"
				ref={ref}
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={handleChange}
				className={cn(
					"w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer",
					"accent-blue-600 dark:accent-blue-500",
					"[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
					"[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600",
					"[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md",
					"[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full",
					"[&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
					className,
				)}
				{...props}
			/>
		);
	},
);

Slider.displayName = "Slider";

export { Slider };
