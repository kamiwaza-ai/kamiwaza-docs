# Distributed Data Engine

Kamiwaza’s Distributed Data Engine (DDE) aligns unstructured and tabular content under a unified ingestion framework. Connector-driven pipelines push cleaned documents into the platform’s vector stores while keeping credentials and scheduling consistent with the rest of the control plane. Subsequent point releases continue to build on the same structure, so the guidance below applies to the current GA build unless otherwise noted.

> DDE stands for **Distributed Data Engine**.

## Platform assumptions

- The current Kamiwaza platform is deployed and available over HTTPS.
- You have administrative access to configure connectors and manage secrets.
- Target storage (Kamiwaza vector database or an external store) is reachable from the ingestion workers.
- The platform uses a dedicated, standalone OpenAI-compatible `llama.cpp` embedding service for vector generation, deployed via Helm.

## Connector workflow

1. **Create a connector** – Choose the source system (S3, SharePoint, file upload, and so on) and supply the required fields through the UI or supported API.
2. **Secure credentials** – Prefer referencing an existing Kamiwaza secret. Secrets are encrypted at rest and can be rotated without recreating the connector.
3. **Schedule ingestion** – Select one-time or recurring runs. DDE batches updates to minimize load on the source system.
4. **Monitor jobs** – Each run emits status events and logging metadata that flow into the standard Kamiwaza logging and observability paths.

## Supported sources

| Source | Notes |
|--------|-------|
| File | Files accessible to the deployment through supported upload or storage paths. |
| Amazon S3 | Uses access key/secret with read permission on the target bucket/prefix. |
| Kafka | Streams and batch pulls for topic-backed ingestion. |
| Postgres | Reads structured data for catalog and retrieval. |
| Hive | Reads warehouse data for catalog and retrieval. |
| Slack | Pulls channel content for indexing and retrieval. |

> Need a connector that isn’t listed? Contact Kamiwaza Support to discuss roadmap status or professional-services extensions.

## Ingestion service APIs (scheduling + runs)

The ingestion service provides job-based ingestion and connector execution. These endpoints are available behind the standard API gateway:

- `POST /api/ingestion/ingest/run` – run a connector immediately
- `POST /api/ingestion/ingest/jobs` – schedule a connector run (cron syntax)
- `GET /api/ingestion/ingest/status/{job_id}` – check job status

Each ingestion request specifies a `source_type` (for example `s3` or `postgres`) and a `kwargs`/`conn_args` payload that holds the connector-specific configuration.

## DDE connector and document APIs

DDE connector and document endpoints are mounted under the ingestion service with `/api/dde/...` paths. These are used by the UI and by automated ingestion workflows:

- `POST /api/ingestion/api/dde/connectors` – create a connector
- `PATCH /api/ingestion/api/dde/connectors/{id}` – update a connector
- `POST /api/ingestion/api/dde/connectors/{id}/trigger_ingest` – run now
- `POST /api/ingestion/api/dde/documents` – index a document
- `GET /api/ingestion/api/dde/documents` – list documents for a connector

Connectors carry security metadata such as `system_high` (the maximum classification allowed) and an optional `default_security_marking` applied when documents lack explicit markings.

### Audio ingest (0.12.1+)

Audio files submitted through the context manager are routed to the platform's OmniParse
transcription endpoint before indexing. In the current 0.12.1 context manager code, the supported
media extensions are `.aac`, `.aif`, `.aiff`, `.flac`, `.m4a`, `.m4b`, `.mp3`, `.oga`, `.ogg`,
`.opus`, `.wav`, `.wma`, plus `.mov`, `.mp4`, and `.webm` when only the audio track needs to be
transcribed.

