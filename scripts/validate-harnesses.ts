import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	deriveHarnessId,
	HarnessValidationError,
	parseHarnessConfig,
	VALID_HARNESS_FILENAME,
	validateHarness,
} from "../app/lib/harness-schema.ts";

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HARNESS_DIR = resolve(__dirname, "../app/config/harnesses");

// Expected harness IDs (must match HARNESS_IDS in harness-registry.ts)
const EXPECTED_HARNESS_IDS = [
	"kdco-workspace",
	"opencode-native",
	"oh-my-opencode",
] as const;

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
const derivedIds = new Set<string>();
const seenFiles = new Set<string>();
const defaultProfileNames = new Map<string, string[]>();

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

	// Validate filename format using VALID_HARNESS_FILENAME regex
	if (!VALID_HARNESS_FILENAME.test(file)) {
		errors.push({
			type: "error",
			file,
			message: `Invalid filename format - must match ${VALID_HARNESS_FILENAME}`,
		});
		continue;
	}

	// Derive the ID from filename
	let derivedId: string;
	try {
		derivedId = deriveHarnessId(file);
	} catch (err) {
		errors.push({
			type: "error",
			file,
			message: `Failed to derive ID from filename: ${err instanceof Error ? err.message : String(err)}`,
		});
		continue;
	}

	// Check for duplicate derived IDs
	if (derivedIds.has(derivedId)) {
		errors.push({
			type: "error",
			file,
			message: `Duplicate harness ID "${derivedId}" derived from ${file}`,
		});
		continue;
	}
	derivedIds.add(derivedId);

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

	// Validate with parseHarnessConfig and validateHarness
	let config: ReturnType<typeof parseHarnessConfig>;
	try {
		config = parseHarnessConfig(raw, file);
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

	fileIds.add(derivedId);

	// Track defaultProfileName for duplicate checking
	const profileName = config.defaultProfileName;
	if (!defaultProfileNames.has(profileName)) {
		defaultProfileNames.set(profileName, []);
	}
	const profileNameFiles = defaultProfileNames.get(profileName);
	if (profileNameFiles) {
		profileNameFiles.push(file);
	}
}

// Validate registry consistency
const registryIds = new Set(EXPECTED_HARNESS_IDS);

// Check for duplicate defaultProfileNames
for (const [profileName, files] of defaultProfileNames) {
	if (files.length > 1) {
		const fileList = files.join(" and ");
		errors.push({
			type: "error",
			message: `Duplicate defaultProfileName "${profileName}" in ${fileList}`,
		});
	}
}

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
