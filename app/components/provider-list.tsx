import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { getPopularProviders, MOCK_PROVIDERS } from "~/lib/mock/catalog";
import { selectProviders, useWizardStore } from "~/lib/store/wizard-store";
import { ProviderRow } from "./provider-row";

export function ProviderList() {
	const [search, setSearch] = useState("");
	const selectedProviders = useWizardStore(selectProviders);
	const toggleProvider = useWizardStore((s) => s.toggleProvider);

	const popularProviders = useMemo(() => getPopularProviders(), []);

	// Filter providers by search
	const filteredProviders = useMemo(() => {
		if (!search.trim()) return MOCK_PROVIDERS;
		const q = search.toLowerCase();
		return MOCK_PROVIDERS.filter(
			(p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
		);
	}, [search]);

	// Quick select popular providers
	const handlePopularClick = (providerId: string) => {
		if (!selectedProviders.includes(providerId)) {
			toggleProvider(providerId);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search providers..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
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
						No providers found matching "{search}"
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
