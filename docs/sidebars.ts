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
        'installation/README',
        'installation/system_requirements_updates',
        'installation/installation_process',
        'installation/windows_installation_guide',
        'installation/windows_implementation_guide',
        'installation/gpu_setup_guide',
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