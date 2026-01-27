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
		route("flow/models/primary", "routes/flow/models-primary.tsx"),
		route("flow/models/secondary", "routes/flow/models-secondary.tsx"),
		route("flow/options", "routes/flow/options.tsx"),
		route("flow/review", "routes/flow/review.tsx"),
	]),
] satisfies RouteConfig;
