import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";

interface WizardNavProps {
	nextLabel: "Next" | "Review" | "Create Profile";
	onNext: () => void;
	onBack: () => void;
	canGoNext: boolean;
	canGoBack: boolean;
}

export function WizardNav({
	nextLabel,
	onNext,
	onBack,
	canGoNext,
	canGoBack,
}: WizardNavProps) {
	return (
		<footer className="shrink-0 flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-between md:px-6">
			{/* Back button - hidden on step 1 */}
			{canGoBack ? (
				<Button variant="outline" onClick={onBack}>
					<ChevronLeft className="mr-1 h-4 w-4" />
					Back
				</Button>
			) : (
				<div /> // Spacer for layout
			)}

			{/* Next/Review/Create button */}
			<Button onClick={onNext} disabled={!canGoNext}>
				{nextLabel}
				{nextLabel !== "Create Profile" && (
					<ChevronRight className="ml-1 h-4 w-4" />
				)}
			</Button>
		</footer>
	);
}
