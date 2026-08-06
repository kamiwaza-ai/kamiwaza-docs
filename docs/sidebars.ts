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
				"installation/online_install",
				"installation/offline_install",
				"installation/two-node-deployment",
				"installation/nvidia-secure-boot",
				"installation/uninstall",
			],
		},
		{
			type: "category",
			label: "Configuration",
			items: [
				"configuration",
				"database-schema-lifecycle",
				"routing-modes",
				"workroom-storage-s3",
			],
		},
		{
			type: "category",
			label: "Runbooks",
			items: ["runbooks/core-database-upgrade-1.2"],
		},
		{
			type: "category",
			label: "Workrooms",
			items: ["workrooms/runtime-contract"],
		},
		{
			type: "category",
			label: "Security",
			items: [
				"security/admin-guide",
				"security/consent-and-classification",
				"security/rebac-overview",
				"security/rebac-deployment-guide",
				"security/rebac-validation-checklist",
			],
		},
		// Conditionally include Federal category
		...(includeFederal ? [federalCategory] : []),
		{
			type: "category",
			label: "Federation",
			items: [
				"federation/overview",
				"federation/identity-trust-modes",
				"federation/setup",
				"federation/retrieval",
				"federation/job-submission",
				"federation/operations",
				"federation/execution-gates",
				"federation/gate-packages",
				"federation/api-reference",
			],
		},
		{
			type: "category",
			label: "Models",
			items: [
				"models/overview",
				"models/novice-mode",
				"models/gui-walkthrough",
				"models/downloading-models",
				"models/deployment",
				"models/placement-overview",
				"models/placement-hardware-classes",
				"models/placement-fractional-serving",
				"models/placement-deployment-guide",
				"models/bedrock",
				"models/aws-transcribe",
				"models/openai-compatible-chat",
				"models/openai-compatible-transcribe",
				"models/troubleshooting",
			],
		},
		{
			type: "category",
			label: "Extensions",
			items: [
				{
					type: "doc",
					id: "app-garden",
					label: "App Garden",
				},
				{
					type: "doc",
					id: "tool-garden",
					label: "Tool Garden",
				},
				{
					type: "link",
					label: "Developer Guide",
					href: "/extensions/developer-guide",
				},
			],
		},
		{
			type: "category",
			label: "Distributed Data Engine",
			items: [
				{
					type: "doc",
					id: "data-engine",
					label: "Overview",
				},
				"data-connectors",
				"data-catalog",
				"retrieval-service",
			],
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
			label: "Runbooks",
			items: ["runbooks/ontology-graph-viewer"],
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
