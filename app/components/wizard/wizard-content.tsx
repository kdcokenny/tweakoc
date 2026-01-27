import { cn } from "~/lib/utils";

interface WizardContentProps {
	children: React.ReactNode;
	direction: "forward" | "back";
}

export function WizardContent({ children, direction }: WizardContentProps) {
	return (
		<main
			className={cn(
				"flex-1 overflow-auto",
				"motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
				direction === "forward" && "motion-safe:animate-slide-left",
				direction === "back" && "motion-safe:animate-slide-right",
			)}
		>
			{children}
		</main>
	);
}
