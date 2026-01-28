// Provider types
export type ProviderAuthType =
	| "api_key"
	| "oauth"
	| "aws_creds"
	| "local"
	| "gateway"
	| "unknown";

export interface ProviderSummary {
	id: string;
	name: string;
	authType: ProviderAuthType;
	envHints: string[];
	modelCount: number;
	docUrl?: string;
}

export interface ProvidersResponse {
	providers: ProviderSummary[];
}

// Model types
export interface ModelListItem {
	id: string;
	name?: string;
	status?: "active" | "deprecated" | "alpha" | "beta";
}

export interface ProviderModelsResponse {
	items: ModelListItem[];
	nextCursor?: string;
}

// Profile types
export interface ModelSlotSelection {
	providerId: string;
	modelId: string;
}

export interface CreateProfileRequest {
	harnessId: string;
	providers: string[];
	slots: Record<string, { providerId: string; modelId: string }>;
	options?: Record<string, unknown>;
}

export interface GeneratedFile {
	path: string;
	content: string;
}

export interface CreateProfileResponse {
	componentId: string;
	files: GeneratedFile[];
}

export interface StoredProfile {
	componentId: string;
	request: CreateProfileRequest;
	files: GeneratedFile[];
	createdAt: string;
	lastAccessedAt: string;
}

// Error types
export interface APIError {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

// Helper to create error responses
export function createErrorResponse(
	code: string,
	message: string,
	status: number,
	details?: unknown,
): Response {
	const body: APIError = {
		error: { code, message, ...(details !== undefined && { details }) },
	};
	return Response.json(body, {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

// Helper to create success responses with proper headers
export function createJsonResponse<T>(
	data: T,
	options?: { status?: number; maxAge?: number; immutable?: boolean },
): Response {
	const { status = 200, maxAge = 60, immutable = false } = options ?? {};
	const cacheControl = immutable
		? "public, max-age=31536000, immutable"
		: `public, max-age=${maxAge}`;

	return Response.json(data, {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": cacheControl,
		},
	});
}
