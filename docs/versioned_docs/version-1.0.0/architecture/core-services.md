---
id: core-services
title: Core Services
sidebar_position: 3
---

# Core Services

Kamiwaza's backend is built as a collection of specialized services, each handling a specific aspect of platform behavior. Together they support model serving, governed data access, application deployment, workrooms, and security controls.

## Service Architecture

The backend follows a consistent pattern where each service is self-contained and follows the structure:

```text
service/
├── api.py      # FastAPI router
├── models/     # SQLAlchemy ORM
├── schemas/    # Pydantic DTOs
└── services.py # Business logic
```

This modular approach helps with:
- **Separation of concerns** - Each service has a clear, focused responsibility
- **Scalability** - Services can be scaled independently based on demand
- **Maintainability** - Changes to one service don't affect others
- **Testability** - Each service can be tested in isolation

## Core Services Overview

### 🤖 Models Service
Manages the lifecycle of AI models including registration, download, deployment, and serving. It coordinates runtime selection and exposes model APIs through the platform routing layer.

### 📄 Catalog Service
Provides metadata-backed management for datasets, containers, and secrets. It enables shared references across models, connectors, apps, tools, and retrieval workflows.

### 📥 Ingestion and DDE Services
Handle connector configuration, scheduled ingestion, and document indexing flows. These services are the bridge between external data sources and retrieval-ready content inside the platform.

### 🔎 Retrieval Service
Provides job-based access to dataset content for downstream search, analysis, and RAG workflows. It supports inline, streaming, and gRPC-style retrieval patterns where available.

### 🧠 Embedding and Vector Services
Handle embedding generation and vector-backed retrieval infrastructure used by semantic search and retrieval workflows.

### 🔐 Authentication Service
Manages authenticated sessions, identity-provider integration, and access control enforcement for platform APIs.

### 🧱 Workroom Services
Support collaborative workspaces, presence information, shared context, and workroom-specific access behavior.

### 📈 Logger and Audit Services
Provide deployment logs, operational events, and audit evidence used for troubleshooting and security review.

### 🌱 Garden Services
Power App Garden and Tool Shed deployment workflows, including template resolution, managed runtime configuration, and routed access to launched workloads.

## Service Communication

All services communicate through:
- **FastAPI routers** for HTTP API endpoints
- **Ray and serving runtimes** for distributed model execution
- **Shared platform stores** such as Postgres, SQLite in lite mode, and etcd
- **Ingress and routing layers** for user-facing access to models, apps, and tools

## Integration Patterns

Services are designed to work together seamlessly:
- **Models + Gardens** - Expose deployed models to applications and tools through managed template variables
- **Ingestion + Catalog + Retrieval** - Bring external data into the platform and make it queryable
- **Catalog + Secrets + External Endpoints** - Reuse governed secret references across integrations
- **Auth + ReBAC + Service APIs** - Enforce the correct user and tenant boundaries across platform workflows
- **Logger + All Services** - Monitor and troubleshoot platform interactions

## Next Steps

To learn more about working with these services:
- Explore the [Models](../models/overview.md) and [Distributed Data Engine](../data-engine) documentation
- Build a complete [RAG pipeline](../use-cases/building-a-rag-pipeline) using multiple services
- Review the [Platform Overview](overview) for architectural context
- Check out [Use Cases](../use-cases/index.md) for practical implementation examples 
