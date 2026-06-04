import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  'app-garden': [
    {
      type: 'doc',
      id: 'intro',
      label: 'App Garden Overview',
    },
    {
      type: 'category',
      label: 'Applications',
      items: [
        'apps/chat',
        'apps/rag',
        'apps/code-assistant',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/configuration',
        'deployment/customization',
      ],
    },
  ],
};

export default sidebars;