import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { z } from "zod";
import {
	DependencyListSchema,
	formatZodIssues,
	parseDependencies,
} from "~/lib/dependency-utils.js";
import type {
	CreateProfileRequest,
	GeneratedFile,
	StoredProfile,
} from "./types";

const PROFILE_PREFIX = "profile:";
const PROFILE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const RATE_LIMIT_PREFIX = "ratelimit:";
const RATE_LIMIT_MAX = 60; // 60 requests per hour per IP

const StoredProfileSchema = z
	.object({
		componentId: z.string().min(1),
		request: z
			.object({
				harnessId: z.string().min(1),
				slotValues: z.record(z.string(), z.unknown()),
			})
			.strict(),
		files: z
			.array(
				z
					.object({
						path: z.string().min(1),
						content: z.string(),
					})
					.strict(),
			)
			.min(1),
		dependencies: DependencyListSchema,
		createdAt: z.string().datetime(),
		lastAccessedAt: z.string().datetime(),
	})
	.strict();

export class StoredProfileParseError extends Error {
	readonly componentId: string;

	constructor(componentId: string, detail: string) {
		super(`Stored profile ${componentId} ${detail}`);
		this.name = "StoredProfileParseError";
		this.componentId = componentId;
	}
}

function parseStoredProfile(componentId: string, raw: string): StoredProfile {
	let parsedRaw: unknown;
	try {
		parsedRaw = JSON.parse(raw);
	} catch (error) {
		throw new StoredProfileParseError(
			componentId,
			`contains invalid JSON: ${String(error instanceof Error ? error.message : error)}`,
		);
	}

	const parsed = StoredProfileSchema.safeParse(parsedRaw);
	if (!parsed.success) {
		throw new StoredProfileParseError(
			componentId,
			`is malformed: ${formatZodIssues(parsed.error.issues)}`,
		);
	}

	if (parsed.data.componentId !== componentId) {
		throw new StoredProfileParseError(
			componentId,
			`has mismatched componentId: ${parsed.data.componentId}`,
		);
	}

	return parsed.data;
}

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
	dependencies: string[],
): Promise<boolean> {
	const key = getProfileKey(componentId);

	// Check if already exists (immutability)
	const existing = await kv.get(key);
	if (existing !== null) {
		return false; // ID collision - caller should retry with new ID
	}

	const now = new Date().toISOString();

	const profile: StoredProfile = {
		componentId,
		request,
		files,
		dependencies: parseDependencies(dependencies),
		createdAt: now,
		lastAccessedAt: now,
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
	const raw = await kv.get(key);

	if (raw === null) {
		return null;
	}

	const data = parseStoredProfile(componentId, raw);

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
