import type { KVNamespace } from "@cloudflare/workers-types";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: {
				PROFILES_KV: KVNamespace;
			};
		};
	}
}
