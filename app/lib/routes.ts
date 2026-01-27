// Type-safe route constants
export const ROUTES = {
	home: "/",
	harness: (harnessId: string) => `/h/${harnessId}`,
	flow: {
		providers: "/flow/providers",
		modelsPrimary: "/flow/models/primary",
		modelsSecondary: "/flow/models/secondary",
		options: "/flow/options",
		review: "/flow/review",
	},
} as const;

// Map stepId to type-safe route path (for navigation)
export const STEP_ROUTES: Record<string, string> = {
	harness: ROUTES.home,
	providers: ROUTES.flow.providers,
	primary: ROUTES.flow.modelsPrimary,
	secondary: ROUTES.flow.modelsSecondary,
	options: ROUTES.flow.options,
	review: ROUTES.flow.review,
};
