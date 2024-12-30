import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
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
        'architecture/architecture',
        'architecture/considerations',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'troubleshooting/docker-gpu-error-could-not-select-device-driver-nvidia-container-runtime',
      ],
    },
  ],
};

export default sidebars;