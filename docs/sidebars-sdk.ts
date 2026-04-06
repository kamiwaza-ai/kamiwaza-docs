import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

let serviceItems: string[];
try {
	serviceItems = require("./sdk-services.generated.json");
} catch {
	// Fallback when sync hasn't run (e.g., fresh clone without SDK repo)
	serviceItems = [
		"current/services/activity",
		"current/services/apps",
		"current/services/auth",
		"current/services/authz",
		"current/services/catalog",
		"current/services/cluster",
		"current/services/embedding",
		"current/services/extensions",
		"current/services/ingestion",
		"current/services/lab",
		"current/services/models",
		"current/services/openai",
		"current/services/retrieval",
		"current/services/serving",
		"current/services/skills",
		"current/services/tools",
		"current/services/vectordb",
	];
}

const sidebars: SidebarsConfig = {
	sdk: [
		"intro",
		{
			type: "link",
			label: "REST API Reference",
			href: "/sdk/api/",
		},
		{
			type: "category",
			label: "Python SDK Services",
			collapsed: true,
			items: serviceItems,
		},
	],
};

export default sidebars;
