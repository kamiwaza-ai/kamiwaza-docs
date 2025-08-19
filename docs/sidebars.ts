import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
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