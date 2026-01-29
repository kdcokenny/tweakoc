interface FileGeneratorInput {
	harnessId: string;
	primary: string;
	secondary: string;
	options: Record<string, boolean>;
}

export interface GeneratedFiles {
	"opencode.jsonc": string;
	"ocx.jsonc": string;
	"oh-my-opencode.json"?: string;
}

export function generateMockFiles(input: FileGeneratorInput): GeneratedFiles {
	const { harnessId, primary, secondary, options } = input;

	const primaryModel = primary || "anthropic/claude-sonnet-4-20250514";
	const secondaryModel = secondary || "anthropic/claude-3-5-haiku-20241022";

	// Generate opencode.jsonc
	const opencodeConfig: Record<string, unknown> = {
		$schema: "https://opencode.ai/schema/config.json",
		model: primaryModel,
		small_model: secondaryModel,
	};

	// Add MCP servers based on options
	if (options.context7 || options.exa || options.githubGrep) {
		opencodeConfig.mcp = {
			servers: {} as Record<string, unknown>,
		};
		const servers = opencodeConfig.mcp as { servers: Record<string, unknown> };

		if (options.context7) {
			servers.servers.context7 = {
				command: "npx",
				args: ["-y", "@context7/mcp-server"],
			};
		}
		if (options.exa) {
			servers.servers.exa = {
				command: "npx",
				args: ["-y", "@exa/mcp-server"],
			};
		}
		if (options.githubGrep) {
			servers.servers["github-grep"] = {
				command: "npx",
				args: ["-y", "@github/grep-mcp"],
			};
		}
	}

	// Generate ocx.jsonc
	const ocxConfig: Record<string, unknown> = {
		$schema: "https://ocx.kdco.dev/schema/config.json",
		version: "1.0.0",
	};

	if (options.renameWindow) {
		ocxConfig.renameWindow = true;
	}

	ocxConfig.exclude = ["CLAUDE.md", "CONTEXT.md", ".claude/**"];

	const files: GeneratedFiles = {
		"opencode.jsonc": JSON.stringify(opencodeConfig, null, 2),
		"ocx.jsonc": JSON.stringify(ocxConfig, null, 2),
	};

	// Add oh-my-opencode.json for OMO harness
	if (harnessId === "oh-my-opencode") {
		const omoConfig = {
			$schema: "https://oh-my-opencode.dev/schema/config.json",
			orchestrator: {
				model: primaryModel,
			},
			fast: {
				model: secondaryModel,
			},
		};
		files["oh-my-opencode.json"] = JSON.stringify(omoConfig, null, 2);
	}

	return files;
}
