import { describe, expect, it } from "vitest";
import {
	buildResolverContext,
	type ResolverContext,
	resolveRefs,
} from "./ref-resolver";

describe("resolveRefs", () => {
	const context: ResolverContext = {
		slots: {
			ultrabrain: "openai/gpt-5",
			quick: "anthropic/haiku",
			"visual-engineering": "google/gemini",
		},
	};

	it("resolves simple $ref", () => {
		const template = { model: { $ref: "#/slots/ultrabrain" } };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ model: "openai/gpt-5" });
	});

	it("resolves nested $ref", () => {
		const template = {
			config: {
				primary: { $ref: "#/slots/ultrabrain" },
				secondary: { $ref: "#/slots/quick" },
			},
		};
		const result = resolveRefs(template, context);
		expect(result).toEqual({
			config: {
				primary: "openai/gpt-5",
				secondary: "anthropic/haiku",
			},
		});
	});

	it("resolves $ref in arrays", () => {
		const template = {
			models: [{ $ref: "#/slots/ultrabrain" }, { $ref: "#/slots/quick" }],
		};
		const result = resolveRefs(template, context);
		expect(result).toEqual({
			models: ["openai/gpt-5", "anthropic/haiku"],
		});
	});

	it("resolves hyphenated slot IDs", () => {
		const template = { model: { $ref: "#/slots/visual-engineering" } };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ model: "google/gemini" });
	});

	it("passes through primitives", () => {
		const template = { name: "test", count: 42, enabled: true };
		const result = resolveRefs(template, context);
		expect(result).toEqual(template);
	});

	it("passes through null and undefined", () => {
		const template = { a: null, b: undefined };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ a: null, b: undefined });
	});

	it("throws on sibling keys with $ref", () => {
		const template = {
			model: { $ref: "#/slots/ultrabrain", extra: "value" },
		};
		expect(() => resolveRefs(template, context)).toThrow("sibling keys");
	});

	it("throws on invalid pointer format", () => {
		const template = { model: { $ref: "slots/ultrabrain" } };
		expect(() => resolveRefs(template, context)).toThrow(
			'must start with "#/slots/"',
		);
	});

	it("throws on unknown slot ID", () => {
		const template = { model: { $ref: "#/slots/nonexistent" } };
		expect(() => resolveRefs(template, context)).toThrow(
			'slot "nonexistent" not found',
		);
	});

	it("throws on nested path in $ref", () => {
		const template = { model: { $ref: "#/slots/ultrabrain/model" } };
		expect(() => resolveRefs(template, context)).toThrow(
			"nested paths are not supported",
		);
	});

	it("handles RFC 6901 escaping (~0 and ~1)", () => {
		const contextWithSpecialKeys: ResolverContext = {
			slots: {
				"a/b": "test/slash",
				"x~y": "test/tilde",
			},
		};

		// Note: In flat slots model, we don't support path traversal
		// These special keys are just part of the slot ID itself
		const template1 = { value: { $ref: "#/slots/a/b" } };
		expect(() => resolveRefs(template1, contextWithSpecialKeys)).toThrow(
			"nested paths are not supported",
		);

		// Slot IDs with ~ should work directly without escaping
		const template2 = { value: { $ref: "#/slots/x~y" } };
		expect(resolveRefs(template2, contextWithSpecialKeys)).toEqual({
			value: "test/tilde",
		});
	});

	it("throws on max depth exceeded", () => {
		// Create deeply nested template
		let template: Record<string, unknown> = {
			value: { $ref: "#/slots/ultrabrain" },
		};
		for (let i = 0; i < 150; i++) {
			template = { nested: template };
		}
		expect(() => resolveRefs(template, context)).toThrow("Max depth");
	});
});

describe("buildResolverContext", () => {
	it("builds flat slots context from harness and values", () => {
		const harness = {
			id: "test",
			name: "Test",
			description: "Test harness",
			slots: {
				ultrabrain: {
					type: "model" as const,
					label: "Ultrabrain Model",
					default: "anthropic/claude-sonnet-4",
				},
				quick: {
					type: "model" as const,
					label: "Quick Model",
					default: "anthropic/claude-haiku-3",
				},
			},
			flow: [{ id: "test", title: "Test", slots: [] }],
			outputs: [{ path: "test.txt", template: "test" }],
			templates: [{ id: "test", content: "test" }],
		};

		const slotValues = {
			ultrabrain: "openai/gpt-5",
			quick: "anthropic/haiku",
		};

		const context = buildResolverContext(harness, slotValues);

		expect(context.slots.ultrabrain).toBe("openai/gpt-5");
		expect(context.slots.quick).toBe("anthropic/haiku");
	});

	it("applies defaults for missing values", () => {
		const harness = {
			id: "test",
			name: "Test",
			description: "Test harness",
			slots: {
				model: {
					type: "model" as const,
					label: "Model",
					default: "anthropic/claude-sonnet-4",
				},
			},
			flow: [{ id: "test", title: "Test", slots: [] }],
			outputs: [{ path: "test.txt", template: "test" }],
			templates: [{ id: "test", content: "test" }],
		};

		const context = buildResolverContext(harness, {});

		expect(context.slots.model).toBe("anthropic/claude-sonnet-4");
	});
});
