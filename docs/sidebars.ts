import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Installation',
      items: [
        'installation/installation_process',
        'installation/system_requirements',
        'installation/windows_installation',
      ],
    },
    {
      type: 'doc',
      id: 'quickstart',
      label: 'Quickstart',
    },
    {
      type: 'category',
      label: 'Models',
      items: [
        'models/overview',
        'models/novice-mode',
        'models/gui-walkthrough',
        'models/downloading-models',
        'models/deployment',
        'models/troubleshooting'
      ],
    },
    {
      type: 'doc',
      id: 'app-garden',
      label: 'App Garden',
    },
    {
      type: 'doc',
      id: 'data-engine',
      label: 'Distributed Data Engine',
    },
    {
      type: 'category',
      label: 'Use Cases',
      items: [
        'use-cases/index',
        'use-cases/building-a-rag-pipeline',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        {
          type: 'doc',
          id: 'architecture/overview',
          label: 'Platform Overview',
        },
        'architecture/components',
        'architecture/core-services',
      ],
    },
    {
      type: 'doc',
      id: 'other-topics',
      label: 'Other Topics',
    },
    {
      type: 'category',
      label: 'Our Team',
      items: [
        {
          type: 'doc',
          id: 'team/kamiwaza',
          label: 'About Kamiwaza',
        },
        'team/jobs', 
        'team/mts',
      ],
    },
  ],
};

export default sidebars;