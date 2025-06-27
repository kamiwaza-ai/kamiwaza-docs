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
      ],
    },
    {
      type: 'doc',
      id: 'quickstart',
      label: 'Quickstart',
    },
    {
      type: 'doc',
      id: 'examples',
      label: 'Examples',
    },
    {
      type: 'doc',
      id: 'models',
      label: 'Models',
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
    // {
    //   type: 'doc',
    //   id: 'sdk/intro',
    //   label: 'SDK',
    // },
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
      ],
    },
    {
      type: 'doc',
      id: 'other-topics',
      label: 'Other Topics',
    },
  ],
};

export default sidebars;