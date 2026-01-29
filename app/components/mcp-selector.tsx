import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import type { McpServer } from "~/lib/harness-schema";
import { useWizardStore } from "~/lib/store/wizard-store";

interface McpSelectorProps {
	servers: McpServer[];
}

export function McpSelector({ servers }: McpSelectorProps) {
	const selectedServers = useWizardStore((state) => state.selectedMcpServers);
	const toggleMcpServer = useWizardStore((state) => state.toggleMcpServer);
	const selectAllMcpServers = useWizardStore(
		(state) => state.selectAllMcpServers,
	);
	const deselectAllMcpServers = useWizardStore(
		(state) => state.deselectAllMcpServers,
	);

	const allSelected =
		servers.length > 0 && servers.every((s) => selectedServers.includes(s.id));
	const noneSelected = servers.every((s) => !selectedServers.includes(s.id));

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>MCP Servers</CardTitle>
				<CardDescription>
					Select which MCP servers to include in your configuration
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Server list */}
				<div className="space-y-3">
					{servers.map((server) => {
						const isSelected = selectedServers.includes(server.id);
						const checkboxId = `mcp-server-${server.id}`;
						return (
							<label
								key={server.id}
								htmlFor={checkboxId}
								className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors w-full"
							>
								<Checkbox
									id={checkboxId}
									checked={isSelected}
									onCheckedChange={() => toggleMcpServer(server.id)}
									aria-label={server.label}
								/>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-zinc-900 dark:text-zinc-100">
										{server.label}
									</div>
									<div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
										{server.url}
									</div>
								</div>
							</label>
						);
					})}
				</div>

				{/* Select all / Deselect all buttons */}
				{servers.length > 1 && (
					<div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={selectAllMcpServers}
							disabled={allSelected}
						>
							Select All
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={deselectAllMcpServers}
							disabled={noneSelected}
						>
							Deselect All
						</Button>
					</div>
				)}

				{servers.length === 0 && (
					<p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
						No MCP servers configured for this harness.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
