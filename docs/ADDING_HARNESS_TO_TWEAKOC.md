# Add Your Harness to TweakOC

This guide is the quick, practical path for contributors who want to add a harness to TweakOC via pull request.

If you need full schema details and advanced examples, use the deep guide: [HARNESS_GUIDE.md](./HARNESS_GUIDE.md).

## How to Submit (PR Flow)

1. **Fork and branch**
   - Fork this repository to your GitHub account
   - Create a feature branch for your harness work

2. **Implement your harness changes**
   - Add the harness JSON and wire it into registry/validation files (steps below)

3. **Install dependencies**
   - Run `bun install` before any `bun run ...` commands

4. **Validate and smoke test**
   - Run `bun run check`
   - Run `bun run harness:validate`
   - Confirm the harness works in `bun run preview` (required before PR); `bun run dev` is optional for local iteration

5. **Open a pull request**
   - Push your branch and open a PR to this repository
   - Include what harness you added/updated and any relevant notes for maintainers

## Contributor Steps (Before Opening PR)

1. **Create a harness JSON file**
   - Add a new file in `app/config/harnesses/`
   - Use a clear kebab-case filename (the filename becomes the harness ID)

2. **Register the harness in `app/lib/harness-registry.ts`**
   - Import the JSON file
   - Parse it with `parseHarnessConfig(...)`
   - Add the ID to `HARNESS_IDS`
   - Add the parsed harness to `HARNESSES`

3. **Keep validation IDs in sync**
   - Open `scripts/validate-harnesses.ts`
   - Add the same ID to `EXPECTED_HARNESS_IDS`
   - `HARNESS_IDS` and `EXPECTED_HARNESS_IDS` should match

4. **Install dependencies**
    ```bash
    bun install
    ```

5. **Run harness validation**
     ```bash
     bun run harness:validate
     ```

6. **Run full checks**
   ```bash
   bun run check
   ```

7. **Do a UI smoke test (preview required before PR)**
   - Run this before opening your PR:
     ```bash
     bun run preview
     ```

   - Optional for faster local iteration:
     ```bash
     bun run dev
     ```

   - Confirm your harness appears, can be configured, and generates expected output files.

8. **Update docs expectations before submitting**
   - Add or update maintainer-facing notes when your harness introduces a new pattern.
   - Keep references accurate so the next maintainer can onboard quickly.

## Submission Checklist (Before PR)

- [ ] Harness JSON added in `app/config/harnesses/`
- [ ] Harness registered in `app/lib/harness-registry.ts`
- [ ] Matching ID added to `scripts/validate-harnesses.ts`
- [ ] `bun install` run before any `bun run ...` commands
- [ ] `bun run check` passes
- [ ] `bun run harness:validate` passes
- [ ] Verified in `bun run preview` before opening PR (`bun run dev` optional)
- [ ] Related docs updated when needed
