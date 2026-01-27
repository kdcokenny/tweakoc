"use client";

import { Check, Clipboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

interface CopyButtonProps {
	value: string;
	className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
	const [hasCopied, setHasCopied] = useState(false);

	// Reset after 2 seconds
	useEffect(() => {
		if (hasCopied) {
			const timeout = setTimeout(() => setHasCopied(false), 2000);
			return () => clearTimeout(timeout);
		}
	}, [hasCopied]);

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(value);
		setHasCopied(true);
	}, [value]);

	return (
		<TooltipProvider delay={0}>
			<Tooltip>
				<TooltipTrigger
					render={(props) => (
						<Button
							{...props}
							variant="ghost"
							size="icon"
							className={cn("h-7 w-7 text-muted-foreground", className)}
							onClick={handleCopy}
						>
							{hasCopied ? (
								<Check className="h-3.5 w-3.5 text-green-500" />
							) : (
								<Clipboard className="h-3.5 w-3.5" />
							)}
							<span className="sr-only">Copy</span>
						</Button>
					)}
				/>
				<TooltipContent side="top">
					{hasCopied ? "Copied!" : "Copy"}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
