import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMermaid from 'remark-mermaid';

const config: Config = {
  title: 'Kamiwaza Docs',
  tagline: 'Kamiwaza AI Platform Documentation',
  favicon: 'img/favicon.ico',

  url: 'https://kamiwaza-ai.github.io',
  baseUrl: '/kamiwaza-docs/',

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  organizationName: 'kamiwaza-ai',
  projectName: 'kamiwaza-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/kamiwaza-ai/kamiwaza-docs/tree/main/',
          routeBasePath: '/',
          path: './docs',
          lastVersion: 'current',
          versions: {
            current: {
              label: '0.3.2 (Current)',
              path: 'current',
              banner: 'none',
            },
            next: {
              label: 'Next',
              path: 'next',
              banner: 'unreleased',
            },
          },
          onlyIncludeVersions: ['current', 'next'],
          // Version banners
          versions: {
            current: {
              label: '0.3.2',
              path: 'current',
              banner: 'none',
            },
            next: {
              label: 'Next',
              path: 'next',
              banner: 'unreleased',
              badge: true, 
              className: 'next-version-banner',
            },
          },
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/kamiwaza-ai/kamiwaza-docs/tree/main/docs/',
          path: './company/blog',
          routeBasePath: 'company/blog',
        },
        theme: {},
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
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
            label: '0.3.2',
            path: 'current',
            banner: 'none',
          },
          next: {
            label: 'Next',
            path: 'next',
            banner: 'unreleased',
          },
        },
      },
    ],
    // ... other plugins remain the same
  ],

  themeConfig: {
    // Custom messages for version banners
    announcementBar: {
      // This css selector helps style just the version banners
      id: 'version-banner',
      content:
        'unreleased' === 'You are viewing documentation for an unreleased version. For the latest stable release (v0.3.2), <a href="/current">click here</a>.',
      backgroundColor: '#fafbfc',
      textColor: '#091E42',
      isCloseable: false,
    },
    // ... rest of themeConfig
  } satisfies Preset.ThemeConfig,
};

export default config;