graph TD
    subgraph EL["Enterprise Layer"]
    EA[Enterprise Application Tier]
    end
    
    subgraph DSP["Data Sources and Processing"]
    YOD[Your Data]
    DL[Data Lakehouse]
    end
    
    subgraph CO["Core Orchestration"]
    OR[Orchestration Routing]
    end
    
    subgraph S["Services"]
        LLMO[LLMOps]
        BAS[Backend API Services]
        C[Cache]
        GS[Guardrails Service]
    end
    
    subgraph K["KamiwazaAI"]
    EM[Embeddings Model]
    BGPU[Backend Inferencing and API]
    EDB[Vector DB]
    IAC[Integration and Catalog]
    end
    
    subgraph MB["Model Backends"]
    BIB[Base Inferencing Backend]
    FCB[Function Calling Backend]
    CB[Coding Backend]
    end
    
    subgraph SD["Security and DevOps"]
    HIS[AAD-DS]
    DSO[DevSecOps]
    end
    
    EL --> CO
    CO --> S
    S --> K
    SD --> CO
    YOD --> DL
    DL --> EM
    EM --> EDB
    EDB --> IAC
    IAC --> BGPU
    BGPU --> MB
    BGPU --> OR
    OR --> BGPU
    
    style OR fill:#f9f,stroke:#333,stroke-width:4px
    style BGPU fill:#149910,stroke:#373,stroke-width:4px
    style EA fill:#ffa,stroke:#333,stroke-width:2px
    style BAS fill:#e6e6fa,stroke:#333,stroke-width:2px
