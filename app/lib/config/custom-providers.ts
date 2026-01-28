/**
 * Configuration for custom providers that need additional setup instructions.
 * Built-in providers (from models.dev) just need /connect.
 * Custom providers may need extra steps before /connect works.
 */

export interface CustomProviderConfig {
	/** Display name (if different from models.dev) */
	name?: string;
	/** Documentation URL (if different from models.dev) */
	docUrl?: string;
	/** Markdown instructions for additional setup */
	customInstructions: string;
}

/**
 * Map of provider IDs to their custom configuration.
 * If a provider is in this map, it will show expandable setup instructions.
 * If not, it will just show a doc link.
 */
export const CUSTOM_PROVIDERS: Record<string, CustomProviderConfig> = {
	// Add custom providers here as needed
};

/**
 * Check if a provider has custom setup instructions.
 */
export function isCustomProvider(providerId: string): boolean {
	return providerId in CUSTOM_PROVIDERS;
}

/**
 * Get custom config for a provider, or undefined if it's a built-in provider.
 */
export function getCustomProviderConfig(
	providerId: string,
): CustomProviderConfig | undefined {
	return CUSTOM_PROVIDERS[providerId];
}