Transcribed text enters the same extraction and indexing path as documents, so media sources appear
in search and retrieval with the same security markings as their parent connector. No connector-side
configuration change is required; the routing is automatic based on file type when OmniParse is
configured.
The automatic OmniParse path enables `use_omniparse=true` with `strict_omniparse=false` in the
underlying context manager. That means OmniParse failures fall back to the built-in extractors where
one exists, instead of failing the whole job immediately. For audio/video files themselves, successful
transcription is still required to produce chunks, so empty transcription results behave like empty
content.

Current limits come from the context manager rather than a DDE-specific knob: the default decoded
file-size limit is `100 MB` (configurable via `CONTEXT_MANAGER_MAX_FILE_SIZE`), the streaming upload ceiling is `200 MB`, and the OmniParse
transcription timeout defaults to `300` seconds.

For detailed documentation on OmniParse deployment, capabilities, and configuration options, see the [OmniParse Extension Guide](../extensions/omniparse/omniparse-service-guide.md).

## DDE MCP tool

Kamiwaza also ships a DDE-focused MCP tool, `tool-kamiwaza-dde`, for apps and agents that need
to work with catalog, ingestion, retrieval, VectorDB, or knowledge-graph operations without
building their own REST clients.

| Area | Example tools | What they are used for |
|--------|--------|--------|
| Catalog | `search_catalog`, `get_dataset`, `add_to_catalog` | Discover dataset metadata and register datasets in the catalog. |
| Pipelines | `ingest_source`, `ingest_document`, `create_pipeline_job`, `get_pipeline_job` | Submit content and manage ingestion jobs. |
| Retrieval | `search_context`, `retrieve_context`, `agentic_search` | Run grounded context search and retrieval from agents. |
| VectorDB | `list_collections`, `search_collections`, `query_vectors` | Inspect and query retrieval collections and vector stores. |
| Knowledge graph | `add_knowledge`, `search_knowledge`, `get_memory` | Populate and query Graphiti-backed knowledge state. |

The exact tool inventory can vary by release, but the 0.12.1 line aligns the MCP surface more
closely to the REST APIs exposed by the platform. To inspect the exact tool IDs your deployment
exposes, send the standard MCP `tools/list` request after `initialize`:

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list",
  "params": {}
}
```

### Session and auth flow

The DDE MCP tool uses streamable HTTP MCP semantics:

1. Send `initialize` to `/mcp`.
2. Read the returned `MCP-Session-Id` and `MCP-Protocol-Version` headers.
3. Send both headers on subsequent requests in the same session.

Operational notes:

- Restrict browser access with `KAMIWAZA_ALLOWED_ORIGINS`. The DDE MCP tool reads this variable
  directly; it does not use the platform-level `KAMIWAZA_CORS_ORIGINS` setting.
- For static service-to-service auth, set `KAMIWAZA_API_TOKEN`. If that variable is unset, the tool
  falls back to `KAMIWAZA_API_KEY`.
- If the incoming MCP request already carries `Authorization` or a forwarded `access_token` cookie,
  the tool preserves that caller/session auth instead of overriding it with the static env token.
- For end-user flows that should preserve the caller's identity, install the shared auth bridge so
  forwarded Kamiwaza headers reach the tool and downstream APIs.

## Security markings and rate limits

DDE document indexing and retrieval enforce security markings and system-high rules:

- Requests should include the user’s system-high clearance via the `X-User-System-High` header.
- Document markings are validated against system-high before indexing or listing.
- Requests are rate limited per connector and requester (HTTP 429 with `Retry-After` on limit).

Default rate limits are controlled by `DDE_DOCUMENT_RATE_LIMIT` (requests per window) and `DDE_DOCUMENT_RATE_WINDOW_SECONDS`.

## Operational guidance

- Keep connector credentials scoped to read-only roles where possible.
- Use the ReBAC validation checklist to ensure only authorized administrators can create or run connectors.
- Combine DDE jobs with Kamiwaza’s retrieval pipelines to expose fresh content in RAG applications.
- For connector-specific tuning such as chunking and file-size limits, use the supported product configuration options and deployment guidance available for your environment.
