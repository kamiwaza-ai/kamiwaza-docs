import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Kamiwaza Docs',
  tagline: 'Kamiwaza AI Platform Documentation',
  favicon: 'img/favicon.ico',

  // Set the production URL of your site here
  url: 'https://kamiwaza-ai.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub Pages deployment, it is often '/<projectName>/'
  baseUrl: '/kamiwaza-docs/',

  // GitHub Pages deployment config.
  organizationName: 'kamiwaza-ai', // Your organization name
  projectName: 'kamiwaza-docs', // Your repository name

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
          path: './docs'
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/kamiwaza-ai/kamiwaza-docs/tree/main/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Kamiwaza Docs',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'tutorialSidebar', label: 'Docs', position: 'left' },
        { to: '/blog', label: 'Blog', position: 'left' },
        { href: 'https://github.com/kamiwaza-ai/kamiwaza-docs', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/intro',
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
