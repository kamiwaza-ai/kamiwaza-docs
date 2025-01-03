"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[5587],{2482:(e,r,n)=>{n.r(r),n.d(r,{assets:()=>o,contentTitle:()=>a,default:()=>v,frontMatter:()=>s,metadata:()=>t,toc:()=>d});const t=JSON.parse('{"id":"sdk/services/vectordb/README","title":"VectorDB Service","description":"Overview","source":"@site/versioned_docs/version-0.3.2/sdk/services/vectordb/README.md","sourceDirName":"sdk/services/vectordb","slug":"/sdk/services/vectordb/","permalink":"/kamiwaza-docs/0.3.2/sdk/services/vectordb/","draft":false,"unlisted":false,"tags":[],"version":"0.3.2","frontMatter":{}}');var i=n(4848),c=n(8453);const s={},a="VectorDB Service",o={},d=[{value:"Overview",id:"overview",level:2},{value:"Key Features",id:"key-features",level:2},{value:"Vector Database Management",id:"vector-database-management",level:2},{value:"Available Methods",id:"available-methods",level:3},{value:"Vector Operations",id:"vector-operations",level:2},{value:"Available Methods",id:"available-methods-1",level:3},{value:"Error Handling",id:"error-handling",level:2},{value:"Best Practices",id:"best-practices",level:2}];function l(e){const r={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,c.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(r.header,{children:(0,i.jsx)(r.h1,{id:"vectordb-service",children:"VectorDB Service"})}),"\n",(0,i.jsx)(r.h2,{id:"overview",children:"Overview"}),"\n",(0,i.jsxs)(r.p,{children:["The VectorDB Service (",(0,i.jsx)(r.code,{children:"VectorDBService"}),") provides comprehensive vector database management functionality for the Kamiwaza AI Platform. Located in ",(0,i.jsx)(r.code,{children:"kamiwaza_client/services/vectordb.py"}),", this service handles vector storage, retrieval, and similarity search operations."]}),"\n",(0,i.jsx)(r.h2,{id:"key-features",children:"Key Features"}),"\n",(0,i.jsxs)(r.ul,{children:["\n",(0,i.jsx)(r.li,{children:"Vector Database Management"}),"\n",(0,i.jsx)(r.li,{children:"Vector Storage and Retrieval"}),"\n",(0,i.jsx)(r.li,{children:"Similarity Search"}),"\n",(0,i.jsx)(r.li,{children:"Simplified Vector Operations"}),"\n",(0,i.jsx)(r.li,{children:"Database Lifecycle Management"}),"\n"]}),"\n",(0,i.jsx)(r.h2,{id:"vector-database-management",children:"Vector Database Management"}),"\n",(0,i.jsx)(r.h3,{id:"available-methods",children:"Available Methods"}),"\n",(0,i.jsxs)(r.ul,{children:["\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"create_vectordb(config: CreateVectorDB) -> VectorDB"}),": Create new vector database"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"get_vectordbs() -> List[VectorDB]"}),": List all vector databases"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"get_vectordb(vectordb_id: UUID) -> VectorDB"}),": Get database details"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"remove_vectordb(vectordb_id: UUID)"}),": Remove vector database"]}),"\n"]}),"\n",(0,i.jsx)(r.pre,{children:(0,i.jsx)(r.code,{className:"language-python",children:'# Create vector database\nvectordb = client.vectordb.create_vectordb(CreateVectorDB(\n    name="my-vectors",\n    dimension=768,\n    metric="cosine"\n))\n\n# List databases\ndatabases = client.vectordb.get_vectordbs()\n\n# Get specific database\ndb = client.vectordb.get_vectordb(vectordb_id)\n\n# Remove database\nclient.vectordb.remove_vectordb(vectordb_id)\n'})}),"\n",(0,i.jsx)(r.h2,{id:"vector-operations",children:"Vector Operations"}),"\n",(0,i.jsx)(r.h3,{id:"available-methods-1",children:"Available Methods"}),"\n",(0,i.jsxs)(r.ul,{children:["\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"insert_vectors(vectordb_id: UUID, vectors: List[Vector]) -> InsertResponse"}),": Insert vectors"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"search_vectors(vectordb_id: UUID, query: List[float], k: int = 10) -> List[SearchResult]"}),": Search vectors"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"insert(vectordb_id: UUID, data: Dict[str, Any]) -> InsertResponse"}),": Simplified vector insertion"]}),"\n",(0,i.jsxs)(r.li,{children:[(0,i.jsx)(r.code,{children:"search(vectordb_id: UUID, query: str, k: int = 10) -> List[SearchResult]"}),": Simplified vector search"]}),"\n"]}),"\n",(0,i.jsx)(r.pre,{children:(0,i.jsx)(r.code,{className:"language-python",children:'# Insert vectors\nresponse = client.vectordb.insert_vectors(\n    vectordb_id=db_id,\n    vectors=[\n        Vector(id="vec1", vector=[0.1, 0.2, 0.3], metadata={"text": "example"})\n    ]\n)\n\n# Search vectors\nresults = client.vectordb.search_vectors(\n    vectordb_id=db_id,\n    query=[0.1, 0.2, 0.3],\n    k=5\n)\n\n# Simplified operations\n# Insert with automatic vector generation\nresponse = client.vectordb.insert(\n    vectordb_id=db_id,\n    data={"text": "example text", "metadata": {"source": "doc1"}}\n)\n\n# Search with automatic query vector generation\nresults = client.vectordb.search(\n    vectordb_id=db_id,\n    query="example query",\n    k=5\n)\n'})}),"\n",(0,i.jsx)(r.h2,{id:"error-handling",children:"Error Handling"}),"\n",(0,i.jsx)(r.p,{children:"The service includes built-in error handling for common scenarios:"}),"\n",(0,i.jsx)(r.pre,{children:(0,i.jsx)(r.code,{className:"language-python",children:'try:\n    vectordb = client.vectordb.create_vectordb(config)\nexcept DimensionError as e:\n    print(f"Invalid dimension: {e}")\nexcept MetricError as e:\n    print(f"Invalid metric: {e}")\nexcept APIError as e:\n    print(f"Operation failed: {e}")\n'})}),"\n",(0,i.jsx)(r.h2,{id:"best-practices",children:"Best Practices"}),"\n",(0,i.jsxs)(r.ol,{children:["\n",(0,i.jsx)(r.li,{children:"Choose appropriate vector dimensions based on your embedding model"}),"\n",(0,i.jsx)(r.li,{children:"Select the right similarity metric for your use case"}),"\n",(0,i.jsx)(r.li,{children:"Use batch operations for better performance"}),"\n",(0,i.jsx)(r.li,{children:"Include relevant metadata with vectors"}),"\n",(0,i.jsx)(r.li,{children:"Clean up unused databases"}),"\n",(0,i.jsx)(r.li,{children:"Use simplified operations when working with text data"}),"\n",(0,i.jsx)(r.li,{children:"Monitor database size and performance"}),"\n",(0,i.jsx)(r.li,{children:"Implement proper error handling for vector operations"}),"\n"]})]})}function v(e={}){const{wrapper:r}={...(0,c.R)(),...e.components};return r?(0,i.jsx)(r,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}},8453:(e,r,n)=>{n.d(r,{R:()=>s,x:()=>a});var t=n(6540);const i={},c=t.createContext(i);function s(e){const r=t.useContext(c);return t.useMemo((function(){return"function"==typeof e?e(r):{...r,...e}}),[r,e])}function a(e){let r;return r=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:s(e.components),t.createElement(c.Provider,{value:r},e.children)}}}]);