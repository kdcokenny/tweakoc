import type { KVNamespace } from "@cloudflare/workers-types";

interface OAuthProviderCache {
	providers: string[];
	fetchedAt: number;
	releaseTag: string;
}

/**
 * Validate KV cache data (Parse, Don't Validate)
 */
function isValidOAuthCache(data: unknown): data is OAuthProviderCache {
	if (typeof data !== "object" || data === null) {
		return false;
	}

	const obj = data as Record<string, unknown>;

	return (
		"providers" in obj &&
		Array.isArray(obj.providers) &&
		obj.providers.every((p): p is string => typeof p === "string") &&
		"fetchedAt" in obj &&
		typeof obj.fetchedAt === "number" &&
		"releaseTag" in obj &&
		typeof obj.releaseTag === "string"
	);
}

// Module-level cache with stampede protection
let providerCache: { value: Set<string>; expiresAt: number } | null = null;
let inFlightFetch: Promise<Set<string>> | null = null;

const KV_KEY = "oauth:providers";
const KV_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GITHUB_RELEASES_API =
	"https://api.github.com/repos/anomalyco/opencode/releases/latest";
const RAW_BASE_URL = "https://raw.githubusercontent.com/anomalyco/opencode";
const UNPKG_BASE_URL = "https://unpkg.com";
const FETCH_TIMEOUT_MS = 10000;

/**
 * Fetch the latest release tag from GitHub
 */
