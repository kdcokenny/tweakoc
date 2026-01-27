"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { CodeBlockCommand } from "~/components/code-block-command";
import { CodeBlockTabs } from "~/components/code-block-tabs";
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
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { selectHarnessId, useWizardStore } from "~/lib/store/wizard-store";
import { HARNESSES } from "~/lib/wizard-config";

interface CreateProfileModalProps {
	children: ReactElement;
	onViewFiles?: () => void;
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
	children,
	onViewFiles,
}: CreateProfileModalProps) {
	const [open, setOpen] = useState(false);
	const [ocxHelpOpen, setOcxHelpOpen] = useState(false);
	const harnessId = useWizardStore(selectHarnessId);

	// Default profile name from harness
	const defaultName = harnessId
		? (HARNESSES[harnessId]?.defaultProfileName ?? "my-profile")
		: "my-profile";
	const [profileName, setProfileName] = useState(defaultName);

	// Validate profile name
	const validationError = useMemo(
		() => validateProfileName(profileName),
		[profileName],
	);

	// Placeholder component ID (will be real in Phase 2)
	const componentId = "p-placeholder";

	// Install command
	const installCommand = `ocx registry add https://tweak.kdco.dev/r --name tweak --global && ocx profile add ${profileName} --from tweak/${componentId}`;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={children} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Profile</DialogTitle>
					<DialogDescription>
						Install your profile using OCX (OpenCode Extensions)
					</DialogDescription>
				</DialogHeader>

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
						</CollapsibleContent>
					</Collapsible>

					{/* Main install command */}
					<div className="min-w-0">
						<p className="text-sm font-medium mb-2">Install this profile:</p>
						<CodeBlockCommand command={installCommand} />
					</div>

					{/* Action buttons */}
					<div className="flex items-center justify-between pt-2">
						<Button variant="outline" onClick={() => onViewFiles?.()}>
							View files
						</Button>
						<Button onClick={() => setOpen(false)}>Done</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
