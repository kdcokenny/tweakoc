"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CodeBlockCommand } from "./code-block-command";

type PackageManager = "bash" | "npm" | "pnpm" | "bun";

interface CommandVariants {
	bash?: string;
	npm?: string;
	pnpm?: string;
	bun?: string;
}

interface CodeBlockTabsProps {
	commands: CommandVariants;
	defaultTab?: PackageManager;
	className?: string;
}

const TAB_LABELS: Record<PackageManager, string> = {
	bash: "bash",
	npm: "npm",
	pnpm: "pnpm",
	bun: "bun",
};

export function CodeBlockTabs({
	commands,
	defaultTab,
	className,
}: CodeBlockTabsProps) {
	// Get available tabs based on provided commands
	const availableTabs = (Object.keys(commands) as PackageManager[]).filter(
		(key) => commands[key],
	);

	const [activeTab, setActiveTab] = useState<PackageManager>(
		defaultTab ?? availableTabs[0] ?? "bash",
	);

	if (availableTabs.length === 0) return null;

	// If only one command, render without tabs
	if (availableTabs.length === 1) {
		const singleCommand = commands[availableTabs[0]];
		return singleCommand ? (
			<CodeBlockCommand command={singleCommand} className={className} />
		) : null;
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={(v) => setActiveTab(v as PackageManager)}
			className={className}
		>
			<TabsList className="h-9">
				{availableTabs.map((tab) => (
					<TabsTrigger key={tab} value={tab} className="text-xs">
						{TAB_LABELS[tab]}
					</TabsTrigger>
				))}
			</TabsList>
			{availableTabs.map((tab) => (
				<TabsContent key={tab} value={tab} className="mt-2">
					{commands[tab] && <CodeBlockCommand command={commands[tab]} />}
				</TabsContent>
			))}
		</Tabs>
	);
}
