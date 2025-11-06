# Distributed Data Engine

Kamiwaza’s Distributed Data Engine (DDE) aligns unstructured and tabular content under a unified ingestion framework. The 0.7 release introduced connector-driven pipelines that push cleaned documents into the platform’s vector stores while keeping credentials and scheduling consistent with the rest of the control plane. Subsequent point releases continue to build on the same structure, so the guidance below applies to the current GA build unless otherwise noted.

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
| Amazon S3 | Uses access key/secret with read permission on the target bucket/prefix. |
| Azure Blob Storage | Supports SAS tokens or client secrets. |
| SharePoint | Requires an Azure AD application with delegated permissions. |
| HTTPS Fetch | Pulls static content or sitemap-driven collections. |
| File Upload | One-time ingestion of local files through the UI. |

> Need a connector that isn’t listed? Contact Kamiwaza Support to discuss roadmap status or professional-services extensions.

## Operational guidance

- Keep connector credentials scoped to read-only roles where possible.
- Use the ReBAC validation checklist to ensure only authorized operators can create or run connectors.
- Combine DDE jobs with Kamiwaza’s retrieval pipelines to expose fresh content in RAG applications.
- For connector-specific tuning (chunking, file size limits), refer your operators to the internal runbooks provided with your support agreement.

## Next steps

- After configuring a connector, run a test sync and review the validation checklist to confirm data lands in the expected index.
- Pair DDE ingestion with Bedrock deployments to light up new retrieval-augmented experiences.
