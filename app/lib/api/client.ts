import type { ModelLoaderParams, ModelLoaderResult } from "~/lib/mock/catalog";
import { API_ROUTES } from "./routes";
import type {
	APIError,
	CreateProfileRequest,
	CreateProfileResponse,
	ProviderModelsResponse,
	ProvidersResponse,
	StoredProfile,
} from "./types";

// Fetch all providers from API
export async function fetchProviders(): Promise<ProvidersResponse> {
	const response = await fetch(API_ROUTES.providers.list());
	if (!response.ok) {
		const error = (await response.json()) as APIError;
		throw new Error(error.error.message);
	}
	return response.json();
}

// Create a ModelLoader-compatible function for the model-picker
export function createAPIModelLoader(providerId: string) {
	return async (params: ModelLoaderParams): Promise<ModelLoaderResult> => {
		const { query, cursor, limit = 20, signal } = params;

		const searchParams = new URLSearchParams();
		if (query) searchParams.set("q", query);
		if (cursor) searchParams.set("cursor", cursor);
		searchParams.set("limit", String(limit));

		const url = API_ROUTES.providers.models(providerId, searchParams);

		const response = await fetch(url, { signal });
		if (!response.ok) {
			throw new Error("Failed to fetch models");
		}

		const data = (await response.json()) as ProviderModelsResponse;

		return {
			items: data.items.map((m) => ({ id: m.id, name: m.name ?? m.id })),
			nextCursor: data.nextCursor,
			hasMore: !!data.nextCursor,
		};
	};
}

// Create a profile
export async function createProfile(
	request: CreateProfileRequest,
): Promise<CreateProfileResponse> {
	const response = await fetch(API_ROUTES.profiles.create(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const error = (await response.json()) as APIError;
		throw new Error(error.error.message);
	}

	return response.json();
}

// Fetch a profile by ID
export async function fetchProfile(
	componentId: string,
): Promise<StoredProfile> {
	const response = await fetch(API_ROUTES.profiles.get(componentId));
	if (!response.ok) {
		const error = (await response.json()) as APIError;
		throw new Error(error.error.message);
	}
	return response.json();
}
