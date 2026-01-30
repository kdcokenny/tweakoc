// Type-safe route constants
export const ROUTES = {
	home: "/",
	harness: (harnessId: string) => `/h/${harnessId}`,
	flow: {
		providers: (harnessId: string) => `/flow/${harnessId}/providers`,
		page: (harnessId: string, pageId: string) =>
			`/flow/${harnessId}/page/${pageId}`,
		slot: (harnessId: string, slotId: string) =>
			`/flow/${harnessId}/slot/${slotId}`,
		review: (harnessId: string) => `/flow/${harnessId}/review`,
	},
} as const;
