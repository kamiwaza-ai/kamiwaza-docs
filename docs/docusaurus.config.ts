import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Check if federal docs should be included (excluded by default)
const includeFederal = process.env.INCLUDE_FEDERAL_DOCS === 'true';

const config: Config = {
  title: 'Kamiwaza Docs',
  tagline: 'Kamiwaza AI Platform Documentation',
  favicon: 'img/favicon.ico',

  url: 'https://docs.kamiwaza.ai',
  baseUrl: '/',
  trailingSlash: false,

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  organizationName: 'kamiwaza-ai',
  projectName: 'kamiwaza-docs',

  // Deployment configuration
  deploymentBranch: 'gh-pages',
  // Force HTTPS for deployment
  customFields: {
    useSSH: false,
  },

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  onBrokenAnchors: 'ignore',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          path: 'blog',
          routeBasePath: 'blog',
          // Use our custom pages
          blogListComponent: '@theme/BlogListPage',
          blogPostComponent: '@theme/BlogPostPage',
          // Sidebar settings
          blogSidebarCount: 0,
          blogSidebarTitle: 'All Posts',
          // Additional settings
          showReadingTime: true,
          // For better debugging
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} Kamiwaza AI.`,
          },
        },
        theme: {
          customCss: [
            require.resolve('./src/css/custom.css'),
            require.resolve('./src/css/blog.css'),
            require.resolve('./src/css/research.css'),
          ],
        },
      } satisfies Preset.Options,
    ],
  ],

  // ... rest of config remains the same (plugins, themeConfig, etc.)

  plugins: [
    // Main docs plugin
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'default',
        path: 'docs',
        routeBasePath: '/',
        sidebarPath: require.resolve('./sidebars.ts'),
        lastVersion: 'current',
        versions: {
          current: {
            label: '0.9.0 (Latest)',
          },
        },
        sidebarCollapsible: true,
        sidebarCollapsed: true,
      },
    ],
    // SDK docs plugin
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'sdk',
        path: 'sdk',
        routeBasePath: 'sdk',
        sidebarPath: require.resolve('./sidebars-sdk.ts'),
        lastVersion: 'current',
        versions: {
          current: {
            label: '0.9.0 (Latest)',
          },
        },
      },
    ],
    // Research docs plugin
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'research',
        path: 'research',
        routeBasePath: 'research',
        sidebarPath: require.resolve('./sidebars-research.ts'),
        versions: {
          current: {
            label: '0.9.0 (Latest)',
          },
        },
      },
    ],
    // Local search plugin
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        searchBarPosition: 'auto',
        docsRouteBasePath: '/',
        blogRouteBasePath: 'blog',
        docsPluginIdForPreferredVersion: 'default',
        indexBlog: true,
        indexDocs: true,
        indexPages: false,
        searchContextByPaths: ['docs', 'sdk', 'research'],
        searchBarShortcut: true,
        searchBarShortcutHint: false,
        // Exclude underscore-prefixed files; also exclude federal/ when not in federal mode
        ignoreFiles: includeFederal
          ? /(?:^|\/)_/
          : /(?:^|\/)(_|federal\/)/,
        removeDefaultStopWordFilter: false,
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Kamiwaza Docs',
      logo: {
        alt: 'Kamiwaza Logo',
        src: 'img/KW_logo.png',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/sdk/intro',
          position: 'left',
          label: 'SDK',
          activeBasePath: '/sdk',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          to: '/research/intro',
          position: 'left',
          label: 'Research',
          activeBasePath: '/research',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          docsPluginId: 'default',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          docsPluginId: 'sdk',
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
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/kamiwaza-ai',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/cVGBS5rD2U',
            },
          ],
        },
        {
          title: 'Company',
          items: [
            {
              label: 'Kamiwaza.ai',
              href: 'https://kamiwaza.ai',
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