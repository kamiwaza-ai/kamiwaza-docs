"use strict";(self.webpackChunkmy_website=self.webpackChunkmy_website||[]).push([[636],{1084:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>d,contentTitle:()=>o,default:()=>u,frontMatter:()=>s,metadata:()=>l,toc:()=>a});var r=i(4848),t=i(8453);const s={},o="Kamiwaza System Requirements & Installation Guide",l={id:"installation/system_requirements_updates",title:"system_requirements_updates",description:"Based on the provided scripts and installation requirements, I'll help create an updated and comprehensive system requirements guide that incorporates all the key points while organizing them more effectively. Here's my suggested version:",source:"@site/docs/installation/system_requirements_updates.md",sourceDirName:"installation",slug:"/installation/system_requirements_updates",permalink:"/kamiwaza-docs/installation/system_requirements_updates",draft:!1,unlisted:!1,editUrl:"https://github.com/kamiwaza-ai/kamiwaza-docs/tree/main/docs/installation/system_requirements_updates.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"Installing Kamiwaza",permalink:"/kamiwaza-docs/installation/installation_process"}},d={},a=[{value:"Base System Requirements",id:"base-system-requirements",level:2},{value:"Supported Operating Systems",id:"supported-operating-systems",level:3},{value:"Core Requirements",id:"core-requirements",level:3},{value:"Dependencies &amp; Components",id:"dependencies--components",level:2},{value:"Required System Packages (Linux)",id:"required-system-packages-linux",level:3},{value:"NVIDIA Components (Linux GPU Support)",id:"nvidia-components-linux-gpu-support",level:3},{value:"Docker Configuration Requirements",id:"docker-configuration-requirements",level:3},{value:"Required Directory Structure",id:"required-directory-structure",level:3},{value:"Enterprise Edition",id:"enterprise-edition",level:4},{value:"Community Edition",id:"community-edition",level:4},{value:"Network Configuration",id:"network-configuration",level:2},{value:"Required Kernel Modules (Enterprise Edition Linux Only)",id:"required-kernel-modules-enterprise-edition-linux-only",level:3},{value:"System Network Parameters (Enterprise Edition Linux Only)",id:"system-network-parameters-enterprise-edition-linux-only",level:3},{value:"Community Edition Networking",id:"community-edition-networking",level:3},{value:"Storage Configuration",id:"storage-configuration",level:2},{value:"Enterprise Edition Requirements",id:"enterprise-edition-requirements",level:3},{value:"Community Edition",id:"community-edition-1",level:3},{value:"Installation Methods",id:"installation-methods",level:2},{value:"Important Notes",id:"important-notes",level:2},{value:"Additional Considerations",id:"additional-considerations",level:2},{value:"Memory Requirements",id:"memory-requirements",level:3},{value:"Network Ports",id:"network-ports",level:3},{value:"Version Compatibility",id:"version-compatibility",level:3}];function c(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,t.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.p,{children:"Based on the provided scripts and installation requirements, I'll help create an updated and comprehensive system requirements guide that incorporates all the key points while organizing them more effectively. Here's my suggested version:"}),"\n",(0,r.jsx)(n.h1,{id:"kamiwaza-system-requirements--installation-guide",children:"Kamiwaza System Requirements & Installation Guide"}),"\n",(0,r.jsx)(n.h2,{id:"base-system-requirements",children:"Base System Requirements"}),"\n",(0,r.jsx)(n.h3,{id:"supported-operating-systems",children:"Supported Operating Systems"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Linux: Ubuntu 22.04 LTS (primary)"}),"\n",(0,r.jsx)(n.li,{children:"macOS: 12.0 or later (community edition only)"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"core-requirements",children:"Core Requirements"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Python 3.10 (Python 3.10.14 tested)"}),"\n",(0,r.jsx)(n.li,{children:"Docker Engine with Compose v2"}),"\n",(0,r.jsx)(n.li,{children:"Node.js 22 (installed via NVM during setup)"}),"\n",(0,r.jsx)(n.li,{children:"Minimum 10GB free disk space"}),"\n",(0,r.jsx)(n.li,{children:"For GPU support: NVIDIA GPU with compute capability 7.0+"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"dependencies--components",children:"Dependencies & Components"}),"\n",(0,r.jsx)(n.h3,{id:"required-system-packages-linux",children:"Required System Packages (Linux)"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"# Core Python\npython3.10\npython3.10-dev\nlibpython3.10-dev\npython3.10-venv\n\n# System Tools\ngolang-cfssl\npython-is-python3\netcd-client (v3.5+)\nnet-tools\n\n# Graphics & Development Libraries\nlibcairo2-dev\nlibgirepository1.0-dev\n"})}),"\n",(0,r.jsx)(n.h3,{id:"nvidia-components-linux-gpu-support",children:"NVIDIA Components (Linux GPU Support)"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"NVIDIA Driver (550-server recommended)"}),"\n",(0,r.jsx)(n.li,{children:"NVIDIA Container Toolkit"}),"\n",(0,r.jsx)(n.li,{children:"nvidia-docker2"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"docker-configuration-requirements",children:"Docker Configuration Requirements"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Docker Engine with Compose v2"}),"\n",(0,r.jsx)(n.li,{children:"User must be in docker group"}),"\n",(0,r.jsx)(n.li,{children:"Swarm mode (Enterprise Edition)"}),"\n",(0,r.jsx)(n.li,{children:"Docker data root configuration (configurable)"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"required-directory-structure",children:"Required Directory Structure"}),"\n",(0,r.jsx)(n.h4,{id:"enterprise-edition",children:"Enterprise Edition"}),"\n",(0,r.jsx)(n.p,{children:"Note this is created by the installer and present in cloud marketplace images."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"/etc/kamiwaza/\n\u251c\u2500\u2500 config/\n\u251c\u2500\u2500 ssl/      # Cluster certificates\n\u2514\u2500\u2500 swarm/    # Swarm tokens\n\n/opt/kamiwaza/\n\u251c\u2500\u2500 containers/  # Docker root (configurable)\n\u251c\u2500\u2500 logs/\n\u251c\u2500\u2500 nvm/        # Node Version Manager\n\u2514\u2500\u2500 runtime/    # Runtime files\n"})}),"\n",(0,r.jsx)(n.h4,{id:"community-edition",children:"Community Edition"}),"\n",(0,r.jsxs)(n.p,{children:["We recommend ",(0,r.jsx)(n.code,{children:"${HOME}/kamiwaza"})," or something similar for ",(0,r.jsx)(n.code,{children:"KAMIWAZA_ROOT"}),"."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"$KAMIWAZA_ROOT/\n\u251c\u2500\u2500 env.sh\n\u251c\u2500\u2500 runtime/\n\u2514\u2500\u2500 logs/\n"})}),"\n",(0,r.jsx)(n.h2,{id:"network-configuration",children:"Network Configuration"}),"\n",(0,r.jsx)(n.h3,{id:"required-kernel-modules-enterprise-edition-linux-only",children:"Required Kernel Modules (Enterprise Edition Linux Only)"}),"\n",(0,r.jsx)(n.p,{children:"Required modules for Swarm container networking:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"overlay"}),"\n",(0,r.jsx)(n.li,{children:"br_netfilter"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"system-network-parameters-enterprise-edition-linux-only",children:"System Network Parameters (Enterprise Edition Linux Only)"}),"\n",(0,r.jsx)(n.p,{children:"These will be set by the installer."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"# Required sysctl settings for Swarm networking\nnet.bridge.bridge-nf-call-iptables  = 1\nnet.bridge.bridge-nf-call-ip6tables = 1\nnet.ipv4.ip_forward                 = 1\n"})}),"\n",(0,r.jsx)(n.h3,{id:"community-edition-networking",children:"Community Edition Networking"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Uses standard Docker bridge networks"}),"\n",(0,r.jsx)(n.li,{children:"No special kernel modules or sysctl settings required"}),"\n",(0,r.jsx)(n.li,{children:"Simplified single-node networking configuration"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"storage-configuration",children:"Storage Configuration"}),"\n",(0,r.jsx)(n.h3,{id:"enterprise-edition-requirements",children:"Enterprise Edition Requirements"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Primary mountpoint for persistent storage (/opt/kamiwaza)"}),"\n",(0,r.jsx)(n.li,{children:"Scratch/temporary storage (auto-configured)"}),"\n",(0,r.jsx)(n.li,{children:"For Azure: Additional managed disk for persistence"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"community-edition-1",children:"Community Edition"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Local filesystem storage"}),"\n",(0,r.jsx)(n.li,{children:"Configurable paths via environment variables"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"installation-methods",children:"Installation Methods"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Cloud Marketplace Images"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Pre-configured enterprise images"}),"\n",(0,r.jsx)(n.li,{children:"Automated disk & network setup"}),"\n",(0,r.jsx)(n.li,{children:"GPU support included"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Enterprise Edition Installation"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Automated installation scripts"}),"\n",(0,r.jsx)(n.li,{children:"Configurable for head/worker nodes"}),"\n",(0,r.jsx)(n.li,{children:"Full cluster support"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Community Edition Installation"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Local installation"}),"\n",(0,r.jsx)(n.li,{children:"Simplified configuration"}),"\n",(0,r.jsx)(n.li,{children:"Single-node focused"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"important-notes",children:"Important Notes"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"System Impact"}),": Network and kernel configurations can affect other services"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Security"}),": Certificate generation and management for cluster communications"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"GPU Support"}),": Available only on Linux with NVIDIA GPUs"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Storage"}),": Enterprise Edition requires specific storage configuration"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Network"}),": Enterprise Edition requires specific network ports for cluster communication"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Docker"}),": Custom Docker root configuration may affect other containers"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"additional-considerations",children:"Additional Considerations"}),"\n",(0,r.jsx)(n.h3,{id:"memory-requirements",children:"Memory Requirements"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Minimum: 16GB RAM"}),"\n",(0,r.jsx)(n.li,{children:"Recommended: 32GB RAM"}),"\n",(0,r.jsx)(n.li,{children:"GPU Workloads: 32GB RAM + GPU vRAM"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"network-ports",children:"Network Ports"}),"\n",(0,r.jsx)(n.p,{children:"Enterprise Edition requires:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"443/tcp: HTTPS primary access"}),"\n",(0,r.jsx)(n.li,{children:"51100-51199/tcp: Deployment ports for model instances (will also be used for 'App Garden' in the future)"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"version-compatibility",children:"Version Compatibility"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Docker Engine: 20.10 or later"}),"\n",(0,r.jsx)(n.li,{children:"NVIDIA Driver: 450.80.02 or later"}),"\n",(0,r.jsx)(n.li,{children:"ETCD: 3.5 or later"}),"\n",(0,r.jsx)(n.li,{children:"Node.js: 22.x (installed automatically)"}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"This represents a comprehensive organization of the system requirements and dependencies based on the provided scripts and configuration files. The distinction between Enterprise and Community editions is maintained throughout, and important system configurations are clearly documented."})]})}function u(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},8453:(e,n,i)=>{i.d(n,{R:()=>o,x:()=>l});var r=i(6540);const t={},s=r.createContext(t);function o(e){const n=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:o(e.components),r.createElement(s.Provider,{value:n},e.children)}}}]);