import { GitHubIcon } from "~/components/icons/github";
import { Button } from "~/components/ui/button";

interface GitHubStarsProps {
	stars: number | null;
}

function formatStars(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return count.toString();
}

export function GitHubStars({ stars }: GitHubStarsProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			render={
				// biome-ignore lint/a11y/useAnchorContent: Content provided by Button children via render prop
				<a
					href="https://github.com/kdcokenny/tweakoc"
					target="_blank"
					rel="noopener noreferrer"
				/>
			}
			className="gap-2"
		>
			<GitHubIcon className="h-4 w-4" />
			{stars !== null && (
				<span className="text-muted-foreground">[{formatStars(stars)}]</span>
			)}
		</Button>
	);
}
