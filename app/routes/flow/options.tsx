import { Navigate } from "react-router";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { getHarness } from "~/lib/harness-registry";
import { useWizardGuard } from "~/lib/hooks";
import { ROUTES } from "~/lib/routes";
import {
	selectHarnessId,
	selectOptions,
	useWizardStore,
} from "~/lib/store/wizard-store";

export default function OptionsStep() {
	const { allowed } = useWizardGuard({
		harness: true,
		providers: true,
		allSlotsComplete: true,
	});
	const harnessId = useWizardStore(selectHarnessId);
	const options = useWizardStore(selectOptions);
	const setOption = useWizardStore((s) => s.setOption);

	// Guard: must have valid harness
	if (!allowed) return null;
	if (!harnessId) return null;

	const harness = getHarness(harnessId);

	// Guard: invalid harness ID (should not happen with guard)
	if (!harness) return null;

	// If harness has no options, skip to review
	if (!harness.options || harness.options.length === 0) {
		return <Navigate to={ROUTES.flow.review} replace />;
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Options</h1>
				<p className="text-muted-foreground mt-1">
					Configure additional settings for your profile
				</p>
			</div>

			<div className="space-y-6">
				{harness.options.map((optionConfig) => (
					<DynamicOption
						key={optionConfig.id}
						config={optionConfig}
						value={options[optionConfig.id] ?? optionConfig.default}
						onChange={(value) => setOption(optionConfig.id, value)}
					/>
				))}
			</div>
		</div>
	);
}

interface DynamicOptionProps {
	config: {
		id: string;
		type: "boolean" | "text" | "select";
		label: string;
		description?: string;
		default?: unknown;
		options?: { value: string; label: string }[];
	};
	value: unknown;
	onChange: (value: unknown) => void;
}

function DynamicOption({ config, value, onChange }: DynamicOptionProps) {
	switch (config.type) {
		case "boolean":
			return (
				<label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
					<input
						type="checkbox"
						id={config.id}
						checked={Boolean(value)}
						onChange={(e) => onChange(e.target.checked)}
						className="mt-1 h-4 w-4 rounded border-input accent-primary"
					/>
					<div className="flex flex-col gap-1">
						<div className="text-base font-medium">{config.label}</div>
						{config.description && (
							<p className="text-sm text-muted-foreground">
								{config.description}
							</p>
						)}
					</div>
				</label>
			);

		case "text":
			return (
				<div className="flex flex-col gap-2">
					<Label htmlFor={config.id} className="text-base font-medium">
						{config.label}
					</Label>
					{config.description && (
						<p className="text-sm text-muted-foreground">
							{config.description}
						</p>
					)}
					<Input
						id={config.id}
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						className="max-w-md"
					/>
				</div>
			);

		case "select":
			return (
				<div className="flex flex-col gap-2">
					<Label htmlFor={config.id} className="text-base font-medium">
						{config.label}
					</Label>
					{config.description && (
						<p className="text-sm text-muted-foreground">
							{config.description}
						</p>
					)}
					<Select value={String(value ?? "")} onValueChange={onChange}>
						<SelectTrigger className="max-w-md">
							<SelectValue placeholder="Select an option" />
						</SelectTrigger>
						<SelectContent>
							{config.options?.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);

		default:
			return null;
	}
}
