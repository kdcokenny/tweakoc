"use client";

import { useMemo } from "react";
import { CopyButton } from "~/components/copy-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { generateMockFiles } from "~/lib/mock/generate-files";
import {
	selectHarnessId,
	selectOptions,
	selectPrimary,
	selectSecondary,
	useWizardStore,
} from "~/lib/store/wizard-store";

interface ViewFilesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ViewFilesDialog({ open, onOpenChange }: ViewFilesDialogProps) {
	const harnessId = useWizardStore(selectHarnessId);
	const primary = useWizardStore(selectPrimary);
	const secondary = useWizardStore(selectSecondary);
	const options = useWizardStore(selectOptions);

	// Generate mock files based on current selections
	const files = useMemo(() => {
		if (!harnessId) return null;
		return generateMockFiles({ harnessId, primary, secondary, options });
	}, [harnessId, primary, secondary, options]);

	if (!files) return null;

	const fileEntries = Object.entries(files) as [keyof typeof files, string][];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Generated Files</DialogTitle>
					<DialogDescription>
						These files will be installed in your profile directory
					</DialogDescription>
				</DialogHeader>

				<Tabs
					defaultValue={fileEntries[0]?.[0]}
					className="flex-1 overflow-hidden flex flex-col"
				>
					<TabsList className="w-full justify-start">
						{fileEntries.map(([filename]) => (
							<TabsTrigger key={filename} value={filename} className="text-xs">
								{filename}
							</TabsTrigger>
						))}
					</TabsList>

					{fileEntries.map(([filename, content]) => (
						<TabsContent
							key={filename}
							value={filename}
							className="flex-1 overflow-hidden mt-4"
						>
							<div className="relative h-full rounded-lg border bg-muted/50">
								<CopyButton
									value={content}
									className="absolute top-2 right-2 z-10"
								/>
								<pre className="h-full overflow-auto p-4 text-sm font-mono no-scrollbar">
									<code>{content}</code>
								</pre>
							</div>
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
