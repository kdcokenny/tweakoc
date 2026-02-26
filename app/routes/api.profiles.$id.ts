import { isValidComponentId } from "~/lib/api/id-generator";
import { getProfile } from "~/lib/api/profile-store";
import { createErrorResponse, createJsonResponse } from "~/lib/api/types";
import type { Route } from "./+types/api.profiles.$id";

export async function loader({ params, context }: Route.LoaderArgs) {
	const componentId = params.id;

	if (!componentId || !isValidComponentId(componentId)) {
		return createErrorResponse(
			"INVALID_ID",
			"Invalid component ID format",
			400,
		);
	}

	const kv = context.cloudflare.env.PROFILES_KV;
	let profile: Awaited<ReturnType<typeof getProfile>>;
	try {
		profile = await getProfile(kv, componentId);
	} catch (error) {
		console.error("Failed to load profile from storage:", error);
		return createErrorResponse("INTERNAL_ERROR", "Failed to load profile", 500);
	}

	if (!profile) {
		return createErrorResponse(
			"NOT_FOUND",
			`Profile '${componentId}' not found`,
			404,
		);
	}

	return createJsonResponse(profile);
}
