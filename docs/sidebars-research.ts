import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  research: [
    'index',
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
        'papers/riker2',
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
        'blogs/tokenizer-efficiency-hidden-cost',
        'blogs/qwen35-9b-small-model-big-leagues',
        'blogs/hallucination-resistance-long-context',
        'blogs/reducing-llm-hallucinations-enterprise-lora-finetuning',
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
