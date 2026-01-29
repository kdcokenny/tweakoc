# AGENTS.md - Developer Guide for AI Coding Agents

TweakOC is a React Router 7 application on Cloudflare Workers that generates OpenCode (OCX) configuration profiles via a wizard-based UI.

**Tech Stack:** Bun 1.3.5+, React Router 7, React 19, TailwindCSS 4, TypeScript (strict), Biome, Zod, Zustand, Cloudflare Workers

---

## Commands

```bash
# Development & Testing
bun run dev             # Dev server (http://localhost:5173)
bun run preview         # Cloudflare Workers runtime (http://localhost:8787)
bun run build           # Production build

# Validation (run before committing)
bun run check           # Biome + TypeScript checks
bun run check:biome     # Biome only
bun run check:types     # TypeScript only
bun run harness:validate # Validate harness configs

# Deployment
bun run deploy          # Deploy to Cloudflare Workers
bun run cf-typegen      # Generate Worker types
```

**Pre-commit Checklist:**
1. `bun run check` (must pass)
2. `bun run harness:validate` (if harnesses modified)
3. `bun run preview` (manual test)

---

## Code Style

### Biome (not Prettier/ESLint)
- **Indent:** Tabs (not spaces)
- **Quotes:** Double quotes
- **Imports:** Auto-organized (don't manually reorder)

### TypeScript
- **Strict mode:** `strict: true`, `verbatimModuleSyntax: true`
- **Path alias:** `~/` → `app/` (e.g., `import { cn } from "~/lib/utils"`)
- **Import types:** `import type { Route } from "./+types/api.providers"`

### Naming
- **Files:** `kebab-case.tsx` (components), `kebab-case.ts` (libs)
- **Routes:** `routes/api.providers.$id.models.ts` → `/api/providers/:id/models`
- **Functions/vars:** `camelCase`
- **Types/interfaces:** `PascalCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **React components:** `PascalCase`
- **Zod schemas:** `PascalCase` + `Schema` suffix

### Imports Order (Biome auto-organizes)
```typescript
import { useState } from "react";           // 1. External
import type { HarnessConfig } from "~/lib"; // 2. Internal (~/...)
import { Button } from "~/components/ui";   // 3. Components
import type { Route } from "./+types/home"; // 4. Relative
```

### Types
- **Prefer `interface`** for object shapes
- **Use `type`** for unions, intersections, utilities
- **Zod-first:** Define schema, derive TypeScript type via `z.infer<typeof Schema>`

```typescript
const CreateProfileRequestSchema = z.object({
	harnessId: z.string(),
	slotValues: z.record(z.unknown()),
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;
```

### Error Handling

**API Routes:**
```typescript
export function loader({ context }: Route.LoaderArgs) {
	try {
		const data = await fetchData(context.cloudflare.env.PROFILES_KV);
		return createJsonResponse({ data }, { maxAge: 60 });
	} catch (error) {
		console.error("Failed to fetch data:", error);
		return createErrorResponse("INTERNAL_ERROR", "Failed to fetch data", 500);
	}
}
```

**Validation:** Use Zod refinements for complex rules
**Scripts:** Collect all errors, report at end, exit with code 1

---

## Project Structure

```
app/
├── components/         # React components (ui/, wizard/)
├── config/harnesses/   # Harness JSON configs
├── lib/                # Schemas, utils, API, state, hooks
├── routes/             # React Router 7 routes (api.*.ts, flow/*.tsx)
├── app.css             # Global styles
├── root.tsx            # Root layout
└── routes.ts           # Route configuration

scripts/                # Build/validation scripts
wrangler.jsonc          # Cloudflare Workers config (KV bindings)
biome.json              # Linting + formatting rules
tsconfig.json           # TypeScript config
```

**Key Files:**
- `app/lib/harness-schema.ts`: Zod schemas for harnesses
- `app/lib/harness-registry.ts`: Harness loader/registry
- `app/lib/api/types.ts`: API types, error helpers
- `wrangler.jsonc`: KV namespace bindings

---

## React Router 7 Patterns

**Route Types (auto-generated):**
```typescript
import type { Route } from "./+types/api.providers";

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const kv = context.cloudflare.env.PROFILES_KV;
	// ...
}

export async function action({ context, request }: Route.ActionArgs) {
	const body = await request.json();
	// ...
}
```

**File Conventions:**
- Dynamic params: `$paramName` → `routes/api.providers.$id.models.ts`
- Splat routes: `$` → `routes/r.components.$.ts` matches `/r/components/*`
- Special chars: Brackets → `routes/r.index[.]json.ts` → `/r/index.json`

---

## Cloudflare Workers

**KV Storage:**
```typescript
const kv = context.cloudflare.env.PROFILES_KV;
const value = await kv.get("key");
await kv.put("key", "value", { expirationTtl: 3600 });
```

**Environment:** Types auto-generated via `bun run cf-typegen` → `worker-configuration.d.ts`

---

## Harness System

**Location:** `app/config/harnesses/*.json`  
**Docs:** See `docs/HARNESS_GUIDE.md` for full details

**Schema:**
```json
{
  // ID is derived from filename (e.g., harness-id.json → ID: "harness-id")
  "name": "Display Name",
  "description": "What this harness configures",
  "defaultProfileName": "ws",  // Profile name (lowercase, starts with letter, max 32 chars: a-z 0-9 . _ -)
  "flow": { "requiresPrimary": true, "pages": [...] },
  "slots": { "primary": { "type": "model" }, ... },
  "files": [{ "path": "...", "content": "... $ref{slotId} ..." }]
}
```

**Template placeholders:** `$ref{slotId}`, `$ref{slotId.property}`

**Adding/Modifying:**
1. Edit JSON in `app/config/harnesses/`
2. Update `HARNESS_IDS` in `app/lib/harness-registry.ts` (if new)
3. Run `bun run harness:validate`

---

## Testing

⚠️ **No automated tests** (no Jest/Vitest). Manual testing only.

**Manual Workflow:**
1. `bun run dev` → Test wizard at http://localhost:5173
2. `bun run preview` → Test with Workers runtime at http://localhost:8787
3. API testing: `curl http://localhost:8787/api/providers | jq`

**Example API Test:**
```bash
curl -X POST http://localhost:8787/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"harnessId":"kdco-workspace","slotValues":{"primary":{"providerId":"anthropic","modelId":"claude-sonnet-4-20250514"}}}' | jq
```

See `docs/TESTING.md` for detailed testing procedures.

---

## Do's & Don'ts

**✅ DO:**
- Run `bun run check` before committing
- Use tabs for indentation, double quotes
- Import types with `type` keyword
- Use `~/` path alias for app imports
- Test in preview mode before deploying

**❌ DON'T:**
- Don't use `npm` (use `bun`)
- Don't use spaces/single quotes
- Don't manually reorder imports
- Don't leave `console.log()` debug statements
- Don't modify generated files (`.react-router/`, `worker-configuration.d.ts`)
- Don't skip harness validation when modifying configs

---

## Additional Resources

- **README.md** - Project overview, getting started
- **docs/HARNESS_GUIDE.md** - Harness creation guide
- **docs/TESTING.md** - Detailed testing procedures
- External: [React Router 7](https://reactrouter.com/), [Cloudflare Workers](https://developers.cloudflare.com/workers/), [Biome](https://biomejs.dev/)

**When in doubt, follow existing patterns in the codebase.**
