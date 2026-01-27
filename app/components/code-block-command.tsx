"use client";

import { Terminal } from "lucide-react";
import { cn } from "~/lib/utils";
import { CopyButton } from "./copy-button";

interface CodeBlockCommandProps {
	command: string;
	className?: string;
}

export function CodeBlockCommand({
	command,
	className,
}: CodeBlockCommandProps) {
	return (
		<div
			className={cn(
				"relative flex items-center min-w-0 rounded-lg border bg-muted/50 px-4 py-3",
				className,
			)}
		>
			<Terminal className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
				<code className="inline-block min-w-max whitespace-nowrap font-mono text-sm">
					{command}
				</code>
			</div>
			<CopyButton value={command} className="ml-2 shrink-0" />
		</div>
	);
}
