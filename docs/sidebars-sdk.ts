import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const offlineBuild = process.env.DOCUSAURUS_OFFLINE_BUILD === "true";

let serviceItems: string[];
try {
	serviceItems = require("./sdk-services.generated.json");
} catch {
	// Fallback when sync hasn't run (e.g., fresh clone without a sibling SDK repo).
	// Keep this empty so clean-checkout builds still succeed.
	serviceItems = [];
}

const sidebars: SidebarsConfig = {
	sdk: [
		"intro",
		...(offlineBuild
			? [
					{
						type: "doc" as const,
						label: "REST API Reference",
						id: "api-reference",
					},
				]
			: [
					{
						type: "link" as const,
						label: "REST API Reference",
						href: "/sdk/api/",
					},
				]),
		...(serviceItems.length > 0
			? [
					{
						type: "category" as const,
						label: "Python SDK Services",
						collapsed: true,
						items: serviceItems,
					},
				]
			: []),
	],
};

export default sidebars;
