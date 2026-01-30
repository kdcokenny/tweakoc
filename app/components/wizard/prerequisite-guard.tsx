import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ROUTES } from "~/lib/routes";

interface PrerequisiteGuardProps {
	requirement: "providers" | "slots";
	harnessId: string;
}

export function PrerequisiteGuard({
	requirement,
	harnessId,
}: PrerequisiteGuardProps) {
	const navigate = useNavigate();

	const messages = {
		providers: {
			title: "Providers Required",
			description: "Please select at least one provider before continuing.",
			buttonText: "Select Providers",
			destination: ROUTES.flow.providers(harnessId),
		},
		slots: {
			title: "Configuration Incomplete",
			description:
				"Please complete all required configuration fields before reviewing.",
			buttonText: "Complete Configuration",
			destination: ROUTES.flow.providers(harnessId),
		},
	};

	const { title, description, buttonText, destination } = messages[requirement];

	return (
		<div className="flex items-center justify-center min-h-[400px] p-6">
			<Card className="max-w-md">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">{description}</p>
					<Button onClick={() => navigate(destination)}>{buttonText}</Button>
				</CardContent>
			</Card>
		</div>
	);
}
