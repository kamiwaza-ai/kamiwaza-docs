import fs from "fs";
import path from "path";
import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

// Check if federal docs should be included (excluded by default)
const includeFederal = process.env.INCLUDE_FEDERAL_DOCS === "true";
const offlineBuild = process.env.DOCUSAURUS_OFFLINE_BUILD === "true";
const readTrunkVersion = (fallback: string) => {
	try {
		const pkg = JSON.parse(
			fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
		);
		return typeof pkg.version === "string" && pkg.version ? pkg.version : fallback;
	} catch {
		return fallback;
	}
};

const latestMainVersion = readTrunkVersion("current");
const latestSdkVersion = latestMainVersion;
const latestMainLabel = `${latestMainVersion} (Latest)`;
const latestSdkLabel = `${latestSdkVersion} (Latest)`;

const config: Config = {
	title: "Kamiwaza Docs",
	tagline: "Kamiwaza AI Platform Documentation",
	favicon: "img/favicon.ico",

	url: "https://docs.kamiwaza.ai",
	// baseUrl is baked at build time. Default "/" matches the public deployment
	// at docs.kamiwaza.ai. Set DOCS_BASE_URL (e.g. "/docs/") to build the site
	// for serving under a path prefix instead.
	baseUrl: process.env.DOCS_BASE_URL || "/",
	trailingSlash: false,

	markdown: {
		mermaid: true,
		hooks: {
			onBrokenMarkdownLinks: "warn",
		},
	},

	themes: ["@docusaurus/theme-mermaid"],

	organizationName: "kamiwaza-ai",
	projectName: "kamiwaza-docs",

	// Deployment configuration
	deploymentBranch: "gh-pages",
	// Force HTTPS for deployment
	customFields: {
		useSSH: false,
		offlineBuild,
	},

	onBrokenLinks: "warn",
	onBrokenAnchors: "warn",

	future: {
		experimental_router: offlineBuild ? "hash" : "browser",
	},

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: false,
				blog: {
					path: "blog",
					routeBasePath: "blog",
					// Use our custom pages
					blogListComponent: "@theme/BlogListPage",
					blogPostComponent: "@theme/BlogPostPage",
					// Sidebar settings
					blogSidebarCount: 0,
					blogSidebarTitle: "All Posts",
					// Additional settings
					showReadingTime: true,
					// Blog feeds are disabled for the hash-router offline build.
					feedOptions: offlineBuild
						? { type: null }
						: {
								type: "all",
								copyright: `Copyright © ${new Date().getFullYear()} Kamiwaza AI.`,
							},
				},
				sitemap: offlineBuild ? false : undefined,
				theme: {
					customCss: [
						require.resolve("./src/css/custom.css"),
						require.resolve("./src/css/blog.css"),
						require.resolve("./src/css/research.css"),
					],
				},
			} satisfies Preset.Options,
		],
		...(offlineBuild
			? []
			: [
					[
						"redocusaurus",
						{
							specs: [
								{
									spec: "api/openapi.json",
									route: "/sdk/api/",
								},
							],
							theme: {
								primaryColor: "#1890ff",
							},
						},
					],
				]),
	],

	// ... rest of config remains the same (plugins, themeConfig, etc.)

	plugins: [
		// Main docs plugin
		[
			"@docusaurus/plugin-content-docs",
			{
				id: "default",
				path: "docs",
				routeBasePath: "/",
				sidebarPath: require.resolve("./sidebars.ts"),
				// Exclude federal docs from the default build entirely. The
				// includeFederal flag only gates the sidebar + search index, so
				// without this, federal/ pages still build as reachable URLs
				// (public site + air-gapped container). build:federal
				// (INCLUDE_FEDERAL_DOCS=true) re-includes them for fed customers.
				exclude: includeFederal ? [] : ["federal/**"],
				lastVersion: "current",
				versions: {
					current: {
						label: latestMainLabel,
					},
				},
				sidebarCollapsible: true,
				sidebarCollapsed: true,
			},
		],
		// SDK docs plugin
		[
			"@docusaurus/plugin-content-docs",
			{
				id: "sdk",
				path: "sdk",
				routeBasePath: "sdk",
				sidebarPath: require.resolve("./sidebars-sdk.ts"),
				lastVersion: "current",
				versions: {
					current: {
						label: latestSdkLabel,
					},
				},
				// `api-reference.mdx` is the offline-build placeholder that the
				// SDK sidebar swap script targets when DOCUSAURUS_OFFLINE_BUILD
				// is set. Drop it from hosted builds so it never appears in the
				// hosted sitemap, search index, or as a stranded URL with
				// offline-only language. The glob is applied per version, so
				// it covers `sdk/api-reference.mdx` and any
				// `sdk_versioned_docs/version-*/api-reference.mdx`. Older
				// versions ship `api-reference.md` (no `x`) with legitimate
				// content and are unaffected.
				exclude: offlineBuild ? [] : ["api-reference.mdx"],
			},
		],
		// Extensions docs plugin
		[
			"@docusaurus/plugin-content-docs",
			{
				id: "extensions",
				path: "extensions",
				routeBasePath: "extensions",
				sidebarPath: require.resolve("./sidebars-extensions.ts"),
				versions: {
					current: {
						label: "Latest",
					},
				},
			},
		],
		// Research docs plugin
		[
			"@docusaurus/plugin-content-docs",
			{
				id: "research",
				path: "research",
				routeBasePath: "research",
				sidebarPath: require.resolve("./sidebars-research.ts"),
				versions: {
					current: {
						label: latestMainLabel,
					},
				},
			},
		],
		...(offlineBuild
			? []
			: [
					[
						require.resolve("@easyops-cn/docusaurus-search-local"),
						{
							hashed: true,
							language: ["en"],
							highlightSearchTermsOnTargetPage: true,
							explicitSearchResultPath: true,
							searchBarPosition: "auto",
							docsRouteBasePath: "/",
							blogRouteBasePath: "blog",
							docsPluginIdForPreferredVersion: "default",
							indexBlog: true,
							indexDocs: true,
							indexPages: false,
							searchContextByPaths: ["docs", "sdk", "extensions", "research"],
							searchBarShortcut: true,
							searchBarShortcutHint: false,
							// Exclude underscore-prefixed files; also exclude federal/ when not in federal mode
							ignoreFiles: includeFederal ? /(?:^|\/)_/ : /(?:^|\/)(_|federal\/)/,
							removeDefaultStopWordFilter: false,
							searchResultLimits: 8,
							searchResultContextMaxLength: 50,
						},
					],
				]),
	],

	themeConfig: {
		navbar: {
			title: "Kamiwaza Docs",
			logo: {
				alt: "Kamiwaza Logo",
				src: "img/KW_logo.png",
			},
			items: [
				{
					type: "doc",
					docId: "intro",
					position: "left",
					label: "Docs",
				},
				{
					to: "/sdk",
					position: "left",
					label: "SDK",
					activeBasePath: "/sdk",
				},
				{
					to: "/extensions/intro",
					position: "left",
					label: "Extensions",
					activeBasePath: "/extensions",
				},
				{
					to: "/blog",
					label: "Blog",
					position: "left",
				},
				{
					to: "/research",
					position: "left",
					label: "Research",
					activeBasePath: "/research",
				},
				...(offlineBuild
					? []
					: [
							{
								type: "search" as const,
								position: "right" as const,
							},
						]),
				{
					type: "docsVersionDropdown",
					position: "right" as const,
					docsPluginId: "default",
				},
				{
					type: "docsVersionDropdown",
					position: "right" as const,
					docsPluginId: "sdk",
				},
			],
		},
		docs: {
			sidebar: {
				hideable: false,
				autoCollapseCategories: true,
			},
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Community",
					items: [
						{
							label: "GitHub",
							href: "https://github.com/kamiwaza-ai",
						},
						{
							label: "Discord",
							href: "https://discord.gg/cVGBS5rD2U",
						},
					],
				},
				{
					title: "Company",
					items: [
						{
							label: "Kamiwaza.ai",
							href: "https://kamiwaza.ai",
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Kamiwaza AI. Built with ❤️ for the AI community.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
