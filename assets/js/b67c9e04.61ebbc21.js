"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[8215],{8943:(n,e,i)=>{i.r(e),i.d(e,{assets:()=>a,contentTitle:()=>o,default:()=>u,frontMatter:()=>r,metadata:()=>t,toc:()=>d});const t=JSON.parse('{"id":"installation/installation_process","title":"Installing Kamiwaza","description":"Overview","source":"@site/versioned_docs/version-0.3.2/installation/installation_process.md","sourceDirName":"installation","slug":"/installation/installation_process","permalink":"/kamiwaza-docs/0.3.2/installation/installation_process","draft":false,"unlisted":false,"tags":[],"version":"0.3.2","frontMatter":{}}');var s=i(4848),l=i(8453);const r={},o="Installing Kamiwaza",a={},d=[{value:"Overview",id:"overview",level:2},{value:"Installation Workflows",id:"installation-workflows",level:2},{value:"1. Community Edition on OSX",id:"1-community-edition-on-osx",level:3},{value:"2. Community Edition on Linux",id:"2-community-edition-on-linux",level:3},{value:"3. Enterprise Edition",id:"3-enterprise-edition",level:3},{value:"A. Terraform Deployment (Recommended)",id:"a-terraform-deployment-recommended",level:4},{value:"B. Manual Cluster Deployment",id:"b-manual-cluster-deployment",level:4},{value:"Important Notes",id:"important-notes",level:2}];function c(n){const e={code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",header:"header",li:"li",mermaid:"mermaid",ol:"ol",p:"p",ul:"ul",...(0,l.R)(),...n.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(e.header,{children:(0,s.jsx)(e.h1,{id:"installing-kamiwaza",children:"Installing Kamiwaza"})}),"\n",(0,s.jsx)(e.h2,{id:"overview",children:"Overview"}),"\n",(0,s.jsx)(e.p,{children:"Kamiwaza can be installed in three main configurations:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"Community Edition on OSX (single-node)"}),"\n",(0,s.jsx)(e.li,{children:"Community Edition on Linux (single-node)"}),"\n",(0,s.jsx)(e.li,{children:"Enterprise Edition (cluster-capable)"}),"\n"]}),"\n",(0,s.jsx)(e.h2,{id:"installation-workflows",children:"Installation Workflows"}),"\n",(0,s.jsx)(e.h3,{id:"1-community-edition-on-osx",children:"1. Community Edition on OSX"}),"\n",(0,s.jsx)(e.p,{children:"Simple, single-command installation:"}),"\n",(0,s.jsx)(e.mermaid,{value:"flowchart LR\n    install[install.sh --community] --\x3e running[Service Running]"}),"\n",(0,s.jsx)(e.h3,{id:"2-community-edition-on-linux",children:"2. Community Edition on Linux"}),"\n",(0,s.jsx)(e.p,{children:"Two options available:"}),"\n",(0,s.jsx)(e.mermaid,{value:'flowchart LR\n    subgraph "Option A: Direct Install"\n        install[install.sh --community] --\x3e running1[Service Running]\n    end\n    \n    subgraph "Option B: Automated Setup"\n        mountlocal[mountlocal.sh] --\x3e sh1[1.sh]\n        sh1 --\x3e sh2[2.sh]\n        sh2 --\x3e sh3[3.sh]\n        sh3 --\x3e running2[Service Running]\n    end'}),"\n",(0,s.jsxs)(e.p,{children:["Note: ",(0,s.jsx)(e.code,{children:"mountlocal.sh"})," is only needed for Azure deployments requiring specific disk configurations.\nThe automated setup sequence (1.sh -> 2.sh -> 3.sh) can be used on any Linux system, but is primarily tested on Azure."]}),"\n",(0,s.jsx)(e.h3,{id:"3-enterprise-edition",children:"3. Enterprise Edition"}),"\n",(0,s.jsx)(e.h4,{id:"a-terraform-deployment-recommended",children:"A. Terraform Deployment (Recommended)"}),"\n",(0,s.jsx)(e.mermaid,{value:"flowchart LR\n    deploy[deploy with terraform] --\x3e init[cloud-init]\n    init --\x3e first[first-boot.sh]\n    first --\x3e running[Service Running]"}),"\n",(0,s.jsx)(e.p,{children:"Key Points:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"Terraform handles complete cluster setup"}),"\n",(0,s.jsx)(e.li,{children:"cloud-init automatically runs first-boot.sh"}),"\n",(0,s.jsx)(e.li,{children:"Service starts automatically via systemd"}),"\n"]}),"\n",(0,s.jsx)(e.h4,{id:"b-manual-cluster-deployment",children:"B. Manual Cluster Deployment"}),"\n",(0,s.jsx)(e.mermaid,{value:'flowchart LR\n    deploy[deploy image] --\x3e prep["cluster-manual-prep.sh --head/--worker"]\n    prep --\x3e first[first-boot.sh]\n    first --\x3e running[Service Running]'}),"\n",(0,s.jsx)(e.p,{children:"Key Points:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"Requires manual cluster setup via cluster-manual-prep.sh"}),"\n",(0,s.jsxs)(e.li,{children:["Must specify correct role (",(0,s.jsx)(e.code,{children:"--head"})," or ",(0,s.jsx)(e.code,{children:"--worker --head-ip=<IP>"}),")"]}),"\n",(0,s.jsx)(e.li,{children:"Service starts automatically via systemd"}),"\n"]}),"\n",(0,s.jsx)(e.h2,{id:"important-notes",children:"Important Notes"}),"\n",(0,s.jsxs)(e.ol,{children:["\n",(0,s.jsxs)(e.li,{children:["\n",(0,s.jsx)(e.p,{children:"Community Edition:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"OSX: Simple install.sh --community command"}),"\n",(0,s.jsx)(e.li,{children:"Linux: Choose between direct install or automated setup sequence"}),"\n",(0,s.jsx)(e.li,{children:"Automated setup (1.sh -> 2.sh -> 3.sh) handles prerequisites and NVIDIA container testing"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(e.li,{children:["\n",(0,s.jsx)(e.p,{children:"Enterprise Edition:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"Terraform method provides fully automated deployment"}),"\n",(0,s.jsx)(e.li,{children:"Manual method requires explicit cluster role specification"}),"\n",(0,s.jsx)(e.li,{children:"Both methods result in automatically running services"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(e.li,{children:["\n",(0,s.jsx)(e.p,{children:"Service Management:"}),"\n",(0,s.jsxs)(e.ul,{children:["\n",(0,s.jsx)(e.li,{children:"first-boot.sh configures and starts the service via systemd"}),"\n",(0,s.jsx)(e.li,{children:"No need to manually run startup scripts"}),"\n"]}),"\n"]}),"\n"]})]})}function u(n={}){const{wrapper:e}={...(0,l.R)(),...n.components};return e?(0,s.jsx)(e,{...n,children:(0,s.jsx)(c,{...n})}):c(n)}},8453:(n,e,i)=>{i.d(e,{R:()=>r,x:()=>o});var t=i(6540);const s={},l=t.createContext(s);function r(n){const e=t.useContext(l);return t.useMemo((function(){return"function"==typeof n?n(e):{...e,...n}}),[e,n])}function o(n){let e;return e=n.disableParentContext?"function"==typeof n.components?n.components(s):n.components||s:r(n.components),t.createElement(l.Provider,{value:e},n.children)}}}]);