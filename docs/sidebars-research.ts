import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  research: [
    'intro',
    {
      type: 'category',
      label: 'Research Papers',
      collapsed: false,
      items: [
        'papers/index',
        'papers/llm-agentic-failures',
        'papers/kami-v0-1',
        'papers/picard',
      ],
    },
    {
      type: 'category',
      label: 'Research Insights',
      collapsed: false,
      items: [
        'blogs/index',
      ],
    },
    {
      type: 'category',
      label: 'Datasets',
      collapsed: false,
      items: [
        'datasets/index',
      ],
    },
  ],
};

export default sidebars;
