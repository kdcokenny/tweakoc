import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import type {
	CreateProfileRequest,
	GeneratedFile,
	StoredProfile,
} from "./types";

const PROFILE_PREFIX = "profile:";
const PROFILE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const RATE_LIMIT_PREFIX = "ratelimit:";
const RATE_LIMIT_MAX = 60; // 60 requests per hour per IP

function getProfileKey(componentId: string): string {
	return `${PROFILE_PREFIX}${componentId}`;
}

function getRateLimitKey(ip: string): string {
	const hour = Math.floor(Date.now() / (60 * 60 * 1000));
	return `${RATE_LIMIT_PREFIX}${ip}:${hour}`;
}

/**
 * Save profile to KV storage
 * Returns false if ID already exists (immutability enforcement)
 */
export async function saveProfile(
	kv: KVNamespace,
	componentId: string,
	request: CreateProfileRequest,
	files: GeneratedFile[],
): Promise<boolean> {
	const key = getProfileKey(componentId);

	// Check if already exists (immutability)
	const existing = await kv.get(key);
	if (existing !== null) {
		return false; // ID collision - caller should retry with new ID
	}

	const profile: StoredProfile = {
		componentId,
		request,
		files,
		createdAt: new Date().toISOString(),
		lastAccessedAt: new Date().toISOString(),
	};

	await kv.put(key, JSON.stringify(profile), {
		expirationTtl: PROFILE_TTL_SECONDS,
	});

	return true;
}

/**
 * Get profile from KV storage and extend TTL
 */
export async function getProfile(
	kv: KVNamespace,
	componentId: string,
	ctx?: ExecutionContext,
): Promise<StoredProfile | null> {
	const key = getProfileKey(componentId);
	const data = (await kv.get(key, "json")) as StoredProfile | null;

	if (!data) {
		return null;
	}

	// Extend TTL by updating lastAccessedAt (non-blocking)
	const updated: StoredProfile = {
		...data,
		lastAccessedAt: new Date().toISOString(),
	};

	const ttlUpdate = kv.put(key, JSON.stringify(updated), {
		expirationTtl: PROFILE_TTL_SECONDS,
	});

	if (ctx) {
		ctx.waitUntil(ttlUpdate);
	} else {
		await ttlUpdate;
	}

	return data;
}

/**
 * Check if IP is within rate limit
 * Returns true if allowed, false if rate limited
 */
export async function checkRateLimit(
	kv: KVNamespace,
	ip: string,
): Promise<boolean> {
	const key = getRateLimitKey(ip);
	const current = await kv.get(key);
	const count = current ? Number.parseInt(current, 10) : 0;

	if (count >= RATE_LIMIT_MAX) {
		return false; // Rate limited
	}

	// Increment counter (expires after 1 hour)
	await kv.put(key, String(count + 1), { expirationTtl: 3600 });
	return true;
}
