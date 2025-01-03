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
      label: 'Installation & Setup',
      items: [
        'installation/system_requirements_updates',
        'installation/installation_process',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/considerations',
      ],
    },
    {
      type: 'category',
      label: 'Company',
      items: [
        'company/kamiwaza',
        'company/jobs',
        'company/mts',
      ],
    },
  ],
};

export default sidebars;