---
sidebar_position: 3
title: Federated Retrieval
---

# Federated Retrieval

Federated retrieval lets you discover and query data on remote clusters without the data leaving its origin. The mesh proxy routes your requests transparently — the remote cluster's catalog and retrieval services process them as if they were local.

## Prerequisites

- A [paired federation](./setup.md) between the clusters
- Remote CA cert stored in the federation record
- The mesh user must have per-dataset ReBAC grants on the target cluster (admin users with `extauthz` trust are exempt)

## Discover Remote Datasets

```bash
# List datasets on the remote cluster
curl -sk "https://kamiwaza.test/api/mesh/<remote-cluster>/api/catalog/datasets/" \
  -H "Authorization: Bearer $TOKEN"
```

Response: array of dataset metadata (URNs, names, schemas) from the remote cluster's catalog.

## Retrieve Remote Data

```bash
# Create a retrieval job on the remote cluster
curl -sk -X POST "https://kamiwaza.test/api/mesh/<remote-cluster>/api/retrieval/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_urn": "urn:li:dataset:(urn:li:dataPlatform:postgres,nps_verbatims,PROD)",
    "columns": ["customer_id", "verbatim", "score"],
    "filters": {"quarter": "Q1-2026"},
    "transport": "inline"
  }'
```

The retrieval service on the remote cluster accesses its local data adapters (S3, Postgres, Hive, etc.) and returns the results through the mesh proxy. Only the query results cross the network — raw data stays on the remote cluster.

### Streaming Retrieval (SSE)

For large result sets, use the streaming transport:

```bash
# Submit job, then stream results
JOB_ID=$(curl -sk -X POST "https://kamiwaza.test/api/mesh/<remote-cluster>/api/retrieval/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dataset_urn": "...", "transport": "sse"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

# Stream results via SSE
curl -sk "https://kamiwaza.test/api/mesh/<remote-cluster>/api/retrieval/jobs/$JOB_ID/stream" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream"
```

SSE events stream through the mesh proxy transparently.

## List Remote Models

```bash
curl -sk "https://kamiwaza.test/api/mesh/<remote-cluster>/api/serving/deployments" \
  -H "Authorization: Bearer $TOKEN"
```

Returns deployment metadata: model names, engine types, status, and access paths.

## Run Remote Inference

```bash
# Chat completion on a remote model
curl -sk -X POST \
  "https://kamiwaza.test/api/mesh/<remote-cluster>/runtime/models/<deployment-id>/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3-4B",
    "messages": [{"role": "user", "content": "Summarize the NPS themes"}]
  }'
```

The inference request routes through the mesh proxy to the remote cluster's Ray Serve deployment. The response streams back.

## Access Control

### Admin Users

On Istio clusters with the `extauthz` trust model, admin users bypass per-resource ReBAC checks on the target cluster (standard admin bypass). No additional seeding is needed.

### Non-Admin Users

Non-admin users require explicit per-dataset ReBAC grants on the target cluster. The admin bypass is suppressed for mesh-originated requests in the retrieval service — federated callers must have explicit `viewer` access to each dataset they query.

To grant access:

```bash
# On the TARGET cluster, seed a relation for the remote user
curl -sk -X PUT "https://<TARGET_IP>/api/auth/tuples" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {"namespace": "user", "id": "<remote-user-uuid>"},
    "relation": "viewer",
    "object": {"namespace": "dataset", "id": "<dataset-urn>"}
  }'
```

## Mesh Proxy Endpoint Reference

All federated operations use the mesh proxy at `/api/mesh/{cluster_selector}/`:

| Parameter | Description |
|-----------|-------------|
| `cluster_selector` | Remote cluster name, UUID, or federation ID. Prefix matching supported (e.g., `studio` matches `studio-1`). |
| `{path}` | The API path on the remote cluster. Paths starting with `runtime/` are routed as-is; all others get an `/api/` prefix. |

### Timeouts

| Path Type | Default Timeout | Env Override |
|-----------|----------------|--------------|
| API paths | 60 seconds | `MESH_PROXY_READ_TIMEOUT_SECONDS` |
| Runtime paths (inference) | 600 seconds | `MESH_PROXY_RUNTIME_READ_TIMEOUT_SECONDS` |

### Headers

The mesh proxy adds these headers to cross-cluster requests:

| Header | Purpose |
|--------|---------|
| `X-KZ-Mesh-Source-Cluster-Id` | Originating cluster UUID |
| `X-KZ-Mesh-User-Id` | Authenticated user ID |
| `X-KZ-Mesh-User-Roles` | User roles (comma-separated) |
| `X-KZ-Mesh-Signature` | HMAC-SHA256 signature |
| `X-KZ-Mesh-Correlation-Id` | Request correlation ID for cross-cluster tracing |
| `X-KZ-Mesh-Route` | Hop trace for loop detection |
