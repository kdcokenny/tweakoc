"use client";

import { CopyButton } from "~/components/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { GeneratedFile } from "~/lib/api/types";

interface FilesViewerProps {
	files: GeneratedFile[];
}

export function FilesViewer({ files }: FilesViewerProps) {
	if (files.length === 0) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				No files generated
			</div>
		);
	}

	return (
		<Tabs
			key={files.map((f) => f.path).join(",")}
			defaultValue={files[0]?.path}
			className="flex-1 overflow-hidden flex flex-col"
		>
			<TabsList className="w-full justify-start">
				{files.map((file) => (
					<TabsTrigger key={file.path} value={file.path} className="text-xs">
						{file.path}
					</TabsTrigger>
				))}
			</TabsList>

			{files.map((file) => (
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
	);
}
