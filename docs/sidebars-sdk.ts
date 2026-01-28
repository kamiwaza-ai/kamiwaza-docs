import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

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
			items: [
				"services/activity/README",
				"services/auth/README",
				"services/catalog/README",
				"services/cluster/README",
				"services/embedding/README",
				"services/ingestion/README",
				"services/lab/README",
				"services/models/README",
				"services/retrieval/README",
				"services/serving/README",
				"services/vectordb/README",
			],
		},
	],
};

export default sidebars;
