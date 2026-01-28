import { AlertTriangle, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
	getCustomProviderConfig,
	isCustomProvider,
} from "~/lib/config/custom-providers";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AdditionalSetupRequiredProps {
	providers: Array<{
		id: string;
		name: string;
		docUrl?: string;
	}>;
}

export function AdditionalSetupRequired({
	providers,
}: AdditionalSetupRequiredProps) {
	if (providers.length === 0) return null;

	const customProviders = providers.filter((p) => isCustomProvider(p.id));
	const builtInProviders = providers.filter((p) => !isCustomProvider(p.id));

	return (
		<Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertTriangle className="h-5 w-5 text-amber-500" />
					Additional Setup Required
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="divide-y divide-slate-200 dark:divide-slate-800">
					{/* Built-in providers - simple rows */}
					{builtInProviders.map((provider) => (
						<div
							key={provider.id}
							className="py-3 flex justify-between items-start"
						>
							<div>
								<div className="font-medium">{provider.name}</div>
								<div className="text-sm text-muted-foreground">
									Run /connect in OpenCode to authenticate
								</div>
							</div>
							{provider.docUrl && (
								<a
									href={provider.docUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
								>
									docs <ExternalLink className="h-3 w-3" />
								</a>
							)}
						</div>
					))}

					{/* Custom providers - accordion items */}
					{customProviders.length > 0 && (
						<Accordion>
							{customProviders.map((provider) => {
								const config = getCustomProviderConfig(provider.id);
								if (!config) return null;

								return (
									<AccordionItem key={provider.id} value={provider.id}>
										<AccordionTrigger className="hover:no-underline">
											<div className="text-left">
												<div className="font-medium">
													{config.name || provider.name}
												</div>
												<div className="text-sm text-muted-foreground">
													See setup instructions
												</div>
											</div>
										</AccordionTrigger>
										<AccordionContent>
											<div className="prose prose-sm dark:prose-invert max-w-none mb-3">
												<ReactMarkdown>
													{config.customInstructions}
												</ReactMarkdown>
											</div>
											{config.docUrl && (
												<a
													href={config.docUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
												>
													docs <ExternalLink className="h-3 w-3" />
												</a>
											)}
										</AccordionContent>
									</AccordionItem>
								);
							})}
						</Accordion>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
