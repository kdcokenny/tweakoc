import type { ProviderAuthType } from "./types";

export interface InferAuthTypeOptions {
	envHints: string[];
	providerId?: string;
	oauthProviders?: Set<string>;
}

/**
 * Infer auth type from environment variable hints and OAuth provider set.
 * OAuth set is authoritative - if provider is in set, it's OAuth.
 * Falls back to env-hint inference if provider not found in OAuth set.
 */
export function inferAuthType(
	optionsOrEnvHints: InferAuthTypeOptions | string[],
): ProviderAuthType {
	// Guard: Handle backward-compatible array signature
	const options = Array.isArray(optionsOrEnvHints)
		? { envHints: optionsOrEnvHints }
		: optionsOrEnvHints;

	const { envHints, providerId, oauthProviders } = options;

	// Check OAuth set first (authoritative source)
	if (providerId && oauthProviders?.has(providerId.toLowerCase())) {
		return "oauth";
	}

	// Keep existing env-hint logic as fallback
	const hints = envHints.map((h) => h.toUpperCase());

	// AWS credentials
	if (
		hints.some((h) => h.includes("AWS_ACCESS_KEY") || h.includes("AWS_SECRET"))
	) {
		return "aws_creds";
	}

	// Google OAuth / service account
	if (hints.some((h) => h.includes("GOOGLE_APPLICATION_CREDENTIALS"))) {
		return "oauth";
	}

	// Local providers (no API key, just host/URL)
	if (hints.length === 0) {
		return "local";
	}
	if (
		hints.every(
			(h) =>
				h.includes("HOST") || h.includes("BASE_URL") || h.includes("ENDPOINT"),
		) &&
		!hints.some((h) => h.includes("KEY"))
	) {
		return "local";
	}

	// API Key (most common - any hint containing KEY or TOKEN)
	if (
		hints.some(
			(h) => h.includes("API_KEY") || h.includes("_KEY") || h.includes("TOKEN"),
		)
	) {
		return "api_key";
	}

	// Gateway (has both endpoint and key)
	if (
		hints.some((h) => h.includes("ENDPOINT") || h.includes("HOST")) &&
		hints.some((h) => h.includes("KEY"))
	) {
		return "gateway";
	}

	// Default to api_key if there are any env hints (most providers use API keys)
	if (hints.length > 0) {
		return "api_key";
	}

	return "unknown";
}

export interface GenerateSetupOptions {
	envHints: string[];
	docUrl?: string;
	isOAuth?: boolean;
	providerName?: string;
}

/**
 * Generate setup instructions from environment variable hints.
 * For OAuth providers, provides simplified browser-based instructions.
 * Otherwise, provides env var setup instructions.
 */
export function generateSetupInstructions(
	optionsOrEnvHints: GenerateSetupOptions | string[],
	legacyDocUrl?: string,
): string {
	// Guard: Handle backward-compatible array signature
	const options = Array.isArray(optionsOrEnvHints)
		? { envHints: optionsOrEnvHints, docUrl: legacyDocUrl }
		: optionsOrEnvHints;

	const { envHints, docUrl, isOAuth, providerName } = options;

	// OAuth providers have simplified setup via /connect
	if (isOAuth) {
		return `Run /connect → select ${providerName || "provider"} → authenticate in browser`;
	}

	// Keep existing env var instructions logic
	const lines: string[] = [];

	if (envHints.length === 0) {
		lines.push("No environment variables required.");
		lines.push("This provider may run locally or use default configuration.");
	} else {
		lines.push("Set the following environment variable(s):");
		lines.push("");
		for (const hint of envHints) {
			lines.push(`  export ${hint}="your-value-here"`);
		}
	}

	if (docUrl) {
		lines.push("");
		lines.push(`Documentation: ${docUrl}`);
	}

	return lines.join("\n");
}

// Keep for backward compatibility but mark as deprecated
/** @deprecated Use inferAuthType instead */
export function getProviderAuthType(_providerId: string): ProviderAuthType {
	return "unknown"; // No longer used - inference happens at catalog level
}

/** @deprecated Use generateSetupInstructions instead */
export function getProviderSetupInstructions(
	_providerId: string,
): string | undefined {
	return undefined; // No longer used
}
