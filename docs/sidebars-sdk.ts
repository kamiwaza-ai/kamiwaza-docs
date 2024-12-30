import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdk: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'API Reference',
      items: ['api/reference'],
    },
    {
      type: 'category',
      label: 'Services',
      items: [
        'services/auth',
        'services/models',
        'services/serving',
        'services/vectordb',
        'services/embedding',
        'services/retrieval',
        'services/ingestion',
        'services/cluster',
        'services/lab',
        'services/activity',
        'services/catalog',
      ],
    },
  ],
};

export default sidebars;