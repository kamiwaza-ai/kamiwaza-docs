"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[2812],{554:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>t,default:()=>h,frontMatter:()=>a,metadata:()=>l,toc:()=>o});const l=JSON.parse('{"id":"services/lab/README","title":"Lab Service","description":"Overview","source":"@site/sdk/services/lab/README.md","sourceDirName":"services/lab","slug":"/services/lab/","permalink":"/kamiwaza-docs/sdk/services/lab/","draft":false,"unlisted":false,"tags":[],"version":"current","sidebarPosition":1,"frontMatter":{"sidebar_position":1},"sidebar":"sdk","previous":{"title":"Ingestion Service","permalink":"/kamiwaza-docs/sdk/services/ingestion/"},"next":{"title":"Model Service","permalink":"/kamiwaza-docs/sdk/services/models/"}}');var r=i(4848),s=i(8453);const a={sidebar_position:1},t="Lab Service",c={},o=[{value:"Overview",id:"overview",level:2},{value:"Key Features",id:"key-features",level:2},{value:"Lab Management",id:"lab-management",level:2},{value:"Available Methods",id:"available-methods",level:3},{value:"Integration with Other Services",id:"integration-with-other-services",level:2},{value:"Error Handling",id:"error-handling",level:2},{value:"Best Practices",id:"best-practices",level:2},{value:"Performance Considerations",id:"performance-considerations",level:2},{value:"Lab States",id:"lab-states",level:2}];function d(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,s.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"lab-service",children:"Lab Service"})}),"\n",(0,r.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsxs)(n.p,{children:["The Lab Service (",(0,r.jsx)(n.code,{children:"LabService"}),") provides comprehensive lab environment management for the Kamiwaza AI Platform. Located in ",(0,r.jsx)(n.code,{children:"kamiwaza_client/services/lab.py"}),", this service handles the creation, management, and deletion of lab environments for development and experimentation."]}),"\n",(0,r.jsx)(n.h2,{id:"key-features",children:"Key Features"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Lab Environment Management"}),"\n",(0,r.jsx)(n.li,{children:"Lab Creation and Deletion"}),"\n",(0,r.jsx)(n.li,{children:"Lab Information Retrieval"}),"\n",(0,r.jsx)(n.li,{children:"Resource Management"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"lab-management",children:"Lab Management"}),"\n",(0,r.jsx)(n.h3,{id:"available-methods",children:"Available Methods"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"list_labs() -> List[Lab]"}),": List all labs"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"create_lab(lab: CreateLab) -> Lab"}),": Create new lab"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"get_lab(lab_id: UUID) -> Lab"}),": Get lab info"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"delete_lab(lab_id: UUID) -> None"}),": Delete lab"]}),"\n"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'# List all labs\nlabs = client.lab.list_labs()\nfor lab in labs:\n    print(f"Lab: {lab.name} (ID: {lab.id})")\n\n# Create new lab\nlab = client.lab.create_lab(CreateLab(\n    name="development-lab",\n    description="Development environment",\n    resources={\n        "cpu": 4,\n        "memory": "16Gi",\n        "gpu": 1\n    }\n))\n\n# Get lab details\nlab = client.lab.get_lab(lab_id)\nprint(f"Lab Status: {lab.status}")\nprint(f"Resources: {lab.resources}")\n\n# Delete lab\nclient.lab.delete_lab(lab_id)\n'})}),"\n",(0,r.jsx)(n.h2,{id:"integration-with-other-services",children:"Integration with Other Services"}),"\n",(0,r.jsx)(n.p,{children:"The Lab Service works in conjunction with:"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["Cluster Service","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"For resource allocation"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Authentication Service","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"For access control"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Activity Service","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"For tracking lab usage"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"error-handling",children:"Error Handling"}),"\n",(0,r.jsx)(n.p,{children:"The service includes built-in error handling for common scenarios:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'try:\n    lab = client.lab.create_lab(lab_config)\nexcept ResourceError:\n    print("Insufficient resources")\nexcept QuotaError:\n    print("Lab quota exceeded")\nexcept APIError as e:\n    print(f"Operation failed: {e}")\n'})}),"\n",(0,r.jsx)(n.h2,{id:"best-practices",children:"Best Practices"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsx)(n.li,{children:"Clean up unused labs"}),"\n",(0,r.jsx)(n.li,{children:"Use descriptive lab names"}),"\n",(0,r.jsx)(n.li,{children:"Monitor resource usage"}),"\n",(0,r.jsx)(n.li,{children:"Implement proper error handling"}),"\n",(0,r.jsx)(n.li,{children:"Set appropriate resource limits"}),"\n",(0,r.jsx)(n.li,{children:"Document lab purposes"}),"\n",(0,r.jsx)(n.li,{children:"Regular status checks"}),"\n",(0,r.jsx)(n.li,{children:"Maintain lab inventory"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"performance-considerations",children:"Performance Considerations"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Resource allocation affects startup time"}),"\n",(0,r.jsx)(n.li,{children:"Concurrent lab limits"}),"\n",(0,r.jsx)(n.li,{children:"Resource quotas"}),"\n",(0,r.jsx)(n.li,{children:"Network bandwidth requirements"}),"\n",(0,r.jsx)(n.li,{children:"Storage requirements"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"lab-states",children:"Lab States"}),"\n",(0,r.jsx)(n.p,{children:"Labs can be in various states:"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["Creating","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Initial setup"}),"\n",(0,r.jsx)(n.li,{children:"Resource allocation"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Running","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Fully operational"}),"\n",(0,r.jsx)(n.li,{children:"Resources allocated"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Stopping","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Cleanup in progress"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Stopped","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Resources released"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Failed","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Setup or operation failed"}),"\n"]}),"\n"]}),"\n"]})]})}function h(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(d,{...e})}):d(e)}},8453:(e,n,i)=>{i.d(n,{R:()=>a,x:()=>t});var l=i(6540);const r={},s=l.createContext(r);function a(e){const n=l.useContext(s);return l.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function t(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),l.createElement(s.Provider,{value:n},e.children)}}}]);