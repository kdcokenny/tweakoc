import type { CreateProfileRequest, GeneratedFile } from "./types";

interface GenerateFilesResult {
	files: GeneratedFile[];
}

/**
 * Generate profile configuration files based on user selections
 */
export function generateProfileFiles(
	request: CreateProfileRequest,
): GenerateFilesResult {
	const files: GeneratedFile[] = [];

	// Generate opencode.jsonc
	const opencodeConfig: Record<string, unknown> = {
		$schema: "https://opencode.ai/schema/config.json",
		model: `${request.primary.providerId}/${request.primary.modelId}`,
		small_model: `${request.secondary.providerId}/${request.secondary.modelId}`,
	};

	// Add MCP servers based on options
	if (request.options?.context7) {
		opencodeConfig.mcp = {
			servers: {
				context7: {
					command: "npx",
					args: ["-y", "@context7/mcp-server"],
				},
			},
		};
	}

	files.push({
		path: "opencode.jsonc",
		content: JSON.stringify(opencodeConfig, null, 2),
	});

	// Generate ocx.jsonc
	const ocxConfig: Record<string, unknown> = {
		$schema: "https://ocx.kdco.dev/schema/config.json",
		version: "1.0.0",
		exclude: ["CLAUDE.md", "CONTEXT.md", ".claude/**"],
	};

	if (request.options?.renameWindow) {
		ocxConfig.renameWindow = true;
	}

	files.push({
		path: "ocx.jsonc",
		content: JSON.stringify(ocxConfig, null, 2),
	});

	// Generate oh-my-opencode.json for OMO harness only
	if (request.harnessId === "omo") {
		const omoConfig = {
			$schema: "https://oh-my-opencode.dev/schema/config.json",
			orchestrator: {
				model: `${request.primary.providerId}/${request.primary.modelId}`,
			},
			fast: {
				model: `${request.secondary.providerId}/${request.secondary.modelId}`,
			},
		};

		files.push({
			path: "oh-my-opencode.json",
			content: JSON.stringify(omoConfig, null, 2),
		});
	}

	return { files };
}
