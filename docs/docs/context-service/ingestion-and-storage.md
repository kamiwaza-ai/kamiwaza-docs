---
title: Ingestion and Storage
sidebar_label: Ingestion and Storage
---

# Ingestion and Storage

Context Service accepts both direct file uploads and remote file references. In both cases, the service creates a pipeline job, processes the content in the background, and can retain raw file metadata for later inspection or download.

> **Technical preview:** Remote source ingestion and raw-file retention are still evolving. Validate behavior in your environment before depending on specific operational details.

## Ingest Modes

### Inline upload

Use `POST /context/upload/` when you want to send a single multipart file directly to Context Service.

This path is useful for:

- manual uploads from an application
- simple tests
- direct operator workflows

### Pipeline request with inline content

Use `POST /context/pipelines/` when you want to create a pipeline job explicitly and include one or more files in the request body using `content_base64`.

### Pipeline request with `source_ref`

Use `POST /context/pipelines/` with `source_ref` when the file should be pulled server-side by Context Service instead of being sent inline.

This path is useful when:

- files already live in a connected system
- you want smaller request payloads
- you need source metadata preserved with the ingest

Exactly one of `content_base64` or `source_ref` must be provided for each file.

## File Shape

The pipeline accepts files with a shape equivalent to the current `FileInput` schema:

```json
{
  "filename": "q4-plan.docx",
  "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "source_urn": "m365://drives/drive-123/items/item-456",
  "source_ref": {
    "kind": "m365",
    "connector_id": "11111111-2222-3333-4444-555555555555",
    "drive_id": "drive-123",
    "item_id": "item-456",
    "url": "https://contoso.sharepoint.com/..."
  },
  "metadata": {
    "folder": "finance"
  }
}
```

Inline content uses the same object shape, but replaces `source_ref` with `content_base64`.

## Create A Pipeline Job

`POST /context/pipelines/`

Example request:

```json
{
  "files": [
    {
      "filename": "notes.txt",
      "content_base64": "aGVsbG8gY29udGV4dA==",
      "content_type": "text/plain",
      "source_urn": "local://notes.txt"
    }
  ],
  "config": {
    "collection_name": "team_notes"
  }
}
```

Typical behavior:

- new jobs return `201 Created`
- idempotent replays return `200 OK`
- processing continues in the background after job creation

## Pipeline Jobs

Pipeline jobs are the main unit of ingest tracking.

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /context/pipelines/` | Create and start a job |
| `GET /context/pipelines/` | List jobs in the authorized workroom |
| `GET /context/pipelines/{job_id}` | Inspect one job |
| `DELETE /context/pipelines/{job_id}` | Cancel or delete a job |
| `GET /context/pipelines/supported-types` | List supported file extensions |

The platform starts processing immediately for newly created jobs. If a matching job is replayed idempotently, the existing job record is returned instead of starting duplicate work.

## Supported File Types

Use `GET /context/pipelines/supported-types` to inspect the current extractor surface for your deployment.

Example response:

```json
[".pdf", ".docx", ".md", ".txt"]
```

The exact list depends on the currently enabled extractors and pipeline configuration.

## Raw File Metadata

When raw storage is enabled, Context Service tracks stored file metadata and can optionally generate temporary download URLs.

Relevant endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /context/storage/raw` | List raw stored files |
| `GET /context/storage/raw/{file_id}` | Inspect one raw file record |
| `GET /context/documents/{source_urn}` | Resolve an original document by source URN |

Raw file metadata includes fields such as:

- raw file record ID
- workroom ID
- pipeline job ID
- original filename
- content type
- size in bytes
- SHA-256 checksum
- source kind and source reference
- stored object URI

## Raw File Example

Example detail response from `GET /context/storage/raw/{file_id}?include_download_url=true`:

```json
{
  "id": "3f061be0-16cb-47cc-a7a0-1e2ff4b06f92",
  "workroom_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "job_id": "11111111-2222-3333-4444-555555555555",
  "source_urn": "m365://drives/drive-123/items/item-456",
  "filename": "q4-plan.docx",
  "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size_bytes": 248901,
  "checksum_sha256": "6d7b4e7d...",
  "source_kind": "m365",
  "source_ref": {
    "kind": "m365",
    "connector_id": "11111111-2222-3333-4444-555555555555",
    "drive_id": "drive-123",
    "item_id": "item-456"
  },
  "s3_uri": "s3://bucket/workrooms/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/raw/q4-plan.docx",
  "metadata": {},
  "created_at": "2026-03-31T12:00:00Z",
  "download_url": "https://..."
}
```

## Document Download By Source URN

`GET /context/documents/{source_urn}`

This endpoint resolves a stored source document to a temporary download URL. Use it when your workflow already tracks `source_urn` values and you want the original document back without first looking up raw-file IDs.

> **Note:** This endpoint returns a temporary URL only when document storage is configured and the document has a stored object backing it.

## Operational Notes

- Archived workrooms reject write operations with `409 Conflict`
- Large or unsupported uploads return validation errors before processing
- Remote ingestion depends on the configured source integration being reachable and authorized
- Temporary download URLs are time-limited by the deployment configuration

## Related Docs

- [Context Service Overview](./overview)
- [Search and Knowledge](./search-and-knowledge)
- [Operations and API Reference](./operations-and-api-reference)
