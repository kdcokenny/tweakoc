import { useParams } from "react-router";
import { McpSelector } from "~/components/mcp-selector";
import { SlotCard } from "~/components/slot-card";
import { getHarness } from "~/lib/harness-registry";
import { useWizardGuard } from "~/lib/hooks/use-wizard-guard";
import { useWizardStore } from "~/lib/store/wizard-store";

export default function FlowPage() {
	useWizardGuard({ harness: true, providers: true });
	const { pageId } = useParams<{ pageId: string }>();

	const harnessId = useWizardStore((state) => state.harnessId);
	const harness = harnessId ? getHarness(harnessId) : null;

	// Guard clause: invalid harness or pageId (Early Exit)
	if (!harness || !pageId) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<p className="text-muted-foreground">Invalid page configuration.</p>
			</div>
		);
	}

	// Find current page and its index
	const currentPageIndex = harness.flow.findIndex((p) => p.id === pageId);
	const currentPage = harness.flow[currentPageIndex];

	// Guard clause: page not found (Early Exit)
	if (!currentPage) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<p className="text-muted-foreground">Page not found: {pageId}</p>
			</div>
		);
	}

	// Render components based on flow definition
	const renderComponent = (
		component: { type: string; id?: string },
		index: number,
	) => {
		switch (component.type) {
			case "slot": {
				if (!component.id) return null;
				const slot = harness.slots[component.id];
				if (!slot) return null;
				return (
					<SlotCard
						key={`slot-${component.id}`}
						slotId={component.id}
						slot={slot}
					/>
				);
			}
			case "mcp": {
				return (
					<McpSelector
						key={`mcp-${index}`}
						servers={harness.mcpServers ?? []}
					/>
				);
			}
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					{currentPage.label}
				</h1>
			</div>

			{/* Components */}
			<div className="flex flex-col gap-6">
				{currentPage.components.map((component, index) =>
					renderComponent(component, index),
				)}
			</div>
		</div>
	);
}
