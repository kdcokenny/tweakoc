---
title: Harness Creation Guide
version: 1.0
schema_version: 2
last_updated: 2026-01-29
---

# Harness Creation Guide

A comprehensive guide to creating configuration harnesses for TweakOC.

## Table of Contents

1. [Introduction](#introduction)
2. [Glossary](#glossary)
3. [Schema Reference](#schema-reference)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Maintenance](#maintenance)

## Introduction

### What is a Harness?

A harness is a configuration generator that transforms user input into valid OpenCode configuration files. It provides a guided wizard interface that collects parameters through customizable forms and generates one or more configuration files based on templates.

### Architecture Overview

The harness system follows a data flow pipeline:

```
┌─────────┐      ┌──────┐      ┌───────────┐      ┌─────────┐
│  Slots  │──────▶ Flow │──────▶ Templates │──────▶ Outputs │
└─────────┘      └──────┘      └───────────┘      └─────────┘
    ▲                │                │
    │                │                │
    └────────────────┴────────────────┘
         User input fills slots,
         templates resolve $ref
```

1. **Slots** define configurable parameters (model selection, numbers, enums, etc.)
2. **Flow** organizes slots into wizard pages and sections
3. **Templates** use JSON with `$ref` placeholders that point to slot values
4. **Outputs** are generated files with resolved slot values

### Simple Data Flow Example

```json
// User selects in wizard:
{ "orchestrator_model": "anthropic/claude-3.5-sonnet" }

// Template references slot:
{ "model": { "$ref": "#/slots/orchestrator_model" } }

// Final output:
{ "model": "anthropic/claude-3.5-sonnet" }
```

## Glossary

### Core Concepts

- **slot**: A configurable parameter that users can set. Five types available: `model`, `number`, `enum`, `boolean`, `text`. Each slot has an ID, label, and optional default value.

- **flow**: The wizard navigation structure. Defines the sequence of pages users navigate through when configuring the harness.

- **page**: A single step in the wizard flow. Contains one or more sections and has an ID and label.

- **section**: A logical grouping of related slots within a page. Can contain both regular and advanced slots.

- **advanced slots**: Slots marked as advanced are hidden by default in an accordion. Used for power-user options that most users won't need to configure.

- **template**: A JSON structure that serves as a blueprint for generating configuration files. Contains `$ref` placeholders that are replaced with slot values.

- **$ref**: A JSON Pointer reference in the format `#/slots/<slotId>` that gets replaced with the corresponding slot value during template resolution.

- **output**: A file definition specifying the path and label for a generated configuration file. Each template must reference a defined output.

- **registry**: The central location where all harnesses are registered (`app/lib/harness-registry.ts`). New harnesses must be imported and added here.

- **schemaVersion**: Version number for the harness configuration format. Current version is 1.

- **dry-run validation**: Automated validation that ensures all templates can be successfully resolved using only default slot values. This guarantees users can submit the wizard without changing any values.

## Schema Reference

### Source Files

The harness system is defined across three core files:
- `app/lib/harness-schema.ts` - Schema definitions and validation logic
- `app/lib/api/ref-resolver.ts` - Template $ref resolution engine
- `app/lib/harness-registry.ts` - Registry of available harnesses

### 3.1 HarnessConfig Structure

The root configuration object for a harness:

```typescript
{
  schemaVersion?: number,      // Optional, currently not used for behavior
  id: string,                  // kebab-case, must match filename
  name: string,                // Display name shown in UI
  description: string,         // What this harness configures
  slots: Record<string, SlotDefinition>,
  flow: FlowPage[],
  outputs: { path: string, label: string }[],
  templates: { output: string, template: object }[]
}
```

#### Schema Refinements

- **Unique output paths**: All `outputs[].path` values must be unique
- **Valid template outputs**: Each `templates[].output` must match an existing `outputs[].path`
- **Filename matches ID**: The JSON filename (without `.json`) must exactly match the `id` field
- **Valid ID format**: ID must match `/^[a-z0-9-]+$/` (lowercase letters, numbers, hyphens only)

### 3.2 Slot Types

Five slot types are available, each with specific properties:

#### Model Slot
Prompts user to select an AI model from available providers.

```typescript
{
  type: "model",
  label: string,              // Display label in UI
  description?: string,       // Optional help text
  default?: string           // Optional default model
}
```

**Example:**
```json
{
  "orchestrator_model": {
    "type": "model",
    "label": "Orchestrator Model",
    "description": "Primary model for task orchestration"
  }
}
```

#### Number Slot
Numeric input with optional constraints.

```typescript
{
  type: "number",
  label: string,
  default?: number,
  min?: number,               // Minimum allowed value
  max?: number,               // Maximum allowed value
  step?: number              // Increment step (e.g., 0.1)
}
```

**Validation:**
- If both `min` and `max` are specified, `min` must be ≤ `max`
- If `default` is specified, it must be within the `min`/`max` range

**Example:**
```json
{
  "temperature": {
    "type": "number",
    "label": "Temperature",
    "default": 0.3,
    "min": 0,
    "max": 2,
    "step": 0.1
  }
}
```

#### Enum Slot
Dropdown selection from a predefined list of options.

```typescript
{
  type: "enum",
  label: string,
  default?: string,           // Must be in options array
  options: string[]          // Available choices
}
```

**Validation:**
- If `default` is specified, it must exist in the `options` array

**Example:**
```json
{
  "reasoning_effort": {
    "type": "enum",
    "label": "Reasoning Effort",
    "default": "high",
    "options": ["low", "medium", "high"]
  }
}
```

#### Boolean Slot
Toggle/checkbox for true/false values.

```typescript
{
  type: "boolean",
  label: string,
  default?: boolean
}
```

**Example:**
```json
{
  "enable_mcp": {
    "type": "boolean",
    "label": "Enable MCP Servers",
    "default": true
  }
}
```

#### Text Slot
Free-form text input.

```typescript
{
  type: "text",
  label: string,
  default?: string
}
```

**Example:**
```json
{
  "project_name": {
    "type": "text",
    "label": "Project Name",
    "default": "my-project"
  }
}
```

### 3.3 Flow Structure

The flow defines the wizard navigation experience.

#### FlowPage

```typescript
{
  id: string,                 // Unique page identifier
  label: string,              // Page title shown in UI
  sections: Section[]        // Grouped slot collections
}
```

#### Section

```typescript
{
  id: string,                 // Unique section identifier
  label: string,              // Section heading
  slots: string[],           // Main slot IDs to display
  advanced?: string[]        // Optional advanced slot IDs (hidden in accordion)
}
```

**Example:**
```json
{
  "flow": [
    {
      "id": "orchestration",
      "label": "Orchestration",
      "sections": [
        {
          "id": "orchestrator",
          "label": "Orchestrator Configuration",
          "slots": ["orchestrator_model"],
          "advanced": ["orchestrator_temperature", "orchestrator_reasoning"]
        }
      ]
    }
  ]
}
```

### 3.4 Template $ref Resolution

Templates use JSON Pointer syntax to reference slot values.

#### $ref Format

- **Valid format**: `#/slots/<slotId>`
- **Flat structure only**: No nested paths (e.g., `#/slots/agent/model` is invalid)
- **No sibling keys**: A `$ref` object must contain ONLY the `$ref` key

#### Resolution Process

The `resolveRefs()` function from `ref-resolver.ts` recursively walks the template object:

1. Encounters `{ "$ref": "#/slots/modelSlot" }`
2. Extracts slot ID: `modelSlot`
3. Looks up value in resolver context
4. Replaces entire `$ref` object with the slot value

**Example:**
```json
// Template
{
  "agent": {
    "build": {
      "model": { "$ref": "#/slots/build_model" }
    }
  }
}

// Slot values
{
  "build_model": "anthropic/claude-3.5-sonnet"
}

// Resolved output
{
  "agent": {
    "build": {
      "model": "anthropic/claude-3.5-sonnet"
    }
  }
}
```

#### Invalid $ref Examples

```json
// ❌ Invalid: sibling keys
{ "$ref": "#/slots/model", "fallback": "gpt-4" }

// ❌ Invalid: nested path
{ "$ref": "#/slots/agent/model" }

// ❌ Invalid: wrong prefix
{ "$ref": "#/config/model" }

// ❌ Invalid: $ref value not a string
{ "$ref": 123 }
```

### 3.5 Validation Behavior

The harness validation system runs multiple checks:

#### Schema Validation (Zod)
- Type checking for all fields
- Required field presence
- Enum value validation
- Numeric range validation

#### Structural Validation (`validateHarness()`)
- **Unique page IDs**: No duplicate `flow[].id` values
- **Valid slot references**: All slots referenced in `flow[].sections[].slots` and `flow[].sections[].advanced` must exist in `slots` object
- **Dry-run test**: All templates must successfully resolve using only default slot values

#### Dry-Run Clarification

The dry-run validation simulates an "untouched submit" scenario where a user accepts all defaults without changing any values. It:

1. Builds a context with all slot defaults
2. Attempts to resolve every template
3. **Does NOT validate** that the generated config is semantically correct for the target application
4. **Only validates** that structural resolution succeeds (no missing slots, no $ref errors)

**What dry-run catches:**
- Missing slot references
- Slots without defaults that aren't visible to users
- Malformed $ref syntax

**What dry-run does NOT catch:**
- Invalid model names
- Semantically incorrect configuration values
- Application-specific validation rules

## Step-by-Step Guide

Follow these steps to create a new harness from scratch.

### 4.1 Create the JSON File

1. Navigate to `app/config/harnesses/`
2. Create a new file: `<your-harness-id>.json`
3. Choose an ID that:
   - Uses lowercase letters, numbers, and hyphens only
   - Describes the harness purpose (e.g., `kdco-workspace`, `opencode-native`)
   - Matches the pattern: `/^[a-z0-9-]+$/`

**Example:**
```bash
touch app/config/harnesses/my-custom-harness.json
```

### 4.2 Define Slots

Start by identifying what needs to be configurable. Model slots should be defined first since they require user input.

**Planning checklist:**
- [ ] Which models need to be configurable?
- [ ] What numeric parameters are needed (temperature, max tokens, etc.)?
- [ ] What enum choices exist (reasoning effort, verbosity, etc.)?
- [ ] What boolean toggles are useful (enable/disable features)?
- [ ] What text inputs are needed (names, paths, etc.)?

**Example slot definition:**
```json
{
  "slots": {
    "primary_model": {
      "type": "model",
      "label": "Primary Model"
    },
    "temperature": {
      "type": "number",
      "label": "Temperature",
      "default": 0.3,
      "min": 0,
      "max": 2,
      "step": 0.1
    },
    "enable_advanced_features": {
      "type": "boolean",
      "label": "Enable Advanced Features",
      "default": false
    }
  }
}
```

### 4.3 Design Flow

Organize your slots into logical pages and sections.

**Flow design principles:**
- Group related configurations together
- Order pages from most to least important
- Use advanced slots for rarely-changed options
- Keep each page focused on a single concern

**Example flow:**
```json
{
  "flow": [
    {
      "id": "models",
      "label": "Model Selection",
      "sections": [
        {
          "id": "primary",
          "label": "Primary Configuration",
          "slots": ["primary_model"],
          "advanced": ["temperature"]
        }
      ]
    },
    {
      "id": "features",
      "label": "Features",
      "sections": [
        {
          "id": "toggles",
          "label": "Feature Toggles",
          "slots": ["enable_advanced_features"]
        }
      ]
    }
  ]
}
```

### 4.4 Create Templates

Define what files will be generated and create templates with `$ref` placeholders.

**Template creation steps:**

1. **Define outputs first:**
```json
{
  "outputs": [
    { "path": "opencode.jsonc", "label": "OpenCode Config" },
    { "path": "custom-config.json", "label": "Custom Config" }
  ]
}
```

2. **Create templates referencing outputs:**
```json
{
  "templates": [
    {
      "output": "opencode.jsonc",
      "template": {
        "$schema": "https://opencode.ai/config.json",
        "model": { "$ref": "#/slots/primary_model" },
        "temperature": { "$ref": "#/slots/temperature" }
      }
    }
  ]
}
```

3. **Use $ref for all dynamic values:**
   - Wrap each slot reference in an object: `{ "$ref": "#/slots/<slotId>" }`
   - Never add sibling keys to `$ref` objects
   - Use flat slot IDs only (no nested paths)

### 4.5 Register the Harness

Make the harness available to the application by registering it.

#### Registration Checklist

Follow these steps **in order**:

- [ ] **Step 1**: Import JSON in `app/lib/harness-registry.ts`
```typescript
import myCustomHarnessRaw from "~/config/harnesses/my-custom-harness.json";
```

- [ ] **Step 2**: Parse with `parseHarnessConfig()`
```typescript
const myCustomHarness = parseHarnessConfig(
  myCustomHarnessRaw,
  "my-custom-harness.json",
);
```

- [ ] **Step 3**: Add ID to `HARNESS_IDS` tuple (around line 12)
```typescript
export const HARNESS_IDS = ["kdco-workspace", "my-custom-harness"] as const;
```

- [ ] **Step 4**: Add to `HARNESSES` object
```typescript
export const HARNESSES: Record<string, HarnessConfig> = {
  "kdco-workspace": kdcoWorkspace,
  "my-custom-harness": myCustomHarness,
};
```

- [ ] **Step 5**: Add to `EXPECTED_HARNESS_IDS` in `scripts/validate-harnesses.ts` (around line 20)
```typescript
const EXPECTED_HARNESS_IDS = ["kdco-workspace", "my-custom-harness"] as const;
```

- [ ] **Step 6**: Run validation
```bash
bun run harness:validate
```

#### ⚠️ Critical Synchronization

The following arrays **must contain identical IDs** or validation will fail:
- `HARNESS_IDS` in `app/lib/harness-registry.ts`
- `EXPECTED_HARNESS_IDS` in `scripts/validate-harnesses.ts`

**Mismatch errors:**
- `Harness "id" found in files but missing from HARNESS_IDS in harness-registry.ts`
- `Harness "id" in HARNESS_IDS but no corresponding id.json file found`

## Examples

### 5.1 Minimal Example: OhMyOpenCode (omo)

This minimal harness demonstrates the simplest viable configuration: four model slots with no additional parameters.

**Complete JSON:**
```json
{
  "schemaVersion": 1,
  "id": "omo",
  "name": "OhMyOpenCode",
  "description": "Intelligent agent orchestration with category-based model selection",

  "slots": {
    "visual_engineering_model": {
      "type": "model",
      "label": "Visual Engineering Model",
      "description": "Frontend, UI/UX, and design-focused tasks"
    },
    "ultrabrain_model": {
      "type": "model",
      "label": "Ultrabrain Model",
      "description": "Complex reasoning, architecture, and strategic tasks"
    },
    "quick_model": {
      "type": "model",
      "label": "Quick Model",
      "description": "Fast, simple tasks like git operations and quick fixes"
    },
    "writing_model": {
      "type": "model",
      "label": "Writing Model",
      "description": "Documentation, technical writing, and prose"
    }
  },

  "flow": [
    {
      "id": "models",
      "label": "Model Selection",
      "sections": [
        {
          "id": "visual_engineering",
          "label": "Visual Engineering",
          "slots": ["visual_engineering_model"]
        },
        {
          "id": "ultrabrain",
          "label": "Ultrabrain",
          "slots": ["ultrabrain_model"]
        },
        {
          "id": "quick",
          "label": "Quick",
          "slots": ["quick_model"]
        },
        {
          "id": "writing",
          "label": "Writing",
          "slots": ["writing_model"]
        }
      ]
    }
  ],

  "outputs": [
    { "path": "oh-my-opencode.json", "label": "OMO Plugin Config" },
    { "path": "opencode.jsonc", "label": "OpenCode Config" },
    { "path": "ocx.jsonc", "label": "OCX Profile Config" }
  ],

  "templates": [
    {
      "output": "oh-my-opencode.json",
      "template": {
        "$schema": "https://raw.githubusercontent.com/oh-my-opencode/schema/main/oh-my-opencode.schema.json",
        "categories": {
          "visual-engineering": {
            "model": { "$ref": "#/slots/visual_engineering_model" }
          },
          "ultrabrain": {
            "model": { "$ref": "#/slots/ultrabrain_model" }
          },
          "quick": {
            "model": { "$ref": "#/slots/quick_model" }
          },
          "writing": {
            "model": { "$ref": "#/slots/writing_model" }
          }
        }
      }
    },
    {
      "output": "opencode.jsonc",
      "template": {
        "$schema": "https://opencode.ai/config.json",
        "model": { "$ref": "#/slots/ultrabrain_model" },
        "small_model": { "$ref": "#/slots/quick_model" },
        "plugin": ["oh-my-opencode@latest"]
      }
    },
    {
      "output": "ocx.jsonc",
      "template": {
        "$schema": "https://ocx.kdco.dev/schemas/profile.json",
        "registries": {
          "kdco": {
            "url": "https://registry.kdco.dev"
          }
        },
        "renameWindow": true,
        "exclude": [
          "**/CLAUDE.md",
          "**/CONTEXT.md",
          "**/.opencode/**"
        ]
      }
    }
  ]
}
```

#### Slot-to-Template Mapping

| Slot ID | Template Output Path | Template JSON Path |
|---------|---------------------|-------------------|
| visual_engineering_model | oh-my-opencode.json | categories.visual-engineering.model |
| ultrabrain_model | oh-my-opencode.json | categories.ultrabrain.model |
| ultrabrain_model | opencode.jsonc | model |
| quick_model | oh-my-opencode.json | categories.quick.model |
| quick_model | opencode.jsonc | small_model |
| writing_model | oh-my-opencode.json | categories.writing.model |

**Key characteristics:**
- Only model slots (no advanced parameters)
- Single page flow (all models on one page)
- No advanced sections
- Multiple outputs from same slots
- Static values in templates (e.g., plugin array, exclude patterns)

### 5.2 Native Example: OpenCode Native

This harness demonstrates configuration for OpenCode's built-in agent system with comprehensive settings.

**Complete structure:**

**15 slots organized by agent and purpose:**
- 4 model slots: `build_model`, `plan_model`, `general_model`, `explore_model`
- 4 temperature slots: `build_temperature`, `plan_temperature`, `general_temperature`, `explore_temperature`
- 4 reasoning slots: `build_reasoning`, `plan_reasoning`, `general_reasoning`, `explore_reasoning`
- 3 experimental slots: `continue_on_deny`, `mcp_timeout`, `enable_otel`

**1 flow page with 5 sections:**
- "Agents" page containing Build, Plan, General, Explore, and Experimental sections

**Notable features:**
- Each agent section has model slot visible, with temperature and reasoning in advanced accordion
- Different default reasoning levels per agent type (planning needs more reasoning, exploration needs speed)
- Experimental features grouped separately with all slots in advanced section

#### Slot → Template Path Mapping

| Slot ID | Template JSON Path |
|---------|-------------------|
| build_model | agent.build.model |
| build_temperature | agent.build.temperature |
| build_reasoning | agent.build.reasoningEffort |
| plan_model | agent.plan.model |
| plan_temperature | agent.plan.temperature |
| plan_reasoning | agent.plan.reasoningEffort |
| general_model | agent.general.model |
| general_temperature | agent.general.temperature |
| general_reasoning | agent.general.reasoningEffort |
| explore_model | agent.explore.model |
| explore_temperature | agent.explore.temperature |
| explore_reasoning | agent.explore.reasoningEffort |
| continue_on_deny | experimental.continue_loop_on_deny |
| mcp_timeout | experimental.mcp_timeout |
| enable_otel | experimental.openTelemetry |

#### Default Values for Reasoning

Different agent types have different reasoning defaults optimized for their workload:

- **build_reasoning**: `"medium"` - Balanced for implementation work
- **plan_reasoning**: `"high"` - Planning benefits from deeper analysis
- **general_reasoning**: `"medium"` - Balanced for general tasks
- **explore_reasoning**: `"low"` - Exploration prioritizes speed over depth

**Key characteristics:**
- Structured agent configuration following OpenCode's native agent types
- Granular control over model, temperature, and reasoning per agent
- Experimental features separated for clear opt-in behavior
- Single-page flow for streamlined configuration
- All non-model slots have sensible defaults

**File location:** `app/config/harnesses/opencode-native.json`

### 5.3 Full Example: KDCO Workspace

Reference harness demonstrating all features: custom agents, multiple pages, advanced slots, and complex template structures.

**File location:** `app/config/harnesses/kdco-workspace.json`

#### Key Features

**Custom Agent Architecture:**
- 6 specialized agents instead of OpenCode's default 4
- Per-agent model, temperature, reasoning, and verbosity configuration
- Agents: orchestrator, coder, explorer, researcher, scribe, reviewer

**Multi-Page Wizard:**
1. **Orchestration** - Core agents (orchestrator, coder)
2. **Exploration & Research** - Discovery agents (explorer, researcher)
3. **Content & Review** - Documentation agents (scribe, reviewer)

**Advanced Slot Pattern:**
Each agent has:
- **Essential**: `<agent>_model` (visible by default)
- **Advanced**: `<agent>_temperature`, `<agent>_reasoning`, `<agent>_verbosity` (hidden in accordion)

**Multiple Outputs:**
- `opencode.jsonc` - Main OpenCode configuration with all agents
- `ocx.jsonc` - OCX profile with registry and exclude patterns

**MCP Server Configuration:**
Static MCP server definitions in template:
```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    },
    "exa": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp"
    },
    "gh_grep": {
      "type": "remote",
      "url": "https://mcp.grep.app"
    }
  }
}
```

#### Slot Organization

**Total slots:** 24 (6 agents × 4 parameters each)

**Essential slots (visible):**
- `orchestrator_model`, `coder_model`, `explorer_model`, `researcher_model`, `scribe_model`, `reviewer_model`

**Advanced slots (hidden):**
- `*_temperature` (numeric, 0-2 range, 0.1 step)
- `*_reasoning` (enum: low/medium/high)
- `*_verbosity` (enum: low/medium/high)

#### Template Structure Highlights

**Per-agent configuration pattern:**
```json
{
  "agent": {
    "orchestrator": {
      "model": { "$ref": "#/slots/orchestrator_model" },
      "temperature": { "$ref": "#/slots/orchestrator_temperature" },
      "reasoningEffort": { "$ref": "#/slots/orchestrator_reasoning" },
      "textVerbosity": { "$ref": "#/slots/orchestrator_verbosity" }
    }
  }
}
```

**Static vs Dynamic:**
- **Dynamic**: All agent configurations (use $ref)
- **Static**: MCP server URLs, schema URLs, exclude patterns, registry URLs

**Why this is "advanced":**
- Large number of configurable parameters (24 slots)
- Hierarchical organization (3 pages, 6 sections)
- Mix of essential and power-user options
- Multiple output files with different purposes
- Complex nested template structures

## Troubleshooting

This section lists all possible validation errors with their exact error messages and solutions.

### Validation Script Errors

These errors come from `scripts/validate-harnesses.ts`:

#### File System Errors

**Error:** `Duplicate filename: ${fileName}`

**Cause:** Two files with the same name in `app/config/harnesses/`

**Solution:** Ensure each harness has a unique filename

---

**Error:** `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`

**Cause:** Invalid JSON syntax in harness file

**Solution:** Check JSON syntax (use a JSON validator or IDE linting)

---

**Error:** `Schema validation failed: ${errorMsg}`

**Cause:** Harness structure doesn't match HarnessConfigSchema (from Zod validation)

**Solution:** Review error message for specific field issues. Common problems:
- Missing required fields (`id`, `name`, `description`, `slots`, `flow`, `outputs`, `templates`)
- Wrong field types (e.g., `slots` as array instead of object)
- Invalid slot definitions (e.g., enum default not in options)

---

**Error:** `Filename "${fileName}.json" does not match harness id "${config.id}"`

**Cause:** JSON filename doesn't match the `id` field inside the file

**Solution:** Rename file to match ID or update ID to match filename

**Example:**
```bash
# File: custom-harness.json
# Content: { "id": "my-harness", ... }
# ❌ Mismatch

# Fix: Rename file
mv custom-harness.json my-harness.json
```

---

**Error:** `Invalid harness id "${config.id}" - must match ${VALID_ID_REGEX}`

**Cause:** Harness ID contains invalid characters (uppercase, special characters, etc.)

**Solution:** Use only lowercase letters, numbers, and hyphens

**Valid:** `my-harness`, `kdco-workspace`, `opencode-v2`
**Invalid:** `MyHarness`, `my_harness`, `harness@v1`

---

**Error:** `Harness "${id}" found in files but missing from HARNESS_IDS in harness-registry.ts`

**Cause:** JSON file exists but isn't registered in `HARNESS_IDS` array

**Solution:**
1. Open `app/lib/harness-registry.ts`
2. Add ID to `HARNESS_IDS` tuple
3. Import and parse the harness
4. Add to `HARNESSES` object

---

**Error:** `Harness "${id}" in HARNESS_IDS but no corresponding ${id}.json file found`

**Cause:** ID registered but file doesn't exist

**Solution:**
1. Create `app/config/harnesses/${id}.json`, OR
2. Remove ID from `HARNESS_IDS` if harness was deleted

### $ref Resolution Errors

These errors come from `app/lib/api/ref-resolver.ts`:

**Error:** `Invalid $ref: found sibling keys ${JSON.stringify(siblings)}. $ref objects cannot have other properties.`

**Cause:** A `$ref` object has additional properties besides `$ref`

**Solution:** Remove all sibling keys. `$ref` must be the only key in the object.

**Example:**
```json
// ❌ Invalid
{
  "$ref": "#/slots/model",
  "fallback": "gpt-4"
}

// ✅ Valid
{
  "$ref": "#/slots/model"
}
```

---

**Error:** `Invalid $ref: value must be a string`

**Cause:** The `$ref` property is not a string

**Solution:** Ensure `$ref` value is a string in JSON Pointer format

**Example:**
```json
// ❌ Invalid
{ "$ref": 123 }
{ "$ref": { "slot": "model" } }

// ✅ Valid
{ "$ref": "#/slots/model" }
```

---

**Error:** `Invalid JSON Pointer "${pointer}": must start with "#/slots/"`

**Cause:** `$ref` doesn't use the correct prefix

**Solution:** All references must start with `#/slots/`

**Example:**
```json
// ❌ Invalid
{ "$ref": "#/config/model" }
{ "$ref": "slots/model" }
{ "$ref": "/slots/model" }

// ✅ Valid
{ "$ref": "#/slots/model" }
```

---

**Error:** `Invalid JSON Pointer "${pointer}": slot ID is empty`

**Cause:** Reference ends with `#/slots/` without a slot ID

**Solution:** Provide a valid slot ID after `#/slots/`

**Example:**
```json
// ❌ Invalid
{ "$ref": "#/slots/" }

// ✅ Valid
{ "$ref": "#/slots/orchestrator_model" }
```

---

**Error:** `Invalid JSON Pointer "${pointer}": nested paths are not supported. Use flat slot IDs only (e.g., "#/slots/orchestrator")`

**Cause:** Reference contains nested path segments

**Solution:** Use flat slot IDs without slashes

**Example:**
```json
// ❌ Invalid
{ "$ref": "#/slots/agent/model" }
{ "$ref": "#/slots/orchestrator/config/model" }

// ✅ Valid (use descriptive slot ID)
{ "$ref": "#/slots/orchestrator_model" }
```

---

**Error:** `Failed to resolve "${pointer}": slot "${slotId}" not found in context`

**Cause:** Referenced slot ID doesn't exist in `slots` object

**Solution:** 
1. Check template for typos in slot ID
2. Ensure slot is defined in `slots` object
3. Verify slot ID spelling matches exactly

**Example:**
```json
// Template references:
{ "$ref": "#/slots/orkestraor_model" }  // ❌ Typo

// But slot is defined as:
"slots": {
  "orchestrator_model": { ... }  // ✅ Correct spelling
}
```

### Harness Schema Validation Errors

These errors come from `app/lib/harness-schema.ts`:

**Error:** `Duplicate page ID: ${String(page.id)}`

**Cause:** Two or more pages in `flow` array have the same `id`

**Solution:** Ensure each page has a unique `id`

**Example:**
```json
// ❌ Invalid
{
  "flow": [
    { "id": "config", "label": "Config 1", ... },
    { "id": "config", "label": "Config 2", ... }
  ]
}

// ✅ Valid
{
  "flow": [
    { "id": "config-primary", "label": "Primary Config", ... },
    { "id": "config-advanced", "label": "Advanced Config", ... }
  ]
}
```

---

**Error:** `Unknown slot ID: ${slotId}`

**Cause:** A slot referenced in `flow` doesn't exist in `slots` object

**Solution:** 
1. Add the slot definition to `slots`, OR
2. Remove the reference from `flow` if it was a mistake

**Example:**
```json
{
  "slots": {
    "model": { "type": "model", "label": "Model" }
  },
  "flow": [
    {
      "id": "page1",
      "label": "Page 1",
      "sections": [
        {
          "id": "section1",
          "label": "Section 1",
          "slots": ["model", "temperature"]  // ❌ temperature not defined
        }
      ]
    }
  ]
}
```

---

**Error:** `Template "${template.output}" fails with default values: ${String(error instanceof Error ? error.message : error)}. Ensure all slots referenced in templates have defaults or are visible to users.`

**Cause:** Dry-run validation failed - template can't be resolved using only default values

**Common reasons:**
1. Template references a model slot without a default (model slots typically don't have defaults)
2. Template references a slot that has no default and isn't visible in flow
3. Nested resolution error propagated from ref-resolver

**Solution:**
1. Ensure all model slots are visible in flow (not just in advanced)
2. Add defaults to all non-model slots
3. Verify all template `$ref` values point to valid slots
4. Check for $ref syntax errors that would cause resolution to fail

**Example:**
```json
{
  "slots": {
    "hidden_param": {
      "type": "number",
      "label": "Hidden Param"
      // ❌ No default, not in flow
    }
  },
  "flow": [...],  // hidden_param not referenced
  "templates": [
    {
      "output": "config.json",
      "template": {
        "param": { "$ref": "#/slots/hidden_param" }  // ❌ Will fail dry-run
      }
    }
  ]
}

// ✅ Fix: Add default
{
  "slots": {
    "hidden_param": {
      "type": "number",
      "label": "Hidden Param",
      "default": 10  // ✅ Now dry-run passes
    }
  }
}
```

## Best Practices

### Naming Conventions

**Use kebab-case for IDs:**
```json
// ✅ Good
"id": "kdco-workspace"
"id": "opencode-native"
"id": "my-custom-harness"

// ❌ Bad
"id": "KDCOWorkspace"
"id": "my_custom_harness"
"id": "myCustomHarness"
```

**Keep slot IDs descriptive but concise:**
```json
// ✅ Good - clear purpose, reasonable length
"orchestrator_model"
"coder_temperature"
"enable_mcp_servers"

// ❌ Too verbose
"the_model_to_use_for_orchestrator_agent"

// ❌ Too cryptic
"om"
"ct"
"mcp"
```

**Use consistent naming patterns:**
```json
// ✅ Good - consistent pattern per agent
"orchestrator_model"
"orchestrator_temperature"
"orchestrator_reasoning"

"coder_model"
"coder_temperature"
"coder_reasoning"

// ❌ Inconsistent
"orchestrator_model"
"orchestratorTemp"
"orchestrator-reasoning-effort"
```

### Default Values

**Always provide defaults for non-model slots:**

Model slots typically require user selection (providers differ), but all other slot types should have sensible defaults.

```json
{
  "slots": {
    "model": {
      "type": "model",
      "label": "Model"
      // No default - user must select
    },
    "temperature": {
      "type": "number",
      "label": "Temperature",
      "default": 0.3  // ✅ Provides default
    },
    "reasoning": {
      "type": "enum",
      "label": "Reasoning Effort",
      "default": "high",  // ✅ Provides default
      "options": ["low", "medium", "high"]
    }
  }
}
```

**Choose defaults that work for most users:**
- Temperature: `0.3` (balanced, slight creativity)
- Reasoning effort: `high` (better quality, worth the cost for most)
- Verbosity: `low` (less token usage, cleaner output)
- Boolean flags: `false` (opt-in for features)

### Organization

**Group related slots in sections:**

```json
{
  "flow": [
    {
      "id": "agents",
      "label": "Agent Configuration",
      "sections": [
        {
          "id": "orchestrator",
          "label": "Orchestrator",
          "slots": ["orchestrator_model"],
          "advanced": [
            "orchestrator_temperature",
            "orchestrator_reasoning",
            "orchestrator_verbosity"
          ]
        },
        {
          "id": "coder",
          "label": "Coder",
          "slots": ["coder_model"],
          "advanced": [
            "coder_temperature",
            "coder_reasoning",
            "coder_verbosity"
          ]
        }
      ]
    }
  ]
}
```

**Use advanced[] for power-user options:**

Hide rarely-changed parameters to avoid overwhelming users:

```json
{
  "slots": ["model"],  // ✅ Essential - always visible
  "advanced": [         // ✅ Power-user options - hidden by default
    "temperature",
    "max_tokens",
    "top_p",
    "frequency_penalty"
  ]
}
```

### Testing

**Test "untouched submit" scenario:**

Before registering a harness, ensure users can complete the wizard without changing any values:

1. All model slots must be visible in flow (not hidden in advanced)
2. All non-model slots must have defaults
3. Run `bun run harness:validate` to verify dry-run passes

**Test template output:**

After creating templates, manually verify the generated configuration:

1. Use `getSubmissionWithDefaults()` to build test values
2. Use `resolveRefs()` to generate output
3. Validate output against target schema (e.g., OpenCode config schema)

### Documentation

**Use description fields for clarity:**

```json
{
  "visual_engineering_model": {
    "type": "model",
    "label": "Visual Engineering Model",
    "description": "Frontend, UI/UX, and design-focused tasks"  // ✅ Explains purpose
  }
}
```

**Keep labels concise:**

Labels appear in the UI repeatedly - brevity improves scannability.

```json
// ✅ Good
"label": "Temperature"
"label": "Reasoning Effort"
"label": "Enable MCP"

// ❌ Too verbose
"label": "Temperature parameter for model inference"
"label": "The level of reasoning effort to use for this agent"
```

## Maintenance

### Version Tracking

**Last verified against commit:** `[To be filled when guide is finalized]`

### When to Update This Guide

This guide should be updated whenever changes are made to:

1. **Schema definitions** (`app/lib/harness-schema.ts`)
   - New slot types added
   - Validation rules changed
   - Schema structure modified

2. **Reference resolution** (`app/lib/api/ref-resolver.ts`)
   - `$ref` format changes
   - New resolution features
   - Error messages updated

3. **Registry system** (`app/lib/harness-registry.ts`)
   - Registration process changes
   - New validation requirements
   - Export interface changes

4. **Validation script** (`scripts/validate-harnesses.ts`)
   - New error types
   - Changed error messages
   - Validation logic updates

### Maintenance Checklist

When modifying harness-related code:

- [ ] Update error messages in Troubleshooting section
- [ ] Update code examples if APIs changed
- [ ] Add new sections for new features
- [ ] Test all examples against current codebase
- [ ] Update "Last verified" commit hash
- [ ] Review Best Practices for new patterns

### Contributing

When adding a new harness to the codebase:

1. Follow the Step-by-Step Guide
2. Run validation before committing
3. Consider adding your harness as an example if it demonstrates unique patterns
4. Update EXPECTED_HARNESS_IDS in sync with HARNESS_IDS


