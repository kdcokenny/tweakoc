import { Card } from "~/components/ui/card";
import { HARNESSES, type HarnessId } from "~/lib/wizard-config";

export function meta() {
	return [
		{ title: "Tweak - Select Harness" },
		{ name: "description", content: "Configure your OpenCode profile" },
	];
}

export default function HarnessSelection() {
	// TODO: Wire to Zustand store (Task 6)
	const handleSelectHarness = (harnessId: HarnessId) => {
		console.log("Selected harness:", harnessId);
		// Will be: store.setHarness(harnessId) + navigate to providers
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Select a Harness
				</h1>
				<p className="text-muted-foreground mt-1">
					Choose a starting template for your OpenCode configuration.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{Object.values(HARNESSES).map((harness) => (
					<button
						key={harness.id}
						type="button"
						onClick={() => handleSelectHarness(harness.id as HarnessId)}
						className="text-left"
					>
						<Card className="p-4 hover:border-primary transition-colors cursor-pointer">
							<h2 className="font-semibold">{harness.name}</h2>
							<p className="text-sm text-muted-foreground mt-1">
								{harness.description}
							</p>
						</Card>
					</button>
				))}
			</div>
		</div>
	);
}
