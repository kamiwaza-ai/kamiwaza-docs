---
title: Graphiti Service Guide
description: Deploy and operate the Graphiti knowledge graph service in Kamiwaza.
---

# Graphiti Service Guide

Graphiti is Kamiwaza's temporal knowledge graph service for agent memory, contextual retrieval, and
fact-oriented search. It accepts messages, extracts entities and relationships, and returns graph
context for downstream agent or RAG flows.

## What Changed in 0.12.1

The 0.12.1 line changes Graphiti in ways operators need to know about:

- The backend moved from **FalkorDB** to **Neo4j**.
- The service now runs on pinned prebuilt Graphiti and Neo4j images.
- LLM and embedding endpoint fallback behavior was tightened so the extension can align cleanly with
  platform-injected model endpoints.

If you are upgrading an existing Graphiti deployment, read the migration section before reusing old
data volumes.

## Before You Deploy

Graphiti is installed as an extension and requires:

- a deploy-time `NEO4J_PASSWORD`
- persistent storage for Neo4j data
- a reachable LLM or OpenAI-compatible endpoint for message processing

Without an LLM endpoint, Graphiti can still accept requests, but message processing, extraction,
and memory/search results will be incomplete or fail.

## Runtime Layout

| Service | Port | Purpose |
|--------|--------|--------|
| `graphiti` | `8000` | FastAPI API for ingest, search, memory, and episode queries |
| `neo4j` | `7687` | Neo4j Bolt endpoint used by the Graphiti API |

Common Graphiti API paths include:

- `GET /healthcheck`
- `POST /messages`
- `POST /search`
- `POST /get-memory`
- `GET /episodes/{group_id}`
- `POST /clear`

## Key Configuration

| Variable | Purpose |
|--------|--------|
| `NEO4J_URI` | Neo4j Bolt URI, usually `bolt://neo4j:7687` |
| `NEO4J_USER` | Neo4j username, usually `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password seeded at first boot |
| `OPENAI_BASE_URL` | Preferred OpenAI-compatible LLM endpoint override |
| `LLM_BASE_URL` | Graphiti-specific LLM override when you need one |
| `KAMIWAZA_ENDPOINT` | Fallback model endpoint supplied by Kamiwaza |
| `EMBEDDING_BASE_URL` | Optional embedding endpoint override |
| `MODEL_NAME` / `EMBEDDING_MODEL_NAME` | Explicit model selection when auto-selection is not enough |

Operational notes:

- In local Compose, Graphiti can fall back between `OPENAI_BASE_URL`, `LLM_BASE_URL`, and
  `KAMIWAZA_ENDPOINT`.
- In platform deployments, `OPENAI_BASE_URL` is treated as the primary injection point so the
  platform-managed model endpoint wins by default.
- Neo4j password seeding happens when the data volume is first initialized. Rotating
  `NEO4J_PASSWORD` later does not rewrite an existing database automatically.

## Migration from FalkorDB

0.12.1 replaces FalkorDB with Neo4j. Existing FalkorDB data is not compatible with the new backend.

Plan upgrades accordingly:

1. Treat the migration as a storage break.
2. Start Graphiti with a fresh Neo4j data volume.
3. Rebuild the graph from source documents or other canonical inputs.
4. Remove the old FalkorDB volume only after you confirm the new Neo4j-backed service is healthy.

The Graphiti service also uses a different volume naming convention for Neo4j-backed storage to
avoid accidental cross-use of FalkorDB data.

## Rollback

If you must roll back to the older FalkorDB-backed release:

1. Revert the extension deployment to the last FalkorDB-compatible version.
2. Restore the previous FalkorDB volume or snapshot.
3. Remove or archive the Neo4j volume before retrying the older release.
4. Rebuild graph state from source if no compatible FalkorDB data survives.

## Troubleshooting

### Search or memory calls fail

Check whether Graphiti can reach a valid LLM endpoint. Missing or invalid model connectivity is the
most common reason message ingestion succeeds while retrieval or search fails later.

### Neo4j authentication changes do not take effect

Neo4j only seeds credentials on first initialization. If you change `NEO4J_PASSWORD` after the
database already exists, recreate the volume or rotate the password in-place inside Neo4j.

### Local testing with custom Graphiti images

Use a `docker-compose.override.yml` file locally to point the `graphiti` service at a custom image
without changing the checked-in deployment manifest.
