---
sidebar_position: 2
---

# Core Components & Concepts

The Kamiwaza platform is composed of several key components and conceptual systems that work together to provide model serving, governed data access, and managed application runtimes. This page describes the most important of those building blocks in the current platform.

## Model & Data Handling

### Vector Databases
-   **What it is:** A specialized database for storing and retrieving high-dimensional vector data, such as embeddings generated from text or images. Kamiwaza can integrate with vector backends such as **Milvus** and **Qdrant**.
-   **Why it matters:** Vector databases are the engine behind similarity search, Retrieval-Augmented Generation (RAG), and other semantic retrieval workflows. Kamiwaza's abstraction layer lets deployments adopt supported backends without changing user-facing workflows.

### Embeddings Management
-   **What it is:** The process of generating, storing, and managing vector embeddings for your data. Kamiwaza provides platform services that automate embedding generation using a dedicated, standalone OpenAI-compatible `llama.cpp` embedding service deployed via Helm (replacing legacy in-process fallbacks).
-   **Why it matters:** Consistent and efficient embedding management is fundamental to vector search quality and retrieval performance, and a dedicated service drops significant container bloat while improving throughput.

### Data Catalog
-   **What it is:** A centralized inventory of data assets, containers, and secret metadata. Kamiwaza integrates with **DataHub**-backed catalog workflows and uses URN-based references across the platform.
-   **Why it matters:** As AI systems grow, so does the data they consume. A data catalog improves discoverability, governance, and access control across models, retrieval flows, connectors, applications, and tools.

## Orchestration & Serving

### Orchestration Engine
-   **What it is:** The control and execution layer that manages model launches, runtime coordination, and distributed work. Kamiwaza uses **Ray** and related serving runtimes to handle that workload.
-   **Why it matters:** This layer keeps inference, background work, and runtime routing coordinated across cluster resources.

### Model Serving
-   **What it is:** The process of taking a model and making it available for real-time inference via a managed API route. Kamiwaza supports multiple serving engines such as **vLLM**, **llama.cpp**, and **MLX**, depending on environment and model type.
-   **Why it matters:** Different models have different hardware and runtime requirements. Multi-engine support helps the platform balance compatibility, performance, and cost.

### API Gateway
-   **What it is:** A single, unified entry point for platform APIs. Kamiwaza uses **FastAPI** plus ingress routing to expose those services through a consistent customer-facing interface.
-   **Why it matters:** A gateway simplifies development by providing one access surface for models, retrieval, apps, tools, logging, and administration. It is also the natural place to enforce authentication, rate limiting, and logging.

## Security & Operations

### Identity & Access Management
-   **What it is:** The system that handles user authentication (who you are) and authorization (what you're allowed to do).
-   **Why it matters:** Robust security is non-negotiable in an enterprise setting. Kamiwaza's IAM services ensure that only authorized users and applications can access sensitive data and models.

### Caching
-   **What it is:** A high-speed storage layer used for session state, temporary runtime coordination, and frequently accessed data.
-   **Why it matters:** Caching dramatically improves the performance and responsiveness of AI applications, especially those with high request volumes, leading to a better user experience and lower operational costs. 
