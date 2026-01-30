import { useNavigate } from "react-router";
import { Card } from "~/components/ui/card";
import { getGitHubStars } from "~/lib/api/github-stars-service";
import { getAllHarnesses } from "~/lib/harness-registry";
import { ROUTES } from "~/lib/routes";
import { useWizardStore } from "~/lib/store/wizard-store";
import type { Route } from "./+types/home";

export const id = "home";

export async function loader({ context }: Route.LoaderArgs) {
	const kv = context.cloudflare.env.PROFILES_KV;
	// Optional: const token = (context.cloudflare.env as Record<string, unknown>).GITHUB_TOKEN as string | undefined;
	const githubStars = await getGitHubStars(kv);
	return { githubStars };
}

export function meta() {
	return [
		{ title: "Tweak - Select Harness" },
		{ name: "description", content: "Configure your OpenCode profile" },
	];
}

export default function HarnessSelection(_props: Route.ComponentProps) {
	const navigate = useNavigate();
	const setHarness = useWizardStore((s) => s.setHarness);
	const currentHarnessId = useWizardStore((s) => s.harnessId);

	// Get all harnesses from registry
	const harnesses = getAllHarnesses();

	const handleSelectHarness = (harnessId: string) => {
		setHarness(harnessId);
		navigate(ROUTES.flow.providers);
	};

	return (
		<div className="flex flex-col gap-6 py-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Select a Harness
				</h1>
				<p className="text-muted-foreground mt-1">
					Choose a starting template for your OpenCode configuration.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{harnesses.map((harness) => (
					<button
						key={harness.id}
						type="button"
						onClick={() => handleSelectHarness(harness.id)}
						className="text-left"
					>
						<Card
							className={`p-4 transition-colors cursor-pointer ${
								currentHarnessId === harness.id
									? "border-primary bg-primary/5"
									: "hover:border-primary"
							}`}
						>
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