async function getLatestReleaseTag(githubToken?: string): Promise<string> {
	const headers: Record<string, string> = {
		"User-Agent": "tweakoc-oauth-sync",
		Accept: "application/vnd.github+json",
	};

	// Support optional GitHub token for higher rate limits
	if (githubToken) {
		headers.Authorization = `Bearer ${githubToken}`;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(GITHUB_RELEASES_API, {
			headers,
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(
				`GitHub API returned ${response.status}: ${response.statusText}`,
			);
		}

		const data = (await response.json()) as { tag_name?: string };
		if (!data.tag_name) {
			throw new Error("GitHub API response missing tag_name");
		}

		return data.tag_name;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Fetch raw plugin files from GitHub
 */
async function fetchPluginFiles(tag: string): Promise<string[]> {
	const files = ["index.ts", "copilot.ts", "codex.ts"];
	const baseUrl = `${RAW_BASE_URL}/${tag}/packages/opencode/src/plugin`;

	const results = await Promise.allSettled(
		files.map(async (file) => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

			try {
				const response = await fetch(`${baseUrl}/${file}`, {
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch ${file}: ${response.status} ${response.statusText}`,
					);
				}

				return await response.text();
			} finally {
				clearTimeout(timeoutId);
			}
		}),
	);

	return results
		.filter(
			(r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
		)
		.map((r) => r.value);
}

/**
 * Parse BUILTIN packages array from index.ts
 */
function parseBUILTINPackages(indexContent: string): string[] {
	// Match: const BUILTIN = [...] up to the closing bracket
	const builtinMatch = indexContent.match(
		/const\s+BUILTIN\s*=\s*\[([\s\S]*?)\]/,
	);
	if (!builtinMatch) {
		return [];
	}

	const arrayContent = builtinMatch[1];
	// Extract quoted strings (package names)
	const packageMatches = arrayContent.matchAll(/["']([^"']+)["']/g);

	const packages: string[] = [];
	for (const match of packageMatches) {
		const pkg = match[1];
		// Remove version specifiers: handle @scope/package@version and package@version
		const atIndex = pkg.lastIndexOf("@");
		let cleanPkg = pkg;
		if (atIndex > 0) {
			// Not at start (scoped package)
			const afterAt = pkg.slice(atIndex + 1);
			// If it looks like a version (starts with digit or ^~)
			if (/^[\d^~]/.test(afterAt)) {
				cleanPkg = pkg.slice(0, atIndex);
			}
		}
		if (cleanPkg) {
			packages.push(cleanPkg);
		}
	}

	return packages;
}

/**
 * Fetch external plugin from unpkg with fallback
 */
async function fetchExternalPlugin(packageName: string): Promise<string> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		// Try index.mjs first
		const mjsUrl = `${UNPKG_BASE_URL}/${packageName}/index.mjs`;
		const mjsResponse = await fetch(mjsUrl, { signal: controller.signal });

		if (mjsResponse.ok) {
			return await mjsResponse.text();
		}

		// Fallback: fetch package.json and resolve module/main
		const pkgJsonUrl = `${UNPKG_BASE_URL}/${packageName}/package.json`;
		const pkgResponse = await fetch(pkgJsonUrl, { signal: controller.signal });

		if (!pkgResponse.ok) {
			throw new Error(
				`Failed to fetch package.json for ${packageName}: ${pkgResponse.status}`,
			);
		}

		const pkgJson = (await pkgResponse.json()) as {
			module?: string;
			main?: string;
		};
		const entrypoint = pkgJson.module || pkgJson.main;

		if (!entrypoint) {
			throw new Error(
				`No module or main field in package.json for ${packageName}`,
			);
		}

		const entrypointUrl = `${UNPKG_BASE_URL}/${packageName}/${entrypoint}`;
		const entryResponse = await fetch(entrypointUrl, {
			signal: controller.signal,
		});

		if (!entryResponse.ok) {
			throw new Error(
				`Failed to fetch ${entrypoint} for ${packageName}: ${entryResponse.status}`,
			);
		}

		return await entryResponse.text();
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Parse OAuth provider IDs from plugin file content
 */
function parseOAuthProviders(content: string): string[] {
	// Only extract if file contains OAuth type declaration
	if (
		!content.includes('type: "oauth"') &&
		!content.includes("type: 'oauth'")
	) {
		return [];
	}

	// Extract provider IDs using anchored regex
	const providerRegex = /provider:\s*["']([a-z0-9-]+)["']/gi;
	const providers: string[] = [];

	let match = providerRegex.exec(content);
	while (match !== null) {
		const providerId = match[1].toLowerCase();
		if (!providers.includes(providerId)) {
			providers.push(providerId);
		}
		match = providerRegex.exec(content);
	}

	return providers;
}

/**
 * Fetch and parse all OAuth providers from OpenCode
 */
async function fetchOAuthProvidersFromGitHub(
	githubToken?: string,
): Promise<OAuthProviderCache> {
	// Get latest release tag
	const releaseTag = await getLatestReleaseTag(githubToken);

	// Fetch built-in plugin files
	const pluginContents = await fetchPluginFiles(releaseTag);
	const [indexContent] = pluginContents;

	// Parse OAuth providers from built-in files
	const providers = new Set<string>();
	for (const content of pluginContents) {
		const oauthProviders = parseOAuthProviders(content);
		for (const providerId of oauthProviders) {
			providers.add(providerId);
		}
	}

	// Parse and fetch external packages
	const externalPackages = parseBUILTINPackages(indexContent);
	const externalContents = await Promise.allSettled(
		externalPackages.map((pkg) => fetchExternalPlugin(pkg)),
	);

	// Parse OAuth providers from external packages
	for (const result of externalContents) {
		if (result.status === "fulfilled") {
			const oauthProviders = parseOAuthProviders(result.value);
			for (const providerId of oauthProviders) {
				providers.add(providerId);
			}
		}
		// Silently ignore failed external package fetches
	}

	return {
		providers: Array.from(providers).sort(),
		fetchedAt: Date.now(),
		releaseTag,
	};
}

/**
 * Get OAuth-capable provider IDs with 3-tier caching
 */
export async function getOAuthProviders(
	kv: KVNamespace,
	githubToken?: string,
): Promise<Set<string>> {
	// Check in-memory cache first
	if (providerCache && Date.now() < providerCache.expiresAt) {
		return new Set(providerCache.value);
	}

	// Stampede protection: if a fetch is in flight, await it
	if (inFlightFetch) {
		return inFlightFetch;
	}

	// Start the fetch with stampede protection
	inFlightFetch = (async () => {
		try {
			// Try KV cache
			const kvData = await kv.get(KV_KEY, "json");
			const validCachedData =
				isValidOAuthCache(kvData) && kvData.providers.length > 0
					? kvData
					: null;

			if (validCachedData) {
				const providersSet = new Set(validCachedData.providers);
				providerCache = {
					value: providersSet,
					expiresAt: Date.now() + MEMORY_TTL_MS,
				};
				return providersSet;
			}

			// Fetch from GitHub
			const cacheData = await fetchOAuthProvidersFromGitHub(githubToken);

			// Only cache on success (non-empty set)
			if (cacheData.providers.length > 0) {
				// Store in KV
				await kv.put(KV_KEY, JSON.stringify(cacheData), {
					expirationTtl: KV_TTL_SECONDS,
				});

				// Update memory cache
				const providersSet = new Set(cacheData.providers);
				providerCache = {
					value: providersSet,
					expiresAt: Date.now() + MEMORY_TTL_MS,
				};

				return providersSet;
			}

			// GitHub returned empty, and KV cache was either invalid or empty
			// Return empty set
			return new Set<string>();
		} catch (error) {
			// On error, try to return last-known-good from KV
			const kvData = await kv.get(KV_KEY, "json");
			if (isValidOAuthCache(kvData) && kvData.providers.length > 0) {
				const providersSet = new Set(kvData.providers);
				providerCache = {
					value: providersSet,
					expiresAt: Date.now() + MEMORY_TTL_MS,
				};
				return providersSet;
			}

			// No fallback available, re-throw
			throw error;
		} finally {
			inFlightFetch = null;
		}
	})();

	return inFlightFetch;
}
