"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[2152],{53:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>h,frontMatter:()=>a,metadata:()=>t,toc:()=>d});const t=JSON.parse('{"id":"architecture/considerations","title":"AI Platform Architectural Considerations","description":"Data Management","source":"@site/docs/architecture/considerations.md","sourceDirName":"architecture","slug":"/architecture/considerations","permalink":"/kamiwaza-docs/next/architecture/considerations","draft":false,"unlisted":false,"tags":[],"version":"current","frontMatter":{},"sidebar":"mainSidebar","previous":{"title":"Installing Kamiwaza","permalink":"/kamiwaza-docs/next/installation/installation_process"},"next":{"title":"Welcome to Kamiwaza AI","permalink":"/kamiwaza-docs/next/company/kamiwaza"}}');var s=i(4848),r=i(8453);const a={},l="AI Platform Architectural Considerations",c={},d=[{value:"Data Management",id:"data-management",level:2},{value:"Model Management",id:"model-management",level:2},{value:"Orchestration and Routing",id:"orchestration-and-routing",level:2},{value:"Security and Access Control",id:"security-and-access-control",level:2},{value:"API and Plugin Management",id:"api-and-plugin-management",level:2},{value:"Development and Operations",id:"development-and-operations",level:2},{value:"Model Deployment and Serving",id:"model-deployment-and-serving",level:2},{value:"Caching and Performance Optimization",id:"caching-and-performance-optimization",level:2},{value:"Synthetic Data Generation",id:"synthetic-data-generation",level:2},{value:"Local Execution",id:"local-execution",level:2},{value:"In-Memory Processing",id:"in-memory-processing",level:2},{value:"Lifecycle Management",id:"lifecycle-management",level:2},{value:"Specialized Backend Services",id:"specialized-backend-services",level:2},{value:"Resource Management",id:"resource-management",level:2},{value:"Component Implementation Examples",id:"component-implementation-examples",level:2}];function o(e){const n={h1:"h1",h2:"h2",header:"header",li:"li",p:"p",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.header,{children:(0,s.jsx)(n.h1,{id:"ai-platform-architectural-considerations",children:"AI Platform Architectural Considerations"})}),"\n",(0,s.jsx)(n.h2,{id:"data-management",children:"Data Management"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Data Lakehouse"}),": Centralized repository for storing and managing large volumes of structured and unstructured data, enabling efficient data processing and analytics."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"model-management",children:"Model Management"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Embeddings Model"}),": Generates vector representations of data, facilitating efficient similarity searches and information retrieval."]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Embeddings DB"}),": Stores and indexes vector embeddings for quick and scalable similarity searches."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"orchestration-and-routing",children:"Orchestration and Routing"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Orchestration Routing"}),": Manages the flow of requests and responses between different components of the AI system, ensuring efficient resource utilization and scalability."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"security-and-access-control",children:"Security and Access Control"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Hybrid Identity Service"}),": Manages user authentication and authorization across on-premises and cloud environments, ensuring secure access to AI resources."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"api-and-plugin-management",children:"API and Plugin Management"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"APIs/Plugins"}),": Provides interfaces for external systems to interact with the AI platform, enabling integration and extensibility."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"development-and-operations",children:"Development and Operations"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"DevSecOps"}),": Integrates security practices into the development and operations processes, ensuring continuous security throughout the AI platform lifecycle."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"model-deployment-and-serving",children:"Model Deployment and Serving"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Guardrails Service"}),": Implements safety and security measures to control input and output of AI models, preventing misuse and ensuring compliance with ethical guidelines."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"caching-and-performance-optimization",children:"Caching and Performance Optimization"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Cache"}),": Improves response times and reduces computational load by storing frequently accessed data or model outputs."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"synthetic-data-generation",children:"Synthetic Data Generation"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Model Factory Synthetic Data Pipeline"}),": Generates artificial data for training and testing AI models, addressing data scarcity and privacy concerns."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"local-execution",children:"Local Execution"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Local Orchestration/Router"}),": Enables AI inference and orchestration on local devices or edge environments, reducing latency and supporting offline capabilities."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"in-memory-processing",children:"In-Memory Processing"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"In-mem Databases"}),": Utilizes memory-based data storage for ultra-fast data access and processing, crucial for real-time AI applications."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"lifecycle-management",children:"Lifecycle Management"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Lifecycle / Control Plane Agent"}),": Manages the entire lifecycle of AI models and services, from deployment to monitoring and updates."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"specialized-backend-services",children:"Specialized Backend Services"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Base Inferencing Backend"}),": Provides core inferencing capabilities, possibly leveraging KamiwazaAI for distributed, scalable inferencing."]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Function Calling Backend"}),": Enables AI models to interact with and invoke external functions or services, expanding their capabilities."]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Coding Backend"}),": Supports code generation and execution capabilities for AI models."]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"resource-management",children:"Resource Management"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.strong,{children:"Backend Inferencing and APIs on GPU, CPU, IPU, NPU"}),": Optimizes AI workloads across various hardware accelerators, ensuring efficient utilization of computational resources."]}),"\n"]}),"\n",(0,s.jsx)(n.p,{children:"By considering these elements in your AI platform architecture, you can build a robust, scalable, and secure system that meets your specific needs while leveraging the strengths of KamiwazaAI for core inferencing capabilities."}),"\n",(0,s.jsx)(n.h2,{id:"component-implementation-examples",children:"Component Implementation Examples"}),"\n",(0,s.jsx)(n.p,{children:"Below is a table showing potential implementations for various components of the AI platform:"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Component"}),(0,s.jsx)(n.th,{children:"Implementation Examples"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Data Lakehouse"}),(0,s.jsx)(n.td,{children:"TBD"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Data Retrieval"}),(0,s.jsx)(n.td,{children:"KamiwazaAI"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Embeddings Model"}),(0,s.jsx)(n.td,{children:"Stella_en_1.5B_v5, BGE-EN-ICL"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Embeddings DB"}),(0,s.jsx)(n.td,{children:"KamiwazaAI + Milvus (More options coming, e.g.Qdrant)"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Embeddings Engine"}),(0,s.jsx)(n.td,{children:"KamiwazaAI"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Orchestration Routing"}),(0,s.jsx)(n.td,{children:"DSPy"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Hybrid Identity Service"}),(0,s.jsx)(n.td,{children:"AAD-DS?"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"APIs/Plugins"}),(0,s.jsx)(n.td,{children:"OpenAPI, gRPC"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"DevSecOps"}),(0,s.jsx)(n.td,{children:"____"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Guardrails Services"}),(0,s.jsx)(n.td,{children:"DSPy, Guardrails AI, NeMo Guardrails"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Cache"}),(0,s.jsx)(n.td,{children:"Valkey, Redis, etcd, etc"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Execution Orchestration/Router"}),(0,s.jsx)(n.td,{children:"DSPy, AICI"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Lifecycle / Control Plane Agent"}),(0,s.jsx)(n.td,{children:"Rust-based custom solution"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Base Inferencing Backend"}),(0,s.jsx)(n.td,{children:"Llama 3 (to be 3.1)"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Function Calling Backend"}),(0,s.jsx)(n.td,{children:"Llama 3 (to be 3.1)"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Coding Backend"}),(0,s.jsx)(n.td,{children:"DeepSeek-Coder-v2, Llama 3 (to be 3.1)"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Backend API Services"}),(0,s.jsx)(n.td,{children:"FastAPI, Integration Hub"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Backend Inferencing and APIs"}),(0,s.jsx)(n.td,{children:"KamiwazaAI"})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"Model Factory Synthetic Data Pipeline"}),(0,s.jsxs)(n.td,{children:["DSPy, Gretel.ai",(0,s.jsx)("sup",{children:"**"})]})]})]})]}),"\n",(0,s.jsx)(n.p,{children:"This table provides examples of specific technologies or solutions that could be used to implement each component of the AI platform."}),"\n",(0,s.jsxs)(n.p,{children:[(0,s.jsx)("sup",{children:"**"}),' Gretel.ai did transition to a "SAL" style license from open source, but at last check we believe still freely usable for commercial purposes internal to an organization.']})]})}function h(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(o,{...e})}):o(e)}},8453:(e,n,i)=>{i.d(n,{R:()=>a,x:()=>l});var t=i(6540);const s={},r=t.createContext(s);function a(e){const n=t.useContext(r);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:a(e.components),t.createElement(r.Provider,{value:n},e.children)}}}]);