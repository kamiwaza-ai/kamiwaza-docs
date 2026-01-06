---
id: core-services
title: Core Services
sidebar_position: 3
---

# Core Services

Kamiwaza's backend is built as a collection of specialized microservices, each handling a specific aspect of the AI platform's functionality. These services work together to provide a comprehensive AI orchestration platform that manages the entire lifecycle of AI models and applications.

## Service Architecture

The backend follows a consistent pattern where each service is self-contained and follows the structure:

```text
service/
├── api.py      # FastAPI router
├── models/     # SQLAlchemy ORM
├── schemas/    # Pydantic DTOs
└── services.py # Business logic
```

This modular approach ensures:
- **Separation of concerns** - Each service has a clear, focused responsibility
- **Scalability** - Services can be scaled independently based on demand
- **Maintainability** - Changes to one service don't affect others
- **Testability** - Each service can be tested in isolation

## Core Services Overview

### 🤖 Models Service
Manages the complete lifecycle of AI models including deployment, versioning, and serving. This service handles everything from model downloads to runtime management, supporting multiple serving engines like llama.cpp, vLLM, and Transformers.

### 🔍 Vector Database Service
Provides an abstraction layer over vector databases like Milvus and Qdrant, enabling efficient storage and retrieval of high-dimensional embeddings. Supports hybrid search, metadata filtering, and performance optimization.

### 📄 Retrieval Service
Powers RAG (Retrieval-Augmented Generation) pipelines and document search capabilities. Combines vector similarity with keyword search, provides reranking, and supports advanced query processing for contextual AI applications.

### 🧠 Embedding Service
Handles text embedding generation and storage, converting text into numerical representations for vector similarity searches. Supports multiple embedding models, batch processing, and intelligent caching strategies.

### 🔐 Authentication Service
Manages JWT-based authentication and integrates with various identity providers to secure platform access. Supports OAuth, SAML, multi-factor authentication, and role-based access control.

### 📊 Catalog Service
Integrates with Acryl DataHub to provide data cataloging and metadata management capabilities. Enables data discovery, lineage tracking, and governance across the AI platform.

### 📈 Activity Service
Provides comprehensive audit logging and metrics collection for monitoring platform usage and performance. Tracks user actions, system events, and provides real-time dashboards and alerting.

### 💬 Prompts Service
Manages a centralized library of prompt templates for consistent AI interactions across applications. Supports versioning, A/B testing, and performance tracking for prompt optimization workflows.

## Service Communication

All services communicate through:
- **FastAPI routers** for HTTP API endpoints
- **Ray Serve** for distributed computing and scaling
- **Shared databases** (CockroachDB, etcd) for state management
- **Message queues** for asynchronous processing

## Integration Patterns

Services are designed to work together seamlessly:
- **Models + Embedding** - Deploy embedding models for text vectorization
- **Embedding + VectorDB** - Store and retrieve high-dimensional embeddings
- **VectorDB + Retrieval** - Power semantic search and RAG pipelines
- **Retrieval + Prompts** - Combine context retrieval with optimized prompts
- **Activity + All Services** - Monitor and log all platform interactions

## Next Steps

To learn more about working with these services:
- Explore the [Models](../models/overview.md) and [Distributed Data Engine](../data-engine) documentation
- Build a complete [RAG pipeline](../use-cases/building-a-rag-pipeline) using multiple services
- Review the [Platform Overview](overview) for architectural context
- Check out [Use Cases](../use-cases/index.md) for practical implementation examples 