import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  research: [
    'intro',
    {
      type: 'category',
      label: 'Agentic Merit Index',
      collapsed: false,
      items: [
        'agentic-merit-index/index',
      ],
    },
    {
      type: 'category',
      label: 'Executive Insights',
      collapsed: false,
      items: [
        'executive-insights/index',
      ],
    },
    {
      type: 'category',
      label: 'Research Papers',
      collapsed: false,
      items: [
        'papers/index',
        'papers/riker',
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
        'blogs/qwen3-next-80b-long-context-champion',
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
