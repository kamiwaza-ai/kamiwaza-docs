
# Chart


```mermaid
flowchart BT
    %% Color definitions
    classDef coreColor fill:#2C3E50,stroke:#34495E,color:#ECF0F1
    classDef middlewareColor fill:#2980B9,stroke:#2C3E50,color:#ECF0F1
    classDef toolsColor fill:#16A085,stroke:#1ABC9C,color:#ECF0F1
    classDef appsColor fill:#8E44AD,stroke:#9B59B6,color:#ECF0F1
    classDef platformColor fill:#7F8C8D,stroke:#95A5A6,color:#ECF0F1
    classDef invisibleClass fill:none,stroke:none

    %% Platform Services (Below Core)
    subgraph Platform[Platform Services]
        direction LR
        Auth[Auth Enforcement] -.- SDN[SDN] -.- LoadBalancing[Load Balancing / Ingress] -.- Autoscaling[Autoscaling]
        linkStyle 0,1,2 stroke:none
    end

    %% Core Layer
    subgraph Core[Kamiwaza Core]
        direction LR
        DDE[DDEv2] -.- Inference[Inference Mesh]
        linkStyle 3 stroke:none
    end

    %% Middleware Layer
    subgraph Middleware[Middleware]
        direction LR
        VectorDB[VectorDBs & Embeddings] -.- InferenceHelpers[Inference Helpers] -.- DataServices[Data Ingestion/Retrieval] -.- IAM[IAM/AAA]
        linkStyle 4,5,6 stroke:none
    end

    %% Tools Layer (Top Left)
    subgraph Tools[Tools]
        direction TB
        EmailTool[Email Access Tool]
        OntologyTool[Ontology Ingester]
        MoreTools[Many More Tools...]
    end

    %% Applications Layer (Top Right)
    subgraph Apps[Applications]
        direction TB
        SalesPlanner[Sales Planner]
        Kaizen[Kaizen]
        HPP[HPP]
        MoreApps[Many More Apps...]
    end

    %% Invisible nodes for positioning
    ToolsMiddle[ ]:::invisibleClass
    AppsMiddle[ ]:::invisibleClass
    
    %% Relationships - without arrows
    Platform --- Core
    Core --> Middleware
    Middleware --- ToolsMiddle
    Middleware --- AppsMiddle
    ToolsMiddle --- Tools
    AppsMiddle --- Apps
    
    %% Make the Platform to Core link invisible
    linkStyle 7 stroke:none

    %% Apply classes
    class Platform platformColor
    class Core coreColor
    class Middleware middlewareColor
    class Tools toolsColor
    class Apps appsColor
```