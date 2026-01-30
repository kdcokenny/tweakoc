import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	// Root layout wraps all wizard routes
	layout("routes/root-layout.tsx", [
		// Step 1: Harness selection
		index("routes/home.tsx", { id: "home" }),

		// Legacy deep link handler
		route("h/:harnessId", "routes/harness.tsx"),

		// Flow steps with harnessId in path
		route("flow/:harnessId", "routes/flow/layout.tsx", { id: "flow-layout" }, [
			route("providers", "routes/flow/providers.tsx"),
			route("page/:pageId", "routes/flow/page.$pageId.tsx"),
			route("slot/:slotId", "routes/flow/slot.$slotId.tsx"),
			route("review", "routes/flow/review.tsx"),
		]),
	]),

	// API routes (resource routes, no UI)
	route("api/providers", "routes/api.providers.ts"),
	route("api/providers/:id/models", "routes/api.providers.$id.models.ts"),
	route("api/profiles", "routes/api.profiles.ts"),
	route("api/profiles/:id", "routes/api.profiles.$id.ts"),

	// OCX Registry routes
	route("r/index.json", "routes/r.index[.]json.ts"),
	route("r/components/*", "routes/r.components.$.ts"),
] satisfies RouteConfig;
