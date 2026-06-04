---
sidebar_position: 2
---

# Core Components & Concepts

The Kamiwaza platform is composed of several key components and conceptual systems that work together to provide a comprehensive AI orchestration solution. This page describes the most important of these building blocks.

## Model & Data Handling

### Vector Databases
-   **What it is:** A specialized database for storing and retrieving high-dimensional vector data, such as embeddings generated from text or images. Kamiwaza integrates with industry-standard vector databases like **Milvus** and **Qdrant**.
-   **Why it matters:** Vector databases are the engine behind powerful similarity searches, which are essential for Retrieval-Augmented Generation (RAG), recommendation engines, and other advanced AI applications. Kamiwaza's abstraction layer lets you choose the right database for your needs without changing your application code.

### Embeddings Management
-   **What it is:** The process of generating, storing, and managing the vector embeddings for your data. Kamiwaza provides built-in services to automate the creation of embeddings using various open-source or custom models.
-   **Why it matters:** Consistent and efficient embedding management is fundamental to the performance of any vector search-based application. By handling this automatically, Kamiwaza reduces a major source of complexity in building RAG pipelines.

### Data Catalog
-   **What it is:** A centralized inventory of all your data assets. Kamiwaza integrates with **Acryl DataHub** to provide a single place to discover, understand, and govern your data.
-   **Why it matters:** As AI systems grow, so does the data they consume. A data catalog provides crucial lineage tracking ("where did this data come from?") and discoverability, which is vital for enterprise governance, security, and scalability.

## Orchestration & Serving

### Orchestration Engine
-   **What it is:** The "brain" of the platform that manages the flow of requests and coordinates tasks between different services. Kamiwaza uses frameworks like **Ray Serve** to handle this complex, distributed workload.
-   **Why it matters:** The orchestrator ensures that AI requests are processed efficiently, scaled according to demand, and routed to the correct models and services. This is the key to building resilient, production-grade AI applications.

### Model Serving
-   **What it is:** The process of taking a trained AI model and making it available for real-time inference via an API. Kamiwaza supports multiple high-performance serving engines like **vLLM**, **llama.cpp**, and **MLX**.
-   **Why it matters:** Different models have different hardware needs (CPU vs. GPU). Kamiwaza's multi-engine support ensures you can run a diverse range of models and optimize for both performance and cost.

### API Gateway
-   **What it is:** A single, unified entry point for all API requests to the platform. Kamiwaza uses **FastAPI** to create this gateway, which then routes requests to the appropriate internal microservice.
-   **Why it matters:** A gateway simplifies development by providing a consistent interface for all platform services. It's also the ideal place to enforce cross-cutting concerns like authentication, rate limiting, and logging.

## Security & Operations

### Identity & Access Management
-   **What it is:** The system that handles user authentication (who you are) and authorization (what you're allowed to do).
-   **Why it matters:** Robust security is non-negotiable in an enterprise setting. Kamiwaza's IAM services ensure that only authorized users and applications can access sensitive data and models.

### Caching
-   **What it is:** A high-speed storage layer (e.g., **Redis**, **Valkey**) that keeps frequently accessed data readily available, reducing the need to re-compute or re-fetch it from slower databases.
-   **Why it matters:** Caching dramatically improves the performance and responsiveness of AI applications, especially those with high request volumes, leading to a better user experience and lower operational costs. 