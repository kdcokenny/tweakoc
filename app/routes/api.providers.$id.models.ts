import {
	getCatalog,
	providerExists,
	transformModels,
} from "~/lib/api/catalog-service";
import { encodeCursor, parseCursor } from "~/lib/api/schemas";
import { createErrorResponse, createJsonResponse } from "~/lib/api/types";
import type { Route } from "./+types/api.providers.$id.models";

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const providerId = params.id;
	if (!providerId) {
		return createErrorResponse(
			"INVALID_REQUEST",
			"Provider ID is required",
			400,
		);
	}

	// Parse query params
	const url = new URL(request.url);
	const query = url.searchParams.get("q") || undefined;
	const cursorParam = url.searchParams.get("cursor");
	const limitParam = url.searchParams.get("limit");

	// Parse and validate limit
	let limit = 20;
	if (limitParam) {
		const parsed = parseInt(limitParam, 10);
		if (Number.isNaN(parsed)) {
			return createErrorResponse(
				"INVALID_REQUEST",
				"Invalid limit parameter",
				400,
			);
		}
		limit = Math.max(10, Math.min(50, parsed));
	}

	// Parse cursor
	const cursor = parseCursor(cursorParam);
	const offset = cursor?.offset ?? 0;

	try {
		const kv = context.cloudflare.env.PROFILES_KV;
		const catalog = await getCatalog(kv);

		// Check if provider exists
		if (!providerExists(catalog, providerId)) {
			return createErrorResponse(
				"NOT_FOUND",
				`Provider '${providerId}' not found`,
				404,
			);
		}

		const { items, hasMore } = transformModels(
			catalog,
			providerId,
			query,
			offset,
			limit,
		);

		const response: { items: typeof items; nextCursor?: string } = { items };
		if (hasMore) {
			response.nextCursor = encodeCursor(offset + limit);
		}

		return createJsonResponse(response, { maxAge: 60 });
	} catch (error) {
		console.error("Failed to fetch models:", error);
		return createErrorResponse("INTERNAL_ERROR", "Failed to fetch models", 500);
	}
}
