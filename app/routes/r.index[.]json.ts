export async function loader() {
	const registry = {
		$schema: "https://ocx.kdco.dev/schemas/registry.json",
		name: "Tweak Registry",
		namespace: "tweak",
		version: "1.0.0",
		author: "KDCO",
		components: [], // Empty because profiles are dynamic
	};

	return new Response(JSON.stringify(registry, null, 2), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
