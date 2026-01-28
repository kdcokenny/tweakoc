import { getCatalog, transformProviders } from "~/lib/api/catalog-service";
import { createErrorResponse, createJsonResponse } from "~/lib/api/types";
import type { Route } from "./+types/api.providers";

export async function loader({ context }: Route.LoaderArgs) {
	try {
		const kv = context.cloudflare.env.PROFILES_KV;
		const catalog = await getCatalog(kv);
		const providers = await transformProviders(catalog, kv);

		return createJsonResponse({ providers }, { maxAge: 60 });
	} catch (error) {
		console.error("Failed to fetch providers:", error);
		return createErrorResponse(
			"INTERNAL_ERROR",
			"Failed to fetch providers",
			500,
		);
	}
}
