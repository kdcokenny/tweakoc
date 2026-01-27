import { redirect } from "react-router";
import { ROUTES } from "~/lib/routes";
import { HARNESSES } from "~/lib/wizard-config";

interface LoaderArgs {
	params: { harnessId: string };
}

export function loader({ params }: LoaderArgs) {
	const { harnessId } = params;

	// Validate harness exists
	if (!harnessId || !(harnessId in HARNESSES)) {
		return redirect(ROUTES.home);
	}

	// TODO: Set harness in store (Task 6 - Zustand)
	// For now, just redirect to providers
	return redirect(ROUTES.flow.providers);
}

export default function HarnessRedirect() {
	// This shouldn't render (loader redirects)
	return null;
}
