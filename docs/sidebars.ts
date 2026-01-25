import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// Check if federal docs should be included (excluded by default)
const includeFederal = process.env.INCLUDE_FEDERAL_DOCS === "true";

// Federal category definition
const federalCategory = {
	type: "category" as const,
	label: "Federal",
	items: ["federal/cac-overview"],
};

const sidebars: SidebarsConfig = {
	mainSidebar: [
		{
			type: "doc",
			id: "intro",
			label: "Introduction",
		},
		{
			type: "doc",
			id: "quickstart",
			label: "Quickstart",
		},
		{
			type: "category",
			label: "Installation",
			items: [
				"installation/installation_process",
				"installation/system_requirements",
				"installation/macos_tarball",
				"installation/windows_installation_guide",
				"installation/redhat_offline_install",
				"installation/gpu_setup_guide",
			],
		},
		{
			type: "category",
			label: "Security",
			items: [
				"security/admin-guide",
				"security/rebac-overview",
				"security/rebac-deployment-guide",
				"security/rebac-validation-checklist",
			],
		},
		// Conditionally include Federal category
		...(includeFederal ? [federalCategory] : []),
		{
			type: "category",
			label: "Models",
			items: [
				"models/overview",
				"models/novice-mode",
				"models/gui-walkthrough",
				"models/downloading-models",
				"models/deployment",
				"models/bedrock",
				"models/troubleshooting",
			],
		},
		{
			type: "doc",
			id: "app-garden",
			label: "App Garden",
		},
		{
			type: "doc",
			id: "data-engine",
			label: "Distributed Data Engine",
		},
		{
			type: "doc",
			id: "observability",
			label: "Observability",
		},
		{
			type: "category",
			label: "Architecture",
			items: [
				{
					type: "doc",
					id: "architecture/overview",
					label: "Platform Overview",
				},
				"architecture/components",
				"architecture/core-services",
			],
		},
		{
			type: "category",
			label: "Use Cases",
			items: ["use-cases/index", "use-cases/building-a-rag-pipeline"],
		},
		{
			type: "doc",
			id: "help-and-fixes",
			label: "Help & Fixes",
		},
		{
			type: "category",
			label: "Our Team",
			items: [
				{
					type: "doc",
					id: "team/kamiwaza",
					label: "About Kamiwaza",
				},
				"team/jobs",
				"team/mts",
			],
		},
	],
};

export default sidebars;
