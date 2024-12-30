"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[364],{5627:(e,n,a)=>{a.r(n),a.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>h,frontMatter:()=>r,metadata:()=>t,toc:()=>d});const t=JSON.parse('{"id":"sdk/services/catalog/README","title":"Catalog Service","description":"Overview","source":"@site/versioned_docs/version-0.3.2/sdk/services/catalog/README.md","sourceDirName":"sdk/services/catalog","slug":"/sdk/services/catalog/","permalink":"/kamiwaza-docs/sdk/services/catalog/","draft":false,"unlisted":false,"tags":[],"version":"0.3.2","frontMatter":{}}');var s=a(4848),i=a(8453);const r={},l="Catalog Service",c={},d=[{value:"Overview",id:"overview",level:2},{value:"Key Features",id:"key-features",level:2},{value:"Dataset Management",id:"dataset-management",level:2},{value:"Available Methods",id:"available-methods",level:3},{value:"Container Management",id:"container-management",level:2},{value:"Available Methods",id:"available-methods-1",level:3},{value:"Secret Management",id:"secret-management",level:2},{value:"Available Methods",id:"available-methods-2",level:3},{value:"Integration with Other Services",id:"integration-with-other-services",level:2},{value:"Error Handling",id:"error-handling",level:2},{value:"Best Practices",id:"best-practices",level:2},{value:"Performance Considerations",id:"performance-considerations",level:2}];function o(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.header,{children:(0,s.jsx)(n.h1,{id:"catalog-service",children:"Catalog Service"})}),"\n",(0,s.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,s.jsxs)(n.p,{children:["The Catalog Service (",(0,s.jsx)(n.code,{children:"CatalogService"}),") provides comprehensive dataset and container management for the Kamiwaza AI Platform. Located in ",(0,s.jsx)(n.code,{children:"kamiwaza_client/services/catalog.py"}),", this service handles dataset operations, container management, and secret handling for secure data access."]}),"\n",(0,s.jsx)(n.h2,{id:"key-features",children:"Key Features"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"Dataset Management"}),"\n",(0,s.jsx)(n.li,{children:"Container Organization"}),"\n",(0,s.jsx)(n.li,{children:"Secret Management"}),"\n",(0,s.jsx)(n.li,{children:"Data Ingestion"}),"\n",(0,s.jsx)(n.li,{children:"Catalog Maintenance"}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"dataset-management",children:"Dataset Management"}),"\n",(0,s.jsx)(n.h3,{id:"available-methods",children:"Available Methods"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"list_datasets() -> List[Dataset]"}),": List all datasets"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"create_dataset(dataset: CreateDataset) -> Dataset"}),": Create new dataset"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"get_dataset(dataset_id: UUID) -> Dataset"}),": Get dataset info"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"ingest_by_path(path: str, **kwargs) -> IngestionResponse"}),": Ingest dataset by path"]}),"\n"]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# List all datasets\ndatasets = client.catalog.list_datasets()\nfor dataset in datasets:\n    print(f"Dataset: {dataset.name}")\n    print(f"Description: {dataset.description}")\n\n# Create new dataset\ndataset = client.catalog.create_dataset(CreateDataset(\n    name="training-data",\n    description="Training dataset for model XYZ",\n    metadata={\n        "source": "internal",\n        "version": "1.0"\n    }\n))\n\n# Get dataset details\ndataset = client.catalog.get_dataset(dataset_id)\nprint(f"Status: {dataset.status}")\nprint(f"Size: {dataset.size}")\n\n# Ingest dataset from path\nresponse = client.catalog.ingest_by_path(\n    path="/data/training",\n    recursive=True,\n    file_pattern="*.csv"\n)\n'})}),"\n",(0,s.jsx)(n.h2,{id:"container-management",children:"Container Management"}),"\n",(0,s.jsx)(n.h3,{id:"available-methods-1",children:"Available Methods"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"list_containers() -> List[Container]"}),": List all containers"]}),"\n"]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# List containers\ncontainers = client.catalog.list_containers()\nfor container in containers:\n    print(f"Container: {container.name}")\n    print(f"Type: {container.type}")\n'})}),"\n",(0,s.jsx)(n.h2,{id:"secret-management",children:"Secret Management"}),"\n",(0,s.jsx)(n.h3,{id:"available-methods-2",children:"Available Methods"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"secret_exists(name: str) -> bool"}),": Check secret existence"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"create_secret(secret: CreateSecret) -> Secret"}),": Create new secret"]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"flush_catalog() -> None"}),": Clear catalog data"]}),"\n"]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# Check if secret exists\nif client.catalog.secret_exists("api-key"):\n    print("Secret exists")\n\n# Create new secret\nsecret = client.catalog.create_secret(CreateSecret(\n    name="database-credentials",\n    value="secret-value",\n    metadata={\n        "type": "database",\n        "environment": "production"\n    }\n))\n\n# Clear catalog data\nclient.catalog.flush_catalog()\n'})}),"\n",(0,s.jsx)(n.h2,{id:"integration-with-other-services",children:"Integration with Other Services"}),"\n",(0,s.jsx)(n.p,{children:"The Catalog Service works in conjunction with:"}),"\n",(0,s.jsxs)(n.ol,{children:["\n",(0,s.jsxs)(n.li,{children:["Ingestion Service","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"For dataset processing"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:["Authentication Service","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"For access control"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:["VectorDB Service","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"For vector storage"}),"\n"]}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:["Retrieval Service","\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"For data access"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"error-handling",children:"Error Handling"}),"\n",(0,s.jsx)(n.p,{children:"The service includes built-in error handling for common scenarios:"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'try:\n    dataset = client.catalog.create_dataset(dataset_config)\nexcept DatasetExistsError:\n    print("Dataset already exists")\nexcept StorageError:\n    print("Storage operation failed")\nexcept APIError as e:\n    print(f"Operation failed: {e}")\n'})}),"\n",(0,s.jsx)(n.h2,{id:"best-practices",children:"Best Practices"}),"\n",(0,s.jsxs)(n.ol,{children:["\n",(0,s.jsx)(n.li,{children:"Use meaningful dataset names"}),"\n",(0,s.jsx)(n.li,{children:"Include comprehensive metadata"}),"\n",(0,s.jsx)(n.li,{children:"Implement proper error handling"}),"\n",(0,s.jsx)(n.li,{children:"Regular catalog maintenance"}),"\n",(0,s.jsx)(n.li,{children:"Secure secret management"}),"\n",(0,s.jsx)(n.li,{children:"Monitor storage usage"}),"\n",(0,s.jsx)(n.li,{children:"Document dataset lineage"}),"\n",(0,s.jsx)(n.li,{children:"Validate data before ingestion"}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"performance-considerations",children:"Performance Considerations"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:"Dataset size impacts ingestion time"}),"\n",(0,s.jsx)(n.li,{children:"Container organization affects retrieval speed"}),"\n",(0,s.jsx)(n.li,{children:"Secret management overhead"}),"\n",(0,s.jsx)(n.li,{children:"Storage capacity requirements"}),"\n",(0,s.jsx)(n.li,{children:"Catalog operation latency"}),"\n"]})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(o,{...e})}):o(e)}},8453:(e,n,a)=>{a.d(n,{R:()=>r,x:()=>l});var t=a(6540);const s={},i=t.createContext(s);function r(e){const n=t.useContext(i);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:r(e.components),t.createElement(i.Provider,{value:n},e.children)}}}]);