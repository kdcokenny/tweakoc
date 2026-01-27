import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useWizardGuard } from "~/lib/hooks";
import { ROUTES } from "~/lib/routes";
import {
	selectHarnessId,
	selectOptions,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { HARNESSES } from "~/lib/wizard-config";

// KDCO Workspace options
const KDCO_OPTIONS = [
	{
		key: "context7",
		label: "Context7 MCP",
		description: "Enable Context7 documentation lookup",
	},
	{
		key: "exa",
		label: "Exa Search",
		description: "Enable Exa web search capabilities",
	},
	{
		key: "githubGrep",
		label: "GitHub Grep",
		description: "Enable GitHub code search",
	},
	{
		key: "renameWindow",
		label: "Rename Terminal Window",
		description: "Auto-rename terminal window to project name",
	},
];

export default function OptionsStep() {
	const { allowed } = useWizardGuard({
		harness: true,
		providers: true,
		primaryComplete: true,
		secondaryComplete: true,
	});
	const harnessId = useWizardStore(selectHarnessId);
	const options = useWizardStore(selectOptions);
	const setOption = useWizardStore((s) => s.setOption);
	const navigate = useNavigate();

	// Skip options if harness doesn't support them
	useEffect(() => {
		if (!harnessId) return;
		const harness = HARNESSES[harnessId];
		if (!harness?.hasOptions) {
			navigate(ROUTES.flow.review, { replace: true });
		}
	}, [harnessId, navigate]);

	if (!allowed) return null;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Options</h1>
				<p className="text-muted-foreground mt-1">
					Configure additional settings for your harness.
				</p>
			</div>

			<div className="flex flex-col gap-3">
				{KDCO_OPTIONS.map((opt) => (
					<label
						key={opt.key}
						className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
					>
						<input
							type="checkbox"
							checked={options[opt.key] ?? false}
							onChange={(e) => setOption(opt.key, e.target.checked)}
							className="mt-1 h-4 w-4 rounded border-input accent-primary"
						/>
						<div>
							<div className="font-medium">{opt.label}</div>
							<div className="text-sm text-muted-foreground">
								{opt.description}
							</div>
						</div>
					</label>
				))}
			</div>
		</div>
	);
}
