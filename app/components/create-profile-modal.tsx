import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CodeBlockCommand } from "~/components/code-block-command";
import { CodeBlockTabs } from "~/components/code-block-tabs";
import { FilesViewer } from "~/components/files-viewer";
import { Button } from "~/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { GeneratedFile } from "~/lib/api/types";
import { SITE_ORIGIN } from "~/lib/config";
import { getHarness } from "~/lib/harness-registry";
import { selectHarnessId, useWizardStore } from "~/lib/store/wizard-store";

interface CreateProfileModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	componentId?: string;
	files?: GeneratedFile[];
}

// Profile name validation: starts with letter, max 32 chars, allowed [a-zA-Z0-9._-]
const PROFILE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9._-]{0,31}$/;

function validateProfileName(name: string): string | null {
	if (!name) return "Profile name is required";
	if (name.length > 32) return "Maximum 32 characters";
	if (!/^[a-zA-Z]/.test(name)) return "Must start with a letter";
	if (!PROFILE_NAME_REGEX.test(name))
		return "Only letters, numbers, dots, underscores, and hyphens allowed";
	return null;
}

export function CreateProfileModal({
	open,
	onOpenChange,
	componentId,
	files,
}: CreateProfileModalProps) {
	const [activeTab, setActiveTab] = useState("install");
	const [ocxHelpOpen, setOcxHelpOpen] = useState(false);
	const harnessId = useWizardStore(selectHarnessId);

	// Default profile name from harness
	const defaultName = useMemo(() => {
		if (!harnessId) return "my-profile";
		const harness = getHarness(harnessId);
		// Fallback to harness ID if no defaultProfileName is defined
		return harness?.defaultProfileName ?? harness?.id ?? "my-profile";
	}, [harnessId]);
	const [profileName, setProfileName] = useState(defaultName);

	// Reset tab to "install" when modal closes
	useEffect(() => {
		if (!open) {
			setActiveTab("install");
		}
	}, [open]);

	// Validate profile name
	const validationError = useMemo(
		() => validateProfileName(profileName),
		[profileName],
	);

	// Use provided componentId or placeholder
	const finalComponentId = componentId ?? "p-placeholder";

	// Commands
	const primaryCommand = `ocx profile add ${profileName} --from tweak/${finalComponentId}`;
	const registryCommand = `ocx registry add ${SITE_ORIGIN}/r --name tweak --global`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] min-h-0 flex flex-col">
				<DialogHeader>
					<DialogTitle>Create Profile</DialogTitle>
					<DialogDescription>
						Install your profile using OCX (OpenCode Extensions)
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex flex-col flex-1 min-h-0"
				>
					<TabsList>
						<TabsTrigger value="install">Install</TabsTrigger>
						<TabsTrigger value="files">Files</TabsTrigger>
					</TabsList>

					<TabsContent value="install" className="flex-1 min-h-0 overflow-auto">
						<div className="flex flex-col gap-6 mt-4 min-w-0">
							{/* Profile name input */}
							<div className="flex flex-col gap-2">
								<label htmlFor="profile-name" className="text-sm font-medium">
									Profile Name
								</label>
								<Input
									id="profile-name"
									value={profileName}
									onChange={(e) => setProfileName(e.target.value)}
									placeholder="my-profile"
									className={validationError ? "border-destructive" : ""}
								/>
								{validationError && (
									<p className="text-xs text-destructive">{validationError}</p>
								)}
							</div>

							{/* First time using OCX? */}
							<Collapsible open={ocxHelpOpen} onOpenChange={setOcxHelpOpen}>
								<CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
									First time using OCX?
									{ocxHelpOpen ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-3 flex flex-col gap-4">
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											1. Install OCX:
										</p>
										<CodeBlockTabs
											commands={{
												bash: "curl -fsSL https://ocx.kdco.dev/install.sh | sh",
												npm: "npm install -g ocx",
												pnpm: "pnpm add -g ocx",
												bun: "bun add -g ocx",
											}}
											defaultTab="bash"
										/>
									</div>
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											2. Initialize OCX (one-time setup):
										</p>
										<CodeBlockCommand command="ocx init --global" />
									</div>
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											3. Add the tweak registry:
										</p>
										<CodeBlockCommand command={registryCommand} />
									</div>
								</CollapsibleContent>
							</Collapsible>

							{/* Main install command */}
							<div className="min-w-0">
								<p className="text-sm font-medium mb-2">
									Install this profile:
								</p>
								<CodeBlockCommand command={primaryCommand} />
							</div>

							{/* Action buttons */}
							<div className="flex items-center justify-end pt-2">
								<Button onClick={() => onOpenChange(false)}>Done</Button>
							</div>
						</div>
					</TabsContent>

					<TabsContent
						value="files"
						className="flex-1 min-h-0 overflow-hidden flex flex-col"
					>
						<FilesViewer files={files ?? []} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
