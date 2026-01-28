# Testing Guide for Tweak MVP

## Local Development

### Prerequisites
- Bun installed
- Wrangler CLI (installed via project deps)

### Running Locally

1. **Development mode** (with hot reload):
   ```bash
   bun run dev
   ```
   This starts React Router dev server at http://localhost:5173

2. **Preview mode** (Wrangler Workers):
   ```bash
   bun run preview
   ```
   This starts the Cloudflare Workers runtime at http://localhost:8787

### Creating KV Namespaces (First Time Setup)

Before running preview/deploy, create the KV namespace:

```bash
# Create production namespace
wrangler kv namespace create "PROFILES_KV"
# Copy the ID to wrangler.jsonc

# Create preview namespace (for local testing)
wrangler kv namespace create "PROFILES_KV" --preview
# Copy the preview_id to wrangler.jsonc
```

Update `wrangler.jsonc` with the IDs:
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "PROFILES_KV",
      "id": "<production-id>",
      "preview_id": "<preview-id>"
    }
  ]
}
```

## API Testing

### Test Providers Endpoint
```bash
curl http://localhost:8787/api/providers | jq '.providers | length'
```

### Test Models Endpoint
```bash
curl "http://localhost:8787/api/providers/anthropic/models?limit=5" | jq
```

### Test Profile Creation
```bash
curl -X POST http://localhost:8787/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "harnessId": "kdco-workspace",
    "providers": ["anthropic", "openai"],
    "primary": {"providerId": "anthropic", "modelId": "claude-sonnet-4-20250514"},
    "secondary": {"providerId": "anthropic", "modelId": "claude-3-5-haiku-20241022"}
  }' | jq
```

### Test Profile Retrieval
```bash
curl http://localhost:8787/api/profiles/p-abc12345 | jq
```

## OCX Registry Testing

### Test Registry Index
```bash
curl http://localhost:8787/r/index.json | jq
```

### Test Packument
```bash
curl http://localhost:8787/r/components/p-abc12345.json | jq
```

### Test Raw File
```bash
curl http://localhost:8787/r/components/p-abc12345/opencode.jsonc
```

## OCX E2E Test

Run the test script:
```bash
./scripts/test-ocx-flow.sh
```

This will:
1. Add the local registry to OCX
2. Create a test profile via API
3. Install the profile using OCX CLI
4. Verify the installed files

## UI Testing (Manual)

1. Start preview mode: `bun run preview`
2. Open http://localhost:8787 in browser
3. Walk through wizard:
   - Select harness
   - Select providers
   - Pick primary/secondary models
   - Configure options
   - Review and create profile
4. Verify:
   - Install command shows real component ID
   - View Files shows real generated content
   - Copy buttons work

## Deployment

```bash
bun run deploy
```

This deploys to Cloudflare Workers at https://tweakoc.<your-subdomain>.workers.dev
