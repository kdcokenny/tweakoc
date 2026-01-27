// Mock provider and model catalog for Phase 1
// This will be replaced with /api/providers in Phase 2

export type AuthBadge = "api-key" | "oauth" | "aws-creds" | "local" | "gateway";

export interface Provider {
	id: string;
	name: string;
	authBadge: AuthBadge;
	envHints: string[];
	setupSteps: string;
	popular?: boolean;
}

export interface Model {
	id: string;
	name: string;
	description?: string;
}

// Mock providers with variety of auth types
export const MOCK_PROVIDERS: Provider[] = [
	{
		id: "anthropic",
		name: "Anthropic",
		authBadge: "api-key",
		envHints: ["ANTHROPIC_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select Anthropic → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set ANTHROPIC_API_KEY env var",
		popular: true,
	},
	{
		id: "openai",
		name: "OpenAI",
		authBadge: "api-key",
		envHints: ["OPENAI_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select OpenAI → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set OPENAI_API_KEY env var",
		popular: true,
	},
	{
		id: "google",
		name: "Google AI",
		authBadge: "oauth",
		envHints: [],
		setupSteps:
			"1. In OpenCode: /connect → select Google AI → complete OAuth flow\n2. Credentials stored securely via OAuth tokens",
		popular: true,
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		authBadge: "gateway",
		envHints: ["OPENROUTER_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select OpenRouter → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set OPENROUTER_API_KEY env var",
		popular: true,
	},
	{
		id: "aws-bedrock",
		name: "AWS Bedrock",
		authBadge: "aws-creds",
		envHints: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
		setupSteps:
			"1. Configure AWS credentials via environment variables or ~/.aws/credentials\n2. Ensure IAM permissions for Bedrock model access\n3. Set AWS_REGION to your preferred region",
	},
	{
		id: "azure",
		name: "Azure OpenAI",
		authBadge: "api-key",
		envHints: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
		setupSteps:
			"1. In OpenCode: /connect → select Azure OpenAI → follow prompts\n2. Requires Azure OpenAI endpoint URL and API key\n3. Advanced: set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT env vars",
	},
	{
		id: "ollama",
		name: "Ollama",
		authBadge: "local",
		envHints: ["OLLAMA_HOST"],
		setupSteps:
			"1. Install Ollama locally: https://ollama.ai\n2. Pull models: ollama pull llama3\n3. Optional: set OLLAMA_HOST if not using default localhost:11434",
	},
	{
		id: "groq",
		name: "Groq",
		authBadge: "api-key",
		envHints: ["GROQ_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select Groq → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set GROQ_API_KEY env var",
		popular: true,
	},
	{
		id: "together",
		name: "Together AI",
		authBadge: "api-key",
		envHints: ["TOGETHER_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select Together AI → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set TOGETHER_API_KEY env var",
	},
	{
		id: "mistral",
		name: "Mistral AI",
		authBadge: "api-key",
		envHints: ["MISTRAL_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select Mistral → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set MISTRAL_API_KEY env var",
	},
	{
		id: "cohere",
		name: "Cohere",
		authBadge: "api-key",
		envHints: ["COHERE_API_KEY"],
		setupSteps:
			"1. In OpenCode: /connect → select Cohere → follow prompts\n2. Credentials stored in ~/.local/share/opencode/auth.json\n3. Advanced: set COHERE_API_KEY env var",
	},
	{
		id: "vertex",
		name: "Google Vertex AI",
		authBadge: "oauth",
		envHints: ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT"],
		setupSteps:
			"1. Set up Google Cloud credentials via gcloud CLI or service account\n2. Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path\n3. Set GOOGLE_CLOUD_PROJECT to your project ID",
	},
];

// Mock models per provider (for Phase 1 async loading simulation)
const MOCK_MODELS: Record<string, Model[]> = {
	anthropic: [
		{
			id: "claude-sonnet-4-20250514",
			name: "Claude Sonnet 4",
			description: "Latest balanced model",
		},
		{
			id: "claude-3-5-sonnet-20241022",
			name: "Claude 3.5 Sonnet",
			description: "Fast and capable",
		},
		{
			id: "claude-3-5-haiku-20241022",
			name: "Claude 3.5 Haiku",
			description: "Fastest responses",
		},
		{
			id: "claude-3-opus-20240229",
			name: "Claude 3 Opus",
			description: "Most capable",
		},
	],
	openai: [
		{ id: "gpt-4o", name: "GPT-4o", description: "Latest multimodal model" },
		{
			id: "gpt-4o-mini",
			name: "GPT-4o Mini",
			description: "Fast and affordable",
		},
		{ id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High capability" },
		{ id: "o1", name: "o1", description: "Reasoning model" },
		{ id: "o1-mini", name: "o1 Mini", description: "Fast reasoning" },
	],
	google: [
		{
			id: "gemini-2.0-flash",
			name: "Gemini 2.0 Flash",
			description: "Fast multimodal",
		},
		{
			id: "gemini-1.5-pro",
			name: "Gemini 1.5 Pro",
			description: "Long context",
		},
		{
			id: "gemini-1.5-flash",
			name: "Gemini 1.5 Flash",
			description: "Balanced speed",
		},
	],
	openrouter: [
		{
			id: "anthropic/claude-sonnet-4",
			name: "Claude Sonnet 4 (via OpenRouter)",
			description: "Anthropic's latest",
		},
		{
			id: "openai/gpt-4o",
			name: "GPT-4o (via OpenRouter)",
			description: "OpenAI's flagship",
		},
		{
			id: "meta-llama/llama-3.1-405b",
			name: "Llama 3.1 405B",
			description: "Open source giant",
		},
		{
			id: "google/gemini-pro-1.5",
			name: "Gemini Pro 1.5",
			description: "Google's best",
		},
	],
	"aws-bedrock": [
		{
			id: "anthropic.claude-3-sonnet",
			name: "Claude 3 Sonnet (Bedrock)",
			description: "Via AWS",
		},
		{
			id: "amazon.titan-text-premier",
			name: "Titan Text Premier",
			description: "Amazon's model",
		},
		{
			id: "meta.llama3-70b-instruct",
			name: "Llama 3 70B",
			description: "Meta via Bedrock",
		},
	],
	azure: [
		{ id: "gpt-4o", name: "GPT-4o (Azure)", description: "Deployed on Azure" },
		{
			id: "gpt-4-turbo",
			name: "GPT-4 Turbo (Azure)",
			description: "Enterprise ready",
		},
	],
	ollama: [
		{ id: "llama3:latest", name: "Llama 3", description: "Local Meta model" },
		{ id: "mistral:latest", name: "Mistral", description: "Local Mistral" },
		{
			id: "codellama:latest",
			name: "Code Llama",
			description: "Optimized for code",
		},
		{ id: "phi3:latest", name: "Phi-3", description: "Microsoft small model" },
	],
	groq: [
		{
			id: "llama-3.3-70b-versatile",
			name: "Llama 3.3 70B",
			description: "Fast inference",
		},
		{
			id: "llama-3.1-8b-instant",
			name: "Llama 3.1 8B Instant",
			description: "Ultra fast",
		},
		{
			id: "mixtral-8x7b-32768",
			name: "Mixtral 8x7B",
			description: "MoE model",
		},
	],
	together: [
		{
			id: "meta-llama/Meta-Llama-3.1-405B",
			name: "Llama 3.1 405B",
			description: "Largest open model",
		},
		{
			id: "meta-llama/Meta-Llama-3.1-70B",
			name: "Llama 3.1 70B",
			description: "High capability",
		},
		{
			id: "mistralai/Mixtral-8x22B",
			name: "Mixtral 8x22B",
			description: "Large MoE",
		},
	],
	mistral: [
		{
			id: "mistral-large-latest",
			name: "Mistral Large",
			description: "Flagship model",
		},
		{
			id: "mistral-medium-latest",
			name: "Mistral Medium",
			description: "Balanced",
		},
		{
			id: "codestral-latest",
			name: "Codestral",
			description: "Code specialized",
		},
	],
	cohere: [
		{ id: "command-r-plus", name: "Command R+", description: "Most capable" },
		{ id: "command-r", name: "Command R", description: "Balanced" },
		{ id: "command-light", name: "Command Light", description: "Fast" },
	],
	vertex: [
		{
			id: "gemini-1.5-pro",
			name: "Gemini 1.5 Pro (Vertex)",
			description: "Enterprise Gemini",
		},
		{
			id: "gemini-1.5-flash",
			name: "Gemini 1.5 Flash (Vertex)",
			description: "Fast Gemini",
		},
	],
};

// Model loader interface (swappable for Phase 2)
export interface ModelLoaderParams {
	providerId: string;
	query?: string;
	cursor?: string;
	limit?: number;
	signal?: AbortSignal;
}

export interface ModelLoaderResult {
	items: Model[];
	nextCursor?: string;
	hasMore: boolean;
}

export type ModelLoader = (
	params: ModelLoaderParams,
) => Promise<ModelLoaderResult>;

// Mock model loader with simulated async behavior
export const loadModels: ModelLoader = async ({
	providerId,
	query,
	cursor,
	limit = 20,
	signal,
}) => {
	// Simulate network delay
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(resolve, 300);
		signal?.addEventListener("abort", () => {
			clearTimeout(timeout);
			reject(new DOMException("Aborted", "AbortError"));
		});
	});

	const allModels = MOCK_MODELS[providerId] ?? [];

	// Filter by query if provided
	const filtered = query
		? allModels.filter(
				(m) =>
					m.name.toLowerCase().includes(query.toLowerCase()) ||
					m.id.toLowerCase().includes(query.toLowerCase()),
			)
		: allModels;

	// Parse cursor for pagination
	const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
	const items = filtered.slice(startIndex, startIndex + limit);
	const hasMore = startIndex + limit < filtered.length;

	return {
		items,
		nextCursor: hasMore ? String(startIndex + limit) : undefined,
		hasMore,
	};
};

// Helper to get provider by ID
export function getProviderById(id: string): Provider | undefined {
	return MOCK_PROVIDERS.find((p) => p.id === id);
}

// Helper to get popular providers
export function getPopularProviders(): Provider[] {
	return MOCK_PROVIDERS.filter((p) => p.popular);
}
