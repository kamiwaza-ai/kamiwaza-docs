import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Kamiwaza Docs',
  tagline: 'Kamiwaza AI Platform Documentation',
  favicon: 'img/favicon.ico',

  url: 'https://kamiwaza-ai.github.io',
  baseUrl: '/kamiwaza-docs/',
  trailingSlash: false,

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  organizationName: 'kamiwaza-ai',
  projectName: 'kamiwaza-docs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

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
            label: '0.3.2',
          },
        },
        sidebarCollapsible: true,
        sidebarCollapsed: false,
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
        versions: {
          current: {
            label: '0.3.2',
          },
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Kamiwaza Docs',
      logo: {
        alt: 'Kamiwaza Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/',
          position: 'left',
          label: 'Docs',
          activeBaseRegex: '^/$|^/(?!sdk|blog)',
        },
        {
          to: '/sdk/intro',
          position: 'left',
          label: 'SDK',
          activeBaseRegex: '^/sdk',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          type: 'html',
          position: 'right',
          className: 'navbar__version',
          value: 'Version: 0.3.2',
        },
        {
          href: 'https://github.com/kamiwaza-ai/kamiwaza-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    docs: {
      sidebar: {
        hideable: false,
        autoCollapseCategories: false,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Platform',
              to: '/',
            },
            {
              label: 'SDK',
              to: '/sdk/intro',
            },
          ],
        },
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
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Kamiwaza AI.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;