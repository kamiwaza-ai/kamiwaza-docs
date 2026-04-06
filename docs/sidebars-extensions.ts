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
			label: "Workroom Manager",
			collapsed: true,
			items: [
				{
					type: "doc",
					id: "workroom-manager/workroom-manager-user-guide",
					label: "User Guide",
				},
			],
		},
	],
};

export default sidebars;
