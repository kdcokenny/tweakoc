import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "~/lib/utils";

interface CheckboxProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	({ className, checked, onCheckedChange, id, ...props }, ref) => {
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onCheckedChange?.(e.target.checked);
		};

		return (
			<div className="relative inline-flex items-center">
				<input
					type="checkbox"
					ref={ref}
					id={id}
					checked={checked}
					onChange={handleChange}
					className="sr-only peer"
					{...props}
				/>
				<div
					className={cn(
						"w-4 h-4 border-2 rounded flex items-center justify-center cursor-pointer",
						"border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800",
						"peer-checked:bg-blue-600 peer-checked:border-blue-600",
						"peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
						"transition-colors",
						className,
					)}
				>
					{checked && <Check className="w-3 h-3 text-white" />}
				</div>
			</div>
		);
	},
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
