import { Badge } from "~/components/ui/badge";
import type { ProviderAuthType } from "~/lib/api/types";
import { cn } from "~/lib/utils";

interface ProviderRowProps {
	provider: {
		id: string;
		name: string;
		authType: ProviderAuthType;
		envHints: string[];
		setupSteps?: string;
	};
	selected: boolean;
	onToggle: () => void;
}

const AUTH_BADGE_LABELS: Record<ProviderAuthType, string> = {
	api_key: "API Key",
	oauth: "OAuth",
	aws_creds: "AWS Creds",
	local: "Local",
	gateway: "Gateway",
	unknown: "Unknown",
};

const AUTH_BADGE_VARIANTS: Record<
	ProviderAuthType,
	"default" | "secondary" | "outline"
> = {
	api_key: "secondary",
	oauth: "default",
	aws_creds: "outline",
	local: "secondary",
	gateway: "default",
	unknown: "outline",
};

export function ProviderRow({
	provider,
	selected,
	onToggle,
}: ProviderRowProps) {
	return (
		<label
			className={cn(
				"w-full rounded-lg border p-3 transition-colors cursor-pointer text-left block",
				selected && "border-primary bg-primary/5",
				"hover:border-primary/50",
			)}
		>
			<div className="flex items-center gap-3">
				{/* Checkbox */}
				<input
					type="checkbox"
					checked={selected}
					onChange={onToggle}
					className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
				/>

				{/* Provider info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-medium truncate">{provider.name}</span>
						<Badge variant={AUTH_BADGE_VARIANTS[provider.authType]}>
							{AUTH_BADGE_LABELS[provider.authType]}
						</Badge>
					</div>
					{provider.envHints.length > 0 && (
						<p className="text-xs text-muted-foreground mt-0.5 truncate">
							{provider.envHints.join(", ")}
						</p>
					)}
				</div>
			</div>
		</label>
	);
}
