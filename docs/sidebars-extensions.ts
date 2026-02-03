import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
	extensions: [
		"intro",
		{
			type: "category",
			label: "Kaizen",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "kaizen/kaizen-user-guide",
					label: "User Guide",
				},
			],
		},
	],
};

export default sidebars;
