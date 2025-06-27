# Architecture Diagram

This diagram shows the high-level architecture of the Kamiwaza platform:

```mermaid
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
        subgraph H[" "]
            LLMO[LLMOps]
            BAS[Backend API Services]
        end
        subgraph HH[" "]
            C[Cache]
            GS[Guardrails Service]
        end 
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

    %% Subgraph Connections
    EL --> CO
    CO --> S
    S --> K
    SD --> CO

    %% Individual Connections
    YOD --> DL
    DL --> EM
    EM --> EDB
    EDB --> IAC
    IAC --> BGPU
    BGPU --> MB
    BGPU <--[Decision Making]--> OR

    %% Styles
    style OR fill:#f9f,stroke:#333,stroke-width:4px
    style BGPU fill:#149910,stroke:#373,stroke-width:4px
    style EA fill:#ffa,stroke:#333,stroke-width:2px
    style BAS fill:#e6e6fa,stroke:#333,stroke-width:2px
    style H stroke-width:0px,stroke:#000
    style HH stroke-width:0px,stroke:#000

    %% Layout hints
    EL ~~~ CO
    SD ~~~ CO
    CO ~~~ K