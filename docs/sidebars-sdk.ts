import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdk: [
    'intro',
    'api-reference',
    {
      type: 'category',
      label: 'Services',
      collapsed: false,
      items: [
        'services/activity/README',
        'services/auth/README',
        'services/catalog/README',
        'services/cluster/README',
        'services/embedding/README',
        'services/ingestion/README',
        'services/lab/README',
        'services/models/README',
        'services/retrieval/README',
        'services/serving/README',
        'services/vectordb/README',
      ],
    },
  ],
};

export default sidebars;