import { z } from "zod";

export function formatZodIssues(issues: z.ZodIssue[]): string {
	return issues
		.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
		.join("; ");
}

export function normalizeDependencies(dependencies: string[]): string[] {
	return [...new Set(dependencies)].sort();
}

export const DependencyEntrySchema = z
	.string()
	.transform((dependency) => dependency.trim())
	.refine((dependency) => dependency.length > 0, {
		message: "Dependency entries must be non-empty strings",
	});

export const DependencyListSchema = z
	.array(DependencyEntrySchema)
	.transform((dependencies) => normalizeDependencies(dependencies));

export function parseDependencies(dependencies: unknown): string[] {
	const parsed = DependencyListSchema.safeParse(dependencies);
	if (!parsed.success) {
		throw new Error(
			`Invalid dependencies: ${formatZodIssues(parsed.error.issues)}`,
		);
	}

	return parsed.data;
}
