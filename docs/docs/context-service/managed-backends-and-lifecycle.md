---
title: Managed Backends and Lifecycle
sidebar_label: Managed Backends and Lifecycle
---

# Managed Backends and Lifecycle

Context Service can manage workroom-scoped backend instances for vector search, ontology-backed knowledge operations, and OmniParse processing. It also enforces archive-aware behavior for write paths so managed resources follow workroom lifecycle state.

> **Technical preview:** Managed backend APIs are intended for advanced platform usage. Availability, readiness behavior, and configuration details may change between releases.

## Managed Resource Types

The current implementation exposes these managed resource families:

| Resource | Purpose |
| --- | --- |
| VectorDB instances | Back indexed collections and direct vector operations |
| Ontology instances | Back graph-style knowledge and memory operations |
| OmniParse instances | Back advanced document parsing workflows |
| Collections | Organize indexed chunks within a VectorDB instance |

## VectorDB Instances

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /context/vectordbs` | List visible VectorDB instances |
| `GET /context/vectordbs/{vectordb_id}` | Inspect one instance |
| `POST /context/vectordbs` | Create an instance |
| `PUT /context/vectordbs/{vectordb_id}` | Update configuration |
| `POST /context/vectordbs/{vectordb_id}/scale` | Change replica count |
| `DELETE /context/vectordbs/{vectordb_id}` | Delete an instance |
| `POST /context/vectordbs/{vectordb_id}/insert` | Insert vectors into one instance |
| `POST /context/vectordbs/insert` | Insert vectors using body-supplied `vectordb_id` |
| `POST /context/vectordbs/{vectordb_id}/query` | Query one instance |
| `POST /context/vectordbs/query` | Query using body-supplied `vectordb_id` |

Current engines:

- `milvus`
- `vespa`

Example create request:

```json
{
  "name": "team-search",
  "engine": "milvus",
  "replicas": 1
}
```

## Collections

Collections are the searchable containers used by indexed chunks.

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /context/collections/` | List collections in the workroom |
| `POST /context/collections/` | Create a collection |
| `GET /context/collections/{collection_name}` | Inspect a collection |
| `DELETE /context/collections/{collection_name}` | Delete a collection |

Example create request:

```json
{
  "name": "team_notes",
  "dimension": 384,
  "description": "Searchable notes for the team"
}
```

> **Note:** Collection display names are user-facing, but the stored collection name may include an internal workroom-scoped prefix.

## Ontology Instances

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /context/ontologies` | List ontology instances |
| `GET /context/ontologies/{ontology_id}` | Inspect one instance |
| `POST /context/ontologies` | Create an instance |
| `DELETE /context/ontologies/{ontology_id}` | Delete an instance |

Current backend options include `graphiti`, with additional enum values reserved in the schema for future expansion.

Example create request:

```json
{
  "name": "team-memory",
  "backend": "graphiti"
}
```

## OmniParse Instances

Context Service also exposes managed OmniParse lifecycle routes:

| Endpoint | Purpose |
| --- | --- |
| `GET /context/omniparses` | List OmniParse instances |
| `GET /context/omniparses/{omniparse_id}` | Inspect one instance |
| `POST /context/omniparses` | Create an instance |
| `PUT /context/omniparses/{omniparse_id}` | Update an instance |
| `DELETE /context/omniparses/{omniparse_id}` | Delete an instance |

These routes are especially relevant when you want Context Service to manage the parsing backend used by ingest pipelines rather than treating OmniParse as an external dependency.

## Readiness And Error Handling

Managed backends may report lifecycle state such as:

- `pending`
- `running`
- `stopped`
- `failed`

Some operations can return `503 Service Unavailable` when the targeted backend exists but is not yet ready. In those cases, the response may include structured details and a `Retry-After` header.

Use the instance detail routes to confirm:

- lifecycle status
- endpoint availability
- workroom scope
- replica settings where applicable

## Archive-Aware Behavior

Context Service blocks write operations when the workroom is archived.

This commonly affects:

- creating or updating managed instances
- creating or deleting collections
- pipeline creation and uploads
- vector insertion
- ontology write operations

Archived-write failures return `409 Conflict`.

Read-oriented operations such as listing resources or searching may still remain available, depending on the specific route and backend state.

## Internal Lifecycle Hooks

Context Service also implements internal lifecycle endpoints for workroom-driven archive, restore, export, resource counting, and purge flows. These are service-to-service routes and are not part of the public OpenAPI surface.

Operationally, that means:

- public docs should treat archive state as an important runtime constraint
- workroom lifecycle orchestration can affect Context Service availability and mutability
- destructive cleanup and export workflows are owned by internal platform flows rather than normal end-user API usage

## Destructive Actions

Be careful with these operations:

- deleting VectorDB instances
- deleting ontology instances
- deleting OmniParse instances
- deleting collections
- deleting ontology groups

These calls remove or sever access to stored data and should be limited to trusted operators or controlled application flows.

## Related Docs

- [Context Service Overview](./overview)
- [Ingestion and Storage](./ingestion-and-storage)
- [Operations and API Reference](./operations-and-api-reference)
