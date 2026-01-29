# Contributing to Tweak

## Creating and Modifying Harnesses

### Quick Start

For detailed instructions on creating configuration harnesses, see the [Harness Creation Guide](docs/HARNESS_GUIDE.md).

### Validation

When adding or modifying harness configurations, run the validation script locally before committing:

```bash
bun run harness:validate
```

This ensures:
- All harness JSON files are valid according to the schema
- Harness IDs match filenames
- Registry entries match actual files
- No duplicate harness IDs exist
- All template `$ref` placeholders resolve correctly

The validation runs automatically on pull requests via GitHub Actions.
