import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { SimpleSelect } from "~/components/ui/simple-select";
import { generateSetupInstructions } from "~/lib/api/provider-meta";
import type { ProviderSummary } from "~/lib/api/types";
import {
	selectCatalogProviderIds,
	selectCatalogProvidersById,
	selectCatalogStatus,
	selectProviders,
	useWizardStore,
} from "~/lib/store/wizard-store";
import { ProviderRow } from "./provider-row";

// Extend ProviderSummary with setup instructions for UI
interface UIProvider extends ProviderSummary {
	setupSteps?: string;
	popular?: boolean;
}

// Popular provider IDs (client-side definition)
const POPULAR_PROVIDER_IDS = [
	"anthropic",
	"openai",
	"google",
	"openrouter",
	"groq",
];

const AUTH_FILTER_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "oauth", label: "OAuth" },
	{ value: "api_key", label: "API Key" },
] as const;

export function ProviderList() {
	const [search, setSearch] = useState("");
	const [authFilter, setAuthFilter] = useState<"all" | "oauth" | "api_key">(
		"all",
	);

	const selectedProviders = useWizardStore(selectProviders);
	const toggleProvider = useWizardStore((s) => s.toggleProvider);

	// Use stable selectors - derive list in component with useMemo
	const providerIds = useWizardStore(selectCatalogProviderIds);
	const providersById = useWizardStore(selectCatalogProvidersById);
	const catalogStatus = useWizardStore(selectCatalogStatus);

	// Safe to derive here - useMemo ensures stable reference when deps unchanged
	const catalogProviders = useMemo(
		() => providerIds.map((id) => providersById[id]).filter(Boolean),
		[providerIds, providersById],
	);
	const catalogError = useWizardStore((s) => s.catalog.error);
	const ensureProvidersLoaded = useWizardStore((s) => s.ensureProvidersLoaded);

	// Load catalog on mount (idempotent - won't refetch if already loaded)
	useEffect(() => {
		void ensureProvidersLoaded();
	}, [ensureProvidersLoaded]);

	// Enrich catalog providers with client-side metadata
	const providers: UIProvider[] = useMemo(() => {
		return catalogProviders.map((p) => ({
			...p,
			setupSteps: generateSetupInstructions(p.envHints, p.docUrl),
			popular: POPULAR_PROVIDER_IDS.includes(p.id),
		}));
	}, [catalogProviders]);

	const popularProviders = useMemo(
		() => providers.filter((p) => p.popular),
		[providers],
	);

	// Filter providers by search
	const filteredProviders = useMemo(() => {
		let result = providers;

		// Apply auth type filter
		if (authFilter !== "all") {
			result = result.filter((p) => p.authType === authFilter);
		}

		// Then apply search filter
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
			);
		}

		return result;
	}, [search, authFilter, providers]);

	// Quick select popular providers
	const handlePopularClick = (providerId: string) => {
		toggleProvider(providerId);
	};

	if (catalogStatus === "loading" || catalogStatus === "idle") {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-muted-foreground">Loading providers...</div>
			</div>
		);
	}

	if (catalogStatus === "error") {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-4">
				<div className="text-destructive">
					Failed to load providers: {catalogError}
				</div>
				<button
					type="button"
					onClick={() => void ensureProvidersLoaded()}
					className="text-sm text-primary hover:underline"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Search */}
			<div className="flex gap-3 items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search providers..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<SimpleSelect
					options={[...AUTH_FILTER_OPTIONS]}
					value={authFilter}
					onChange={(value) =>
						setAuthFilter(value as "all" | "oauth" | "api_key")
					}
					triggerClassName="w-[100px]"
				/>
			</div>

			{/* Popular pills */}
			<div className="flex flex-wrap gap-2">
				<span className="text-sm text-muted-foreground">Popular:</span>
				{popularProviders.map((provider) => (
					<button
						key={provider.id}
						type="button"
						onClick={() => handlePopularClick(provider.id)}
					>
						<Badge
							variant={
								selectedProviders.includes(provider.id) ? "default" : "outline"
							}
							className="cursor-pointer hover:bg-primary/10"
						>
							{provider.name}
						</Badge>
					</button>
				))}
			</div>

			{/* Provider list */}
			<div className="flex flex-col gap-2">
				{filteredProviders.map((provider) => (
					<ProviderRow
						key={provider.id}
						provider={provider}
						selected={selectedProviders.includes(provider.id)}
						onToggle={() => toggleProvider(provider.id)}
					/>
				))}
				{filteredProviders.length === 0 && (
					<p className="text-center text-muted-foreground py-8">
						{authFilter !== "all" && search.trim()
							? `No ${authFilter === "oauth" ? "OAuth" : "API Key"} providers found matching "${search}"`
							: authFilter !== "all"
								? `No ${authFilter === "oauth" ? "OAuth" : "API Key"} providers available`
								: `No providers found matching "${search}"`}
					</p>
				)}
			</div>

			{/* Selection count */}
			{selectedProviders.length > 0 && (
				<p className="text-sm text-muted-foreground">
					{selectedProviders.length} provider
					{selectedProviders.length !== 1 ? "s" : ""} selected
				</p>
			)}
		</div>
	);
}
