import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  examples: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Examples Overview',
    },
    {
      type: 'category',
      label: 'Basic Examples',
      items: [
        'basic/model-deployment',
        'basic/data-ingestion',
        'basic/inference',
      ],
    },
    {
      type: 'category',
      label: 'Advanced Examples',
      items: [
        'advanced/custom-models',
        'advanced/data-pipelines',
      ],
    },
  ],
};

export default sidebars;