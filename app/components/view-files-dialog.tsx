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
import type { GeneratedFile } from "~/lib/api/types";
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
	files?: GeneratedFile[]; // Optional: if provided, use directly; otherwise generate mock
}

export function ViewFilesDialog({
	open,
	onOpenChange,
	files: providedFiles,
}: ViewFilesDialogProps) {
	const harnessId = useWizardStore(selectHarnessId);
	const primary = useWizardStore(selectPrimary);
	const secondary = useWizardStore(selectSecondary);
	const options = useWizardStore(selectOptions);

	// Generate mock files if no files provided (for preview mode)
	const mockFilesObject = useMemo(() => {
		if (!harnessId) return null;
		return generateMockFiles({ harnessId, primary, secondary, options });
	}, [harnessId, primary, secondary, options]);

	// Convert provided files or mock files to display format
	const displayFiles = useMemo(() => {
		if (providedFiles) {
			// Use provided files from API
			return providedFiles;
		}
		if (mockFilesObject) {
			// Convert mock files object to array format
			return Object.entries(mockFilesObject).map(([path, content]) => ({
				path,
				content,
			}));
		}
		return null;
	}, [providedFiles, mockFilesObject]);

	if (!displayFiles) return null;

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
					defaultValue={displayFiles[0]?.path}
					className="flex-1 overflow-hidden flex flex-col"
				>
					<TabsList className="w-full justify-start">
						{displayFiles.map((file) => (
							<TabsTrigger
								key={file.path}
								value={file.path}
								className="text-xs"
							>
								{file.path}
							</TabsTrigger>
						))}
					</TabsList>

					{displayFiles.map((file) => (
						<TabsContent
							key={file.path}
							value={file.path}
							className="flex-1 overflow-hidden mt-4"
						>
							<div className="relative h-full rounded-lg border bg-muted/50">
								<CopyButton
									value={file.content}
									className="absolute top-2 right-2 z-10"
								/>
								<pre className="h-full overflow-auto p-4 text-sm font-mono no-scrollbar">
									<code>{file.content}</code>
								</pre>
							</div>
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
