import { isValidComponentId } from "~/lib/api/id-generator";
import { getProfile } from "~/lib/api/profile-store";
import { SITE_ORIGIN } from "~/lib/config";
import type { Route } from "./+types/r.components.$";

// Immutable cache headers for registry content
const IMMUTABLE_HEADERS = {
	"Cache-Control": "public, max-age=31536000, immutable",
};

export async function loader({ params, context }: Route.LoaderArgs) {
	const path = params["*"];
	if (!path) {
		return new Response("Not Found", { status: 404 });
	}

	// Check if this is a packument request (ends with .json)
	if (path.endsWith(".json")) {
		return handlePackument(path, context);
	}

	// Otherwise it's a file request
	return handleFile(path, context);
}

async function handlePackument(
	path: string,
	context: Route.LoaderArgs["context"],
) {
	// Extract componentId from path (e.g., "p-abc12345.json" -> "p-abc12345")
	const componentId = path.replace(/\.json$/, "");

	if (!isValidComponentId(componentId)) {
		return new Response("Not Found", { status: 404 });
	}

	const kv = context.cloudflare.env.PROFILES_KV;
	const profile = await getProfile(kv, componentId);

	if (!profile) {
		return new Response("Not Found", { status: 404 });
	}

	// Build minimal OCX packument (only required fields)
	const files = profile.files.map((f) => ({
		path: f.path,
		target: f.path, // Flat paths for profiles
		content: f.content, // Include content for UI consumption
	}));

	const packument = {
		name: componentId,
		"dist-tags": { latest: "1.0.0" },
		versions: {
			"1.0.0": {
				name: componentId,
				type: "ocx:profile",
				description: `Generated profile from ${new URL(SITE_ORIGIN).hostname}`,
				files,
				dependencies: [],
			},
		},
	};

	return new Response(JSON.stringify(packument, null, 2), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...IMMUTABLE_HEADERS,
		},
	});
}

async function handleFile(path: string, context: Route.LoaderArgs["context"]) {
	// Parse path: "p-abc12345/opencode.jsonc" -> componentId="p-abc12345", filePath="opencode.jsonc"
	const slashIndex = path.indexOf("/");
	if (slashIndex === -1) {
		return new Response("Not Found", { status: 404 });
	}

	const componentId = path.slice(0, slashIndex);
	const filePath = path.slice(slashIndex + 1);

	if (!isValidComponentId(componentId) || !filePath) {
		return new Response("Not Found", { status: 404 });
	}

	const kv = context.cloudflare.env.PROFILES_KV;
	const profile = await getProfile(kv, componentId);

	if (!profile) {
		return new Response("Not Found", { status: 404 });
	}

	// Find the requested file
	const file = profile.files.find((f) => f.path === filePath);
	if (!file) {
		return new Response("Not Found", { status: 404 });
	}

	return new Response(file.content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			...IMMUTABLE_HEADERS,
		},
	});
}
