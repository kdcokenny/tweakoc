/**
 * Type-safe API route constants.
 * Similar to ROUTES in lib/routes.ts but for API endpoints.
 */
export const API_ROUTES = {
	providers: {
		list: () => "/api/providers" as const,
		models: (providerId: string, params?: URLSearchParams) =>
			`/api/providers/${encodeURIComponent(providerId)}/models${params ? `?${params}` : ""}` as const,
	},
	profiles: {
		create: () => "/api/profiles" as const,
		get: (componentId: string) =>
			`/api/profiles/${encodeURIComponent(componentId)}` as const,
	},
} as const;
