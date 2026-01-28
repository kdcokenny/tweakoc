// Type-safe route constants
export const ROUTES = {
	home: "/",
	harness: (harnessId: string) => `/h/${harnessId}`,
	flow: {
		providers: "/flow/providers",
		slot: (slotId: string) => `/flow/slot/${slotId}`,
		options: "/flow/options",
		review: "/flow/review",
	},
} as const;
