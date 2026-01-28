import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ROUTES } from "~/lib/routes";
import { useWizardStore } from "~/lib/store/wizard-store";
import { HARNESSES } from "~/lib/wizard-config";

export default function HarnessRedirect() {
	const params = useParams<{ harnessId: string }>();
	const navigate = useNavigate();
	const setHarness = useWizardStore((s) => s.setHarness);

	useEffect(() => {
		const { harnessId } = params;

		// Validate harness exists
		if (!harnessId || !(harnessId in HARNESSES)) {
			navigate(ROUTES.home, { replace: true });
			return;
		}

		// Set harness in store and redirect to providers
		setHarness(harnessId);
		navigate(ROUTES.flow.providers, { replace: true });
	}, [params, navigate, setHarness]);

	// Show nothing while redirecting
	return (
		<div className="flex items-center justify-center p-6">
			<p className="text-muted-foreground">Redirecting...</p>
		</div>
	);
}
