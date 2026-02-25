# TweakOC

TweakOC is the fastest way to configure OpenCode harness profiles from the browser.

Use it on **https://tweakoc.com** to generate ready-to-use config files without hand-editing complex JSON.

Each harness can generate an OpenCode config (`opencode.jsonc`) and, when needed, an OCX profile file (`ocx.jsonc`).

Built on the OpenCode ecosystem backbone:
- **OCX (OpenCode Extensions):** https://github.com/kdcokenny/ocx
- **OpenCode:** https://opencode.ai

## Why TweakOC?

TweakOC gives users and maintainers a simpler path to getting started:
- Pick a harness
- Fill in a guided wizard
- Generate ready-to-use profile files
- Share setup more easily with others

In short: less setup friction, faster onboarding, and cleaner handoff between maintainers and users.

## Quick Start (Website)

1. Go to **https://tweakoc.com**
2. Choose the harness that matches your setup
3. Configure options and generate your profile files
4. Install or share the output with OCX/OpenCode workflows

## Typical Website Workflow

1. Choose the harness that matches your setup
2. Pick provider/model options in the wizard.
3. Review generated files
4. Copy, install, or share the resulting profile setup

## Maintainers: Add a Harness

Want to contribute or maintain harnesses in this repo?

- **Quick maintainer flow:** [docs/ADDING_HARNESS_TO_TWEAKOC.md](docs/ADDING_HARNESS_TO_TWEAKOC.md)
- **Full deep reference:** [docs/HARNESS_GUIDE.md](docs/HARNESS_GUIDE.md)

## Local Development (Maintainers)

Most users should use the website. If you are contributing to the repository and preparing a PR, run:

```bash
bun install
bun run check
bun run harness:validate
bun run preview
```

Optional during iteration:

```bash
bun run dev
```

Run `bun run preview` before opening a PR.

## Project Positioning

TweakOC exists to make OCX/OpenCode harnesses more practical to adopt: easier to configure, easier to share, and easier for new users to start with confidence.
