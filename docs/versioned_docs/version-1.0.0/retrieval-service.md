---
title: Retrieval Service
sidebar_label: Retrieval Service
---

# Retrieval Service

The retrieval service exposes a job-based API for accessing dataset content. It supports inline responses for small datasets, server-sent events (SSE) for streaming, and gRPC for high-throughput consumers.

## Supported sources

Retrieval adapters cover these data sources:

- Filesystem
- Amazon S3
- Hive
- Postgres
- Kafka
- Slack

## Core workflow

1. **Create a retrieval job**
2. **Poll job status** (optional for streaming or gRPC)
3. **Stream results** (SSE) or connect via gRPC

### Create a job

`POST /api/retrieval/jobs`

Key fields:
- `dataset_urn` (required)
- `transport` (auto, inline, sse, grpc)
- `filters`, `columns`, `limit_rows`, `offset` (optional)
- `options` for source-specific settings (for example, Kafka bootstrap servers)

### Get job status

`GET /api/retrieval/jobs/{job_id}`

Returns status, progress, and dataset metadata. If the job uses gRPC, the response includes a short-lived token and endpoint.

### Stream results (SSE)

`GET /api/retrieval/jobs/{job_id}/stream`

Streams data as `text/event-stream` chunks. Use this for larger datasets or when you need progressive delivery.

### gRPC transport

If a job response includes a `grpc` block, use the token and endpoint with the retrieval gRPC service:

- Service: `kamiwaza.retrieval.v1.RetrievalService`
- Method: `StreamData`

The gRPC stream returns data chunks with metadata and a terminal marker.

## Access control

Retrieval requests are authorized against the dataset URN. Users must have viewer (or higher) access to the dataset to create or view jobs.

## Notes

- Use `transport=auto` to let the service choose between inline and streaming.
- For large datasets, prefer `sse` or `grpc` to avoid response size limits.

