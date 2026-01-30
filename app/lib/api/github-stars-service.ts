import type { KVNamespace } from "@cloudflare/workers-types";
import { z } from "zod";

// GitHub API response schema (parse, don't validate)
const GitHubRepoSchema = z.object({
	stargazers_count: z.number(),
});

// KV cache schema
const CachedStarsSchema = z.object({
	count: z.number(),
	fetchedAt: z.number(),
});

type CachedStars = z.infer<typeof CachedStarsSchema>;

// Module-level cache with stampede protection
let starsCache: { value: number; expiresAt: number } | null = null;
let inFlightFetch: Promise<number | null> | null = null;

const GITHUB_REPO = "kdcokenny/tweakoc";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}`;
const KV_KEY = "github:stars:kdcokenny/tweakoc";
const KV_TTL_SECONDS = 60 * 60; // 1 hour
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for failures

// Track failure state for negative caching
let failureCache: { expiresAt: number } | null = null;

async function fetchFromGitHub(token?: string): Promise<number> {
	const headers: HeadersInit = {
		Accept: "application/vnd.github+json",
		"User-Agent": "TweakOC/1.0",
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(GITHUB_API_URL, { headers });
	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const data = await response.json();
	const parsed = GitHubRepoSchema.parse(data);
	return parsed.stargazers_count;
}

export async function getGitHubStars(
	kv: KVNamespace,
	token?: string,
): Promise<number | null> {
	// 1. Check in-memory cache first (always)
	if (starsCache && Date.now() < starsCache.expiresAt) {
		return starsCache.value;
	}

	// 2. Stampede protection
	if (inFlightFetch) {
		return inFlightFetch;
	}

	// Start fetch with stampede protection
	inFlightFetch = (async () => {
		try {
			// 3. Try KV cache (always, even if negative cache is set)
			const kvData = await kv.get(KV_KEY, "json");
			if (kvData) {
				const parsed = CachedStarsSchema.safeParse(kvData);
				if (parsed.success) {
					starsCache = {
						value: parsed.data.count,
						expiresAt: Date.now() + MEMORY_TTL_MS,
					};
					return parsed.data.count;
				}
			}

			// 4. Check negative cache ONLY before GitHub API call
			if (failureCache && Date.now() < failureCache.expiresAt) {
				return null;
			}

			// 5. Fetch from GitHub
			const count = await fetchFromGitHub(token);

			// 6. Update memory cache FIRST (before KV)
			starsCache = { value: count, expiresAt: Date.now() + MEMORY_TTL_MS };

			// 7. Clear failure cache on success
			failureCache = null;

			// 8. Try to update KV (best-effort, don't let it fail the return)
			try {
				const cacheData: CachedStars = { count, fetchedAt: Date.now() };
				await kv.put(KV_KEY, JSON.stringify(cacheData), {
					expirationTtl: KV_TTL_SECONDS,
				});
			} catch (kvError) {
				console.error("Failed to write GitHub stars to KV:", kvError);
				// Don't set negative cache - we have valid data
			}

			return count;
		} catch (error) {
			console.error("Failed to fetch GitHub stars:", error);

			// Set negative cache only for GitHub fetch failures
			failureCache = { expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS };

			return null;
		} finally {
			inFlightFetch = null;
		}
	})();

	return inFlightFetch;
}
