---
title: Search and Knowledge
sidebar_label: Search and Knowledge
---

# Search and Knowledge

Context Service exposes a unified search API for vector-backed retrieval and a separate ontology surface for graph-style memory and fact operations. Together, these APIs support common RAG and agent workflows without requiring clients to coordinate multiple backend systems directly.

> **Technical preview:** Advanced search enrichment and ontology-backed memory features are available for evaluation, but response details and tuning controls may continue to change.

## Unified Search

The primary search endpoint is:

- `POST /context/search`

This endpoint supports a fast base mode and several optional enrichment flags.

### Base mode

Without enrichment flags, unified search returns:

- the query
- ranked chunk results
- source references
- search timing and searched collections

Example request:

```json
{
  "query": "What changed in the quarterly plan?",
  "top_k": 5,
  "collection_name": "team_notes"
}
```

### Progressive enrichment

Unified search can add richer outputs as needed:

| Option | Effect |
| --- | --- |
| `format_context=true` | Adds an LLM-ready `context` string |
| `synthesize=true` | Adds synthesized text and structured citations |
| `max_iterations > 1` | Enables iterative refinement history |
| `enable_graph_search=true` | Includes ontology-backed search behavior when paired with ontology inputs |

Example enriched request:

```json
{
  "query": "Summarize the quarterly plan with citations",
  "collection_name": "team_notes",
  "top_k": 5,
  "format_context": true,
  "synthesize": true,
  "max_iterations": 2
}
```

Example response shape:

```json
{
  "query": "Summarize the quarterly plan with citations",
  "results": [
    {
      "id": "chunk-1",
      "content": "The plan expands the support rollout...",
      "score": 0.93,
      "metadata": {
        "source_file": "q4-plan.docx",
        "source_urn": "m365://drives/drive-123/items/item-456",
        "page_number": 2,
        "chunk_index": 0,
        "document_uri": "s3://bucket/..."
      }
    }
  ],
  "sources": [
    {
      "chunk_id": "chunk-1",
      "filename": "q4-plan.docx",
      "source_urn": "m365://drives/drive-123/items/item-456",
      "page_number": 2,
      "score": 0.93,
      "snippet": "The plan expands the support rollout..."
    }
  ],
  "context": "Source 1: The plan expands the support rollout...",
  "synthesis": "The quarterly plan expands support coverage [1].",
  "citations": [
    {
      "citation_id": 1,
      "source_file": "q4-plan.docx",
      "chunk_id": "chunk-1",
      "relevance_score": 0.93,
      "excerpt": "The plan expands the support rollout..."
    }
  ]
}
```

## Legacy Compatibility Search Routes

The current implementation still exposes legacy compatibility routes under `/context/search/*`:

| Endpoint | Use |
| --- | --- |
| `POST /context/search/simple` | Simple semantic search |
| `POST /context/search/retrieve` | Retrieval-oriented context response |
| `POST /context/search/agentic` | Agentic search response |

Prefer `POST /context/search` for new integrations. Use the compatibility routes only when you need older response shapes.

## Search Inputs

The unified request can target:

- one collection with `collection_name`
- multiple collections with `collection_names`
- a specific VectorDB instance with `vectordb_id`
- filtered search with safe metadata filters

For agentic search behavior, the current implementation also supports:

- `vectordb_ids`
- `ontology_id`
- `group_ids`

## Ontology Knowledge Operations

Ontology endpoints operate on a specific ontology instance and are useful for graph-backed knowledge, memory, and episode retrieval.

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /context/ontologies/{ontology_id}/knowledge` | Add knowledge from messages |
| `POST /context/ontologies/{ontology_id}/entity` | Add a specific entity |
| `POST /context/ontologies/{ontology_id}/search` | Search graph-backed facts |
| `POST /context/ontologies/{ontology_id}/memory` | Return memory-style context for a query |
| `GET /context/ontologies/{ontology_id}/episodes/{group_id}` | List recent episodes |
| `DELETE /context/ontologies/{ontology_id}/groups/{group_id}` | Delete one knowledge group |
| `GET /context/ontologies/{ontology_id}/health` | Check ontology backend health |

### Add knowledge from messages

Example request:

```json
{
  "group_id": "conversation-42",
  "messages": [
    {
      "content": "Alice approved the Q4 rollout plan.",
      "role": "user",
      "name": "operator"
    }
  ]
}
```

### Search knowledge

Example request:

```json
{
  "query": "Who approved the Q4 rollout plan?",
  "group_ids": ["conversation-42"],
  "max_results": 5
}
```

### Get memory

Example request:

```json
{
  "group_id": "conversation-42",
  "query": "What do we know about the rollout?",
  "max_facts": 5
}
```

## Choosing The Right Path

Use unified search when:

- your content is already indexed into collections
- you want ranked chunk retrieval
- you need optional formatted context or synthesized answers

Use ontology operations when:

- you want graph-style memory from messages or entities
- you need fact-oriented retrieval rather than chunk similarity
- you want to organize knowledge around groups or conversations

## Operational Notes

- Read operations require workroom authorization
- Some ontology calls may return `503` while a managed backend is not yet ready
- Search results are scoped to the authorized workroom and targeted resources
- Compatibility routes remain available, but new integrations should prefer the unified endpoint

## Related Docs

- [Context Service Overview](./overview)
- [Managed Backends and Lifecycle](./managed-backends-and-lifecycle)
- [Operations and API Reference](./operations-and-api-reference)
