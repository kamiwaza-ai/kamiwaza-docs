---
sidebar_position: 3
title: Federated Retrieval
---

# Federated Retrieval

Federated retrieval lets you discover and query data on remote clusters without the data leaving its origin. The mesh proxy routes your requests transparently — the remote cluster's catalog and retrieval services process them as if they were local.

## Prerequisites

- A [paired federation](./setup.md) between the clusters
- Remote CA cert stored in the federation record
- The mesh user must have the receiver-side per-dataset ReBAC grants and
  attribute-gate clearance required by the target cluster. A source-cluster
  administrator is not an exception on a mesh request.

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
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["job_id"])')

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

### Receiver authorization

Mesh origin is not a source-side admin bypass. The receiver validates the
caller according to the federation's identity mode and then applies its own
per-resource ReBAC and attribute gates to every mesh request, including calls
made by a source-cluster administrator. A receiver-realm guest's attributes
are assigned by the receiver; a shared-IdP caller's attributes come from its
validated shared-realm token. The source's roles and forwarded attribute header
are not authority in receiver-controlled modes.

Callers therefore need explicit receiver-side dataset grants. The catalog list
and retrieval endpoints filter or deny records that do not satisfy those
grants and gates.

Grant access **at federation-pairing time** through the brokered-user allowlist's `initial_tuples` field — **not** through `/api/auth/tuples`.

:::warning Why not `/api/auth/tuples`?
A federated caller has no local user account on the target cluster until their *first* mesh request, when the brokering service auto-provisions a local Keycloak user with a freshly-minted UUID. The per-dataset check authorizes against **that local UUID**, which is not known ahead of time — so a tuple written against the source cluster's user UUID via `/api/auth/tuples` never matches, and the call returns `204` while access stays denied (`404 Dataset not found`). The allowlist's `initial_tuples` solves this with a `{{user_id}}` placeholder that renders to the local UUID at provision time.
:::

```bash
# On the TARGET cluster, add the source user to the federation allowlist
# WITH the dataset grant. `{{user_id}}` renders to the local brokered KC
# UUID when the user is auto-provisioned on first mesh request, so the
# viewer relation lands on the subject the per-dataset check looks up.
curl -sk -X POST "https://<TARGET_IP>/api/cluster/federations/<FEDERATION_ID>/users" \
  -H "Authorization: Bearer $REMOTE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "<source-user-uuid>@<source-cluster-uuid>",
    "initial_tuples": [
      {
        "subject": "user:{{user_id}}",
        "relation": "viewer",
        "object": "dataset:<dataset-urn>"
      }
    ]
  }'
```

`initial_tuples` entries use namespaced `"<namespace>:<id>"` strings; `{{user_id}}` (local brokered UUID) and `{{external_id}}` (`<source-user-uuid>@<source-cluster-uuid>`) are substituted at provision time. To add a grant for an *already-provisioned* brokered user, re-POST the allowlist entry — seeding is idempotent.

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
| `X-KZ-Mesh-Peer-Token` | Caller bearer or receiver-realm credential used for receiver-side identity validation |

Terminal revocation refusals may also carry the four signed response-proof
headers listed in the [API reference](./api-reference.md#terminal-response-proof-headers).
The source proxy verifies that proof before purging only the affected user's
credential.

:::note Identity-mode-dependent trust
`X-KZ-Mesh-User-Id`/`-Roles` are **source-asserted**. In `shared_idp` and
`receiver_realm` (receiver-controlled) modes the receiver establishes identity
from its own validated token/realm credential and strips source-asserted cluster
roles; those headers are authoritative only in source-trusted `peer_kc` mode.
See [Identity Trust Modes](./identity-trust-modes.md).
:::
