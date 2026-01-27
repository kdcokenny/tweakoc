import { redirect } from "react-router";
import { ROUTES } from "~/lib/routes";
import { HARNESSES } from "~/lib/wizard-config";

export function loader() {
	// TODO: Get harnessId from store/context
	const harnessId = "omo"; // Placeholder - will come from store
	const harness = HARNESSES[harnessId as keyof typeof HARNESSES];

	// Skip options if harness doesn't support them
	if (!harness?.hasOptions) {
		return redirect(ROUTES.flow.review);
	}

	return null;
}

export default function OptionsStep() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Options</h1>
				<p className="text-muted-foreground mt-1">
					Configure additional settings for your harness.
				</p>
			</div>

			<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
				Options toggles coming in Task 7
			</div>
		</div>
	);
}
