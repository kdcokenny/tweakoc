# Contributing to Tweak

## Harness validation

When adding or modifying harness configurations, run the validation script locally before committing:

```bash
bun run harness:validate
```

This ensures:
- All harness JSON files are valid according to the schema
- Harness IDs match filenames
- Registry entries match actual files
- No duplicate harness IDs exist

The validation runs automatically on pull requests via GitHub Actions.
