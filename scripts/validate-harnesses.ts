import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	HarnessConfigSchema,
	HarnessValidationError,
	validateHarness,
} from "../app/lib/harness-schema.ts";

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HARNESS_DIR = resolve(__dirname, "../app/config/harnesses");
const VALID_ID_REGEX = /^[a-z0-9-]+$/;

// Expected harness IDs (must match HARNESS_IDS in harness-registry.ts)
// Note: omo.json needs migration to new schema (Record-based slots, flow field)
const EXPECTED_HARNESS_IDS = ["kdco-workspace"] as const;

interface ValidationError {
	type: "error";
	file?: string;
	message: string;
}

const errors: ValidationError[] = [];

// Read all JSON files in harness directory
let files: string[] = [];
try {
	files = readdirSync(HARNESS_DIR).filter(
		(f) => f.endsWith(".json") && !f.startsWith("."),
	);
} catch (err) {
	errors.push({
		type: "error",
		message: `Failed to read harness directory: ${err instanceof Error ? err.message : String(err)}`,
	});
	console.error("\n❌ Harness validation failed\n");
	for (const error of errors) {
		console.error(`  • ${error.message}`);
	}
	process.exit(1);
}

const fileIds = new Set<string>();
const seenFiles = new Set<string>();

// Validate each harness file
for (const file of files) {
	const filePath = resolve(HARNESS_DIR, file);
	const fileName = basename(file, ".json");

	// Skip files not in EXPECTED_HARNESS_IDS (allows legacy/WIP harnesses to exist)
	if (
		!EXPECTED_HARNESS_IDS.includes(
			fileName as (typeof EXPECTED_HARNESS_IDS)[number],
		)
	) {
		continue;
	}

	// Check for duplicate filenames
	if (seenFiles.has(fileName)) {
		errors.push({
			type: "error",
			file,
			message: `Duplicate filename: ${fileName}`,
		});
		continue;
	}
	seenFiles.add(fileName);

	// Read and parse JSON
	let raw: unknown;
	try {
		const content = readFileSync(filePath, "utf-8");
		raw = JSON.parse(content);
	} catch (err) {
		errors.push({
			type: "error",
			file,
			message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
		});
		continue;
	}

	// Validate with HarnessConfigSchema
	let config: { id: string };
	try {
		config = HarnessConfigSchema.parse(raw);
		// Run additional validation (includes dry run with defaults)
		validateHarness(config);
	} catch (err) {
		const errorMsg =
			err instanceof z.ZodError
				? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
				: err instanceof HarnessValidationError
					? `${err.path}: ${err.message}`
					: String(err);
		errors.push({
			type: "error",
			file,
			message: `Schema validation failed: ${errorMsg}`,
		});
		continue;
	}

	// Check filename matches harness ID
	if (config.id !== fileName) {
		errors.push({
			type: "error",
			file,
			message: `Filename "${fileName}.json" does not match harness id "${config.id}"`,
		});
	}

	// Validate ID format
	if (!VALID_ID_REGEX.test(config.id)) {
		errors.push({
			type: "error",
			file,
			message: `Invalid harness id "${config.id}" - must match ${VALID_ID_REGEX}`,
		});
	}

	fileIds.add(config.id);
}

// Validate registry consistency
const registryIds = new Set(EXPECTED_HARNESS_IDS);

// Check that every file ID is in registry
for (const id of fileIds) {
	if (!registryIds.has(id as (typeof EXPECTED_HARNESS_IDS)[number])) {
		errors.push({
			type: "error",
			message: `Harness "${id}" found in files but missing from HARNESS_IDS in harness-registry.ts`,
		});
	}
}

// Check that every registry ID has a file
for (const id of registryIds) {
	if (!fileIds.has(id as string)) {
		errors.push({
			type: "error",
			message: `Harness "${id}" in HARNESS_IDS but no corresponding ${id}.json file found`,
		});
	}
}

// Check for duplicate IDs in registry
if (registryIds.size !== EXPECTED_HARNESS_IDS.length) {
	errors.push({
		type: "error",
		message: "Duplicate IDs found in HARNESS_IDS",
	});
}

// Report results
if (errors.length > 0) {
	console.error("\n❌ Harness validation failed\n");

	// Group errors by file
	const fileErrors = new Map<string, ValidationError[]>();
	const globalErrors: ValidationError[] = [];

	for (const error of errors) {
		if (error.file) {
			if (!fileErrors.has(error.file)) {
				fileErrors.set(error.file, []);
			}
			const fileErrorList = fileErrors.get(error.file);
			if (fileErrorList) {
				fileErrorList.push(error);
			}
		} else {
			globalErrors.push(error);
		}
	}

	// Print file-specific errors
	for (const [file, fileErrorList] of fileErrors) {
		console.error(`  ${file}:`);
		for (const error of fileErrorList) {
			console.error(`    • ${error.message}`);
		}
	}

	// Print global errors
	if (globalErrors.length > 0) {
		console.error("\n  Global errors:");
		for (const error of globalErrors) {
			console.error(`    • ${error.message}`);
		}
	}

	console.error(`\n  Total errors: ${errors.length}\n`);
	process.exit(1);
}

// Success!
console.log(
	`✅ Harness validation passed (${fileIds.size} harness${fileIds.size === 1 ? "" : "es"})`,
);
