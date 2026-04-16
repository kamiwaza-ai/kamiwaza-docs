import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
	extensions: [
		"intro",
		"developer-guide",
		{
			type: "category",
			label: "OmniParse",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "omniparse/omniparse-service-guide",
					label: "Service Guide",
				},
			],
		},
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
				{
					type: "doc",
					id: "kaizen/changelog",
					label: "Changelog",
				},
			],
		},
		{
			type: "category",
			label: "Skills Library",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "skills-library/skills-library-guide",
					label: "User Guide",
				},
			],
		},
		{
			type: "category",
			label: "Graphiti",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "graphiti/graphiti-service-guide",
					label: "Service Guide",
				},
			],
		},
		{
			type: "category",
			label: "Workroom Manager",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "workroom-manager/workroom-manager-user-guide",
					label: "User Guide",
				},
				{
					type: "doc",
					id: "workroom-manager/workroom-runtime-contract",
					label: "Runtime Contract",
				},
			],
		},
	],
};

export default sidebars;
