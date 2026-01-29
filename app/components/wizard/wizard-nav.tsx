import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface WizardNavProps {
	nextLabel: "Next" | "Review" | "Create Profile";
	onNext: () => void;
	onBack: () => void;
	canGoNext: boolean;
	canGoBack: boolean;
	isCreating?: boolean; // For review step creating state
}

export function WizardNav({
	nextLabel,
	onNext,
	onBack,
	canGoNext,
	canGoBack,
	isCreating,
}: WizardNavProps) {
	return (
		<footer className="shrink-0 border-t py-4">
			<div className="max-w-2xl mx-auto px-4 md:px-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
				{/* Back button - hidden on step 1 */}
				{canGoBack ? (
					<Button variant="outline" onClick={onBack} type="button">
						<ChevronLeft className="mr-1 h-4 w-4" />
						Back
					</Button>
				) : (
					<div /> // Spacer for layout
				)}

				{/* Next/Review/Create button */}
				<Button
					type="button" // Prevents form submit
					onClick={onNext}
					disabled={isCreating} // Only truly disable during creation
					aria-disabled={!canGoNext}
					className={cn(!canGoNext && "opacity-50 cursor-not-allowed")}
				>
					{nextLabel}
					{nextLabel !== "Create Profile" && (
						<ChevronRight className="ml-1 h-4 w-4" />
					)}
				</Button>
			</div>
		</footer>
	);
}
