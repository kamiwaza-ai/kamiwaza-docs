---
title: Operations and API Reference
sidebar_label: Operations and API Reference
---

# Operations and API Reference

This page provides a compact reference for the current public Context Service REST surface. Use the workflow pages for explanations and examples, and use this page when you need the route inventory in one place.

> **Technical preview:** Route organization and response details may continue to change. Validate production integrations against the currently installed version of the platform.

## Base Path And Scope

Public routes are exposed under `/context` and are workroom-aware. Most operations rely on the authorized `X-Workroom-Id` context and the caller's normal platform authentication.

## Health

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/health` | Service health and advertised feature list |

## VectorDB

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/vectordbs` | List VectorDB instances |
| `GET` | `/context/vectordbs/{vectordb_id}` | Get one VectorDB instance |
| `POST` | `/context/vectordbs` | Create a VectorDB instance |
| `PUT` | `/context/vectordbs/{vectordb_id}` | Update a VectorDB instance |
| `POST` | `/context/vectordbs/{vectordb_id}/scale` | Scale a VectorDB instance |
| `DELETE` | `/context/vectordbs/{vectordb_id}` | Delete a VectorDB instance |
| `POST` | `/context/vectordbs/{vectordb_id}/insert` | Insert vectors into one instance |
| `POST` | `/context/vectordbs/insert` | Insert vectors using body-supplied instance ID |
| `POST` | `/context/vectordbs/{vectordb_id}/query` | Query vectors in one instance |
| `POST` | `/context/vectordbs/query` | Query vectors using body-supplied instance ID |

## Ontology

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/ontologies` | List ontology instances |
| `GET` | `/context/ontologies/{ontology_id}` | Get one ontology instance |
| `POST` | `/context/ontologies` | Create an ontology instance |
| `DELETE` | `/context/ontologies/{ontology_id}` | Delete an ontology instance |
| `POST` | `/context/ontologies/{ontology_id}/knowledge` | Add knowledge from messages |
| `POST` | `/context/ontologies/{ontology_id}/entity` | Add one entity |
| `POST` | `/context/ontologies/{ontology_id}/search` | Search graph-backed knowledge |
| `POST` | `/context/ontologies/{ontology_id}/memory` | Get memory-oriented context |
| `GET` | `/context/ontologies/{ontology_id}/episodes/{group_id}` | List recent episodes |
| `DELETE` | `/context/ontologies/{ontology_id}/groups/{group_id}` | Delete a knowledge group |
| `GET` | `/context/ontologies/{ontology_id}/health` | Check ontology health |

## OmniParse

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/omniparses` | List OmniParse instances |
| `GET` | `/context/omniparses/{omniparse_id}` | Get one OmniParse instance |
| `POST` | `/context/omniparses` | Create an OmniParse instance |
| `PUT` | `/context/omniparses/{omniparse_id}` | Update an OmniParse instance |
| `DELETE` | `/context/omniparses/{omniparse_id}` | Delete an OmniParse instance |

## Collections

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/collections/` | List collections |
| `POST` | `/context/collections/` | Create a collection |
| `GET` | `/context/collections/{collection_name}` | Get collection details |
| `DELETE` | `/context/collections/{collection_name}` | Delete a collection |

## Pipelines And Uploads

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/context/pipelines/` | Create and start a pipeline job |
| `GET` | `/context/pipelines/` | List pipeline jobs |
| `GET` | `/context/pipelines/supported-types` | List supported file extensions |
| `GET` | `/context/pipelines/{job_id}` | Get pipeline job status |
| `DELETE` | `/context/pipelines/{job_id}` | Cancel or delete a pipeline job |
| `POST` | `/context/upload/` | Upload one file directly into the pipeline |

## Raw Storage And Documents

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/context/storage/raw` | List raw stored files |
| `GET` | `/context/storage/raw/{file_id}` | Get raw stored file metadata |
| `GET` | `/context/documents/{source_urn}` | Get a temporary download URL for a stored source document |

## Search

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/context/search` | Unified search with optional enrichment |
| `POST` | `/context/search/simple` | Legacy simple search route |
| `POST` | `/context/search/retrieve` | Legacy retrieval-focused route |
| `POST` | `/context/search/agentic` | Legacy agentic search route |

## Important Notes

- New integrations should prefer `POST /context/search`
- Write routes can return `409 Conflict` when the workroom is archived
- Managed-resource operations can return `503 Service Unavailable` while a backend is not ready
- Raw-document download routes depend on configured object storage
- Internal lifecycle endpoints exist, but they are service-to-service routes and are not listed here

## Related Docs

- [Context Service Overview](./overview)
- [Ingestion and Storage](./ingestion-and-storage)
- [Search and Knowledge](./search-and-knowledge)
- [Managed Backends and Lifecycle](./managed-backends-and-lifecycle)
