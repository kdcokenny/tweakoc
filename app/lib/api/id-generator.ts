/**
 * Generate OCX-safe component IDs for profiles
 * Format: p- + 8-char lowercase base36
 * Pattern: /^p-[a-z0-9]{8}$/
 */

export function generateComponentId(): string {
	const uuid = crypto.randomUUID().replace(/-/g, "");
	const num = BigInt(`0x${uuid.slice(0, 16)}`);
	const base36 = num.toString(36).toLowerCase().slice(0, 8).padStart(8, "0");
	return `p-${base36}`;
}

export function isValidComponentId(id: string): boolean {
	return /^p-[a-z0-9]{8}$/.test(id);
}
