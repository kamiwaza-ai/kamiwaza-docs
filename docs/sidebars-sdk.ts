import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

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
		"index",
		{
			type: "link",
			label: "REST API Reference",
			href: "/sdk/api/",
		},
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
