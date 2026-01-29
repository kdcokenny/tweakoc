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
		index("routes/home.tsx"),

		// Deep link handler
		route("h/:harnessId", "routes/harness.tsx"),

		// Flow steps
		route("flow/providers", "routes/flow/providers.tsx"),
		route("flow/page/:pageId", "routes/flow/page.$pageId.tsx"),
		route("flow/slot/:slotId", "routes/flow/slot.$slotId.tsx"),
		route("flow/options", "routes/flow/options.tsx"),
		route("flow/review", "routes/flow/review.tsx"),
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
