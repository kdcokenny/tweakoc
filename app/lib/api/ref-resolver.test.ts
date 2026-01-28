import { describe, expect, it } from "vitest";
import {
	buildResolverContext,
	type ResolverContext,
	resolveRefs,
} from "./ref-resolver";

describe("resolveRefs", () => {
	const context: ResolverContext = {
		slots: {
			ultrabrain: {
				providerId: "openai",
				modelId: "gpt-5",
				model: "openai/gpt-5",
			},
			quick: {
				providerId: "anthropic",
				modelId: "haiku",
				model: "anthropic/haiku",
			},
			"visual-engineering": {
				providerId: "google",
				modelId: "gemini",
				model: "google/gemini",
			},
		},
		options: {
			renameWindow: true,
			theme: "dark",
		},
	};

	it("resolves simple $ref", () => {
		const template = { model: { $ref: "#/slots/ultrabrain/model" } };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ model: "openai/gpt-5" });
	});

	it("resolves nested $ref", () => {
		const template = {
			config: {
				primary: { $ref: "#/slots/ultrabrain/model" },
				secondary: { $ref: "#/slots/quick/model" },
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
			models: [
				{ $ref: "#/slots/ultrabrain/model" },
				{ $ref: "#/slots/quick/model" },
			],
		};
		const result = resolveRefs(template, context);
		expect(result).toEqual({
			models: ["openai/gpt-5", "anthropic/haiku"],
		});
	});

	it("resolves hyphenated slot IDs", () => {
		const template = { model: { $ref: "#/slots/visual-engineering/model" } };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ model: "google/gemini" });
	});

	it("resolves options", () => {
		const template = { rename: { $ref: "#/options/renameWindow" } };
		const result = resolveRefs(template, context);
		expect(result).toEqual({ rename: true });
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
			model: { $ref: "#/slots/ultrabrain/model", extra: "value" },
		};
		expect(() => resolveRefs(template, context)).toThrow("sibling keys");
	});

	it("throws on invalid pointer format", () => {
		const template = { model: { $ref: "slots/ultrabrain/model" } };
		expect(() => resolveRefs(template, context)).toThrow(
			'must start with "#/"',
		);
	});

	it("throws on non-existent path", () => {
		const template = { model: { $ref: "#/slots/nonexistent/model" } };
		expect(() => resolveRefs(template, context)).toThrow(
			'key "nonexistent" not found',
		);
	});

	it("handles RFC 6901 escaping (~0 and ~1)", () => {
		const contextWithSpecialKeys: ResolverContext = {
			slots: {
				"a/b": { providerId: "test", modelId: "slash", model: "test/slash" },
				"x~y": { providerId: "test", modelId: "tilde", model: "test/tilde" },
			},
			options: {},
		};

		// ~1 decodes to /
		const template1 = { model: { $ref: "#/slots/a~1b/model" } };
		expect(resolveRefs(template1, contextWithSpecialKeys)).toEqual({
			model: "test/slash",
		});

		// ~0 decodes to ~
		const template2 = { model: { $ref: "#/slots/x~0y/model" } };
		expect(resolveRefs(template2, contextWithSpecialKeys)).toEqual({
			model: "test/tilde",
		});
	});

	it("throws on max depth exceeded", () => {
		// Create deeply nested template
		let template: Record<string, unknown> = {
			value: { $ref: "#/slots/ultrabrain/model" },
		};
		for (let i = 0; i < 150; i++) {
			template = { nested: template };
		}
		expect(() => resolveRefs(template, context)).toThrow("Max depth");
	});
});

describe("buildResolverContext", () => {
	it("builds context with computed model field", () => {
		const slots = {
			ultrabrain: { providerId: "openai", modelId: "gpt-5" },
			quick: { providerId: "anthropic", modelId: "haiku" },
		};
		const options = { theme: "dark" };

		const context = buildResolverContext(slots, options);

		expect(context.slots.ultrabrain.model).toBe("openai/gpt-5");
		expect(context.slots.quick.model).toBe("anthropic/haiku");
		expect(context.options).toEqual({ theme: "dark" });
	});
});
