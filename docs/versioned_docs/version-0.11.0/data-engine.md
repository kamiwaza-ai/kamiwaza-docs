# Distributed Data Engine

Kamiwaza’s Distributed Data Engine (DDE) aligns unstructured and tabular content under a unified ingestion framework. Connector-driven pipelines push cleaned documents into the platform’s vector stores while keeping credentials and scheduling consistent with the rest of the control plane. Subsequent point releases continue to build on the same structure, so the guidance below applies to the current GA build unless otherwise noted.

> DDE stands for **Distributed Data Engine**.

## Platform assumptions

- The current Kamiwaza platform build is installed with the control plane available over HTTPS.
- You have administrative access to configure connectors and manage secrets.
- Target storage (Kamiwaza vector database or an external store) is reachable from the ingestion workers.

## Connector workflow

1. **Create a connector** – Choose the source system (S3, SharePoint, file upload, etc.) and supply the required fields. Connector forms mirror the parameters described in the internal knowledge base; public documentation lists only the high-level values.
2. **Secure credentials** – Provide either inline credentials or reference an existing Kamiwaza secret. Secrets are encrypted at rest and can be rotated without recreating the connector.
3. **Schedule ingestion** – Select one-time or recurring runs. DDE batches updates to minimize load on the source system.
4. **Monitor jobs** – Each run emits status events and logging metadata that flow into the standard observability dashboards.

## Supported sources

| Source | Notes |
|--------|-------|
| File | Local or network-accessible files. |
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

## Security markings and rate limits

DDE document indexing and retrieval enforce security markings and system-high rules:

- Requests should include the user’s system-high clearance via the `X-User-System-High` header.
- Document markings are validated against system-high before indexing or listing.
- Requests are rate limited per connector and requester (HTTP 429 with `Retry-After` on limit).

Default rate limits are controlled by `DDE_DOCUMENT_RATE_LIMIT` (requests per window) and `DDE_DOCUMENT_RATE_WINDOW_SECONDS`.

## Operational guidance

- Keep connector credentials scoped to read-only roles where possible.
- Use the ReBAC validation checklist to ensure only authorized operators can create or run connectors.
- Combine DDE jobs with Kamiwaza’s retrieval pipelines to expose fresh content in RAG applications.
- For connector-specific tuning (chunking, file size limits), refer your operators to the internal runbooks provided with your support agreement.
