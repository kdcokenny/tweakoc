import type { KVNamespace } from "@cloudflare/workers-types";
import { getOAuthProviders } from "./opencode-oauth";
import { inferAuthType } from "./provider-meta";
import type { ModelListItem, ProviderSummary } from "./types";

// models.dev API types
interface ModelsDevProvider {
	id: string;
	name: string;
	env: string[];
	npm: string;
	doc: string;
	api?: string;
	models: Record<string, ModelsDevModel>;
}

interface ModelsDevModel {
	id: string;
	name: string;
	family: string;
	status?: "deprecated";
	// ... other fields we don't need
}

interface Catalog {
	providers: Record<string, ModelsDevProvider>;
	fetchedAt: number;
}

// Module-level cache with stampede protection
let catalogCache: { value: Catalog; expiresAt: number } | null = null;
let inFlightFetch: Promise<Catalog> | null = null;

const MODELS_DEV_URL = "https://models.dev/api.json";
const KV_KEY = "catalog:models-dev";
const KV_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchFromModelsDevRemote(): Promise<Catalog> {
	const response = await fetch(MODELS_DEV_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch models.dev: ${response.status}`);
	}
	const providers = (await response.json()) as Record<
		string,
		ModelsDevProvider
	>;
	return { providers, fetchedAt: Date.now() };
}

export async function getCatalog(kv: KVNamespace): Promise<Catalog> {
	// Check in-memory cache first
	if (catalogCache && Date.now() < catalogCache.expiresAt) {
		return catalogCache.value;
	}

	// Stampede protection: if a fetch is in flight, await it
	if (inFlightFetch) {
		return inFlightFetch;
	}

	// Start the fetch with stampede protection
	inFlightFetch = (async () => {
		try {
			// Try KV cache
			const kvData = (await kv.get(KV_KEY, "json")) as Catalog | null;
			if (kvData) {
				catalogCache = { value: kvData, expiresAt: Date.now() + MEMORY_TTL_MS };
				return kvData;
			}

			// Fetch from remote
			const catalog = await fetchFromModelsDevRemote();

			// Store in KV (non-blocking)
			await kv.put(KV_KEY, JSON.stringify(catalog), {
				expirationTtl: KV_TTL_SECONDS,
			});

			// Update memory cache
			catalogCache = { value: catalog, expiresAt: Date.now() + MEMORY_TTL_MS };

			return catalog;
		} finally {
			inFlightFetch = null;
		}
	})();

	return inFlightFetch;
}

// Transform catalog to provider summaries with OAuth provider detection
export async function transformProviders(
	catalog: Catalog,
	kv?: KVNamespace,
): Promise<ProviderSummary[]> {
	// Fetch OAuth providers (graceful on failure)
	let oauthProviders = new Set<string>();
	if (kv) {
		try {
			oauthProviders = await getOAuthProviders(kv);
		} catch (error) {
			console.warn(
				"OAuth provider fetch failed, continuing with env-hint inference:",
				error,
			);
		}
	}

	return Object.values(catalog.providers)
		.map((provider) => ({
			id: provider.id,
			name: provider.name,
			authType: inferAuthType({
				envHints: provider.env,
				providerId: provider.id,
				oauthProviders,
			}),
			envHints: provider.env,
			modelCount: Object.keys(provider.models).length,
			docUrl: provider.doc,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

// Transform models for a specific provider with filtering and pagination
export function transformModels(
	catalog: Catalog,
	providerId: string,
	query?: string,
	offset = 0,
	limit = 20,
): { items: ModelListItem[]; total: number; hasMore: boolean } {
	const provider = catalog.providers[providerId];
	if (!provider) {
		return { items: [], total: 0, hasMore: false };
	}

	// Get all non-deprecated models, sorted by id
	let models = Object.values(provider.models)
		.filter((m) => m.status !== "deprecated")
		.map((m) => ({ id: m.id, name: m.name }))
		.sort((a, b) => a.id.localeCompare(b.id));

	// Apply search filter if query provided
	if (query) {
		const q = query.toLowerCase();
		models = models.filter(
			(m) =>
				m.id.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q),
		);
	}

	const total = models.length;
	const items = models.slice(offset, offset + limit);
	const hasMore = offset + limit < total;

	return { items, total, hasMore };
}

// Check if a provider exists in catalog
export function providerExists(catalog: Catalog, providerId: string): boolean {
	return providerId in catalog.providers;
}
