import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

let serviceItems: string[];
try {
	serviceItems = require("./sdk-services.generated.json");
} catch {
	// Fallback when sync hasn't run (e.g., fresh clone without SDK repo)
	serviceItems = [
		"services/activity/README",
		"services/apps/README",
		"services/auth/README",
		"services/authz/README",
		"services/catalog/README",
		"services/cluster/README",
		"services/embedding/README",
		"services/extensions/README",
		"services/ingestion/README",
		"services/lab/README",
		"services/models/README",
		"services/openai/README",
		"services/retrieval/README",
		"services/serving/README",
		"services/skills/README",
		"services/tools/README",
		"services/vectordb/README",
	];
}

const sidebars: SidebarsConfig = {
	sdk: [
		"index",
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
