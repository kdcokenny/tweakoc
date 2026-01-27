import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import type { AuthBadge, Provider } from "~/lib/mock/catalog";
import { cn } from "~/lib/utils";

interface ProviderRowProps {
	provider: Provider;
	selected: boolean;
	onToggle: () => void;
}

const AUTH_BADGE_LABELS: Record<AuthBadge, string> = {
	"api-key": "API Key",
	oauth: "OAuth",
	"aws-creds": "AWS Creds",
	local: "Local",
	gateway: "Gateway",
};

const AUTH_BADGE_VARIANTS: Record<
	AuthBadge,
	"default" | "secondary" | "outline"
> = {
	"api-key": "secondary",
	oauth: "default",
	"aws-creds": "outline",
	local: "secondary",
	gateway: "default",
};

export function ProviderRow({
	provider,
	selected,
	onToggle,
}: ProviderRowProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div
			className={cn(
				"rounded-lg border p-3 transition-colors",
				selected && "border-primary bg-primary/5",
			)}
		>
			<div className="flex items-center gap-3">
				{/* Checkbox */}
				<input
					type="checkbox"
					checked={selected}
					onChange={onToggle}
					className="h-4 w-4 rounded border-input accent-primary"
				/>

				{/* Provider info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-medium truncate">{provider.name}</span>
						<Badge variant={AUTH_BADGE_VARIANTS[provider.authBadge]}>
							{AUTH_BADGE_LABELS[provider.authBadge]}
						</Badge>
					</div>
					{provider.envHints.length > 0 && (
						<p className="text-xs text-muted-foreground mt-0.5 truncate">
							{provider.envHints.join(", ")}
						</p>
					)}
				</div>

				{/* Setup collapsible trigger */}
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
						Setup
						{isOpen ? (
							<ChevronUp className="h-3 w-3" />
						) : (
							<ChevronDown className="h-3 w-3" />
						)}
					</CollapsibleTrigger>
				</Collapsible>
			</div>

			{/* Setup content */}
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleContent>
					<pre className="mt-3 p-3 bg-muted rounded text-xs whitespace-pre-wrap font-mono">
						{provider.setupSteps}
					</pre>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
