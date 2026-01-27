import type { Config } from "@react-router/dev/config";

export default {
	// Server-side render by default, to enable SPA mode set this to `false`
	ssr: true,
	// Use Cloudflare Workers adapter
	serverBuildFile: "index.js",
} satisfies Config;
