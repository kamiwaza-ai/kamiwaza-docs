---
sidebar_position: 7
title: API Reference
---

# Federation API Reference

Complete reference for the mesh proxy and federation endpoints. All endpoints require authentication via Keycloak JWT or PAT.

## Federation Management

Manage cluster federation pairing and cluster metadata.

### List Federations

```
GET /api/cluster/federations
```

Returns all federations the current user has operator or viewer access to.

**Response:**
```json
[
  {
    "id": "uuid",
    "remote_cluster_name": "string",
    "remote_ips": [{"ip": "string", "primary": true}],
    "callback_hostname": "string",
    "local_cluster_id": "uuid",
    "remote_cluster_id": "uuid",
    "status": "PAIRED | PAIRING | FAILED",
    "last_ping": "timestamp",
    "created_at": "timestamp"
  }
]
```

### Pair a Federation

```
POST /api/cluster/federations/pair
```

Initiates a pairing handshake with a remote cluster. Exchanges CA certificates and pre-shared HMAC keys. Requires admin role.

**Request:**
```json
{
  "remote_cluster_name": "string",
  "remote_ips": ["192.168.50.168"],
  "local_ca_cert": "-----BEGIN CERTIFICATE-----\n..."
}
```

### Unpair a Federation

```
DELETE /api/cluster/federations/{federation_id}
```

Tears down the federation. Removes ReBAC grants and cleans up the pre-shared key.

### Ping a Federation

```
GET /api/cluster/federations/{federation_id}/ping
```

Tests end-to-end connectivity through the mesh proxy. Returns reachability status without requiring authentication to succeed on the remote side.

---

## Mesh Proxy

The mesh proxy forwards requests to remote federated clusters. Every request is HMAC-signed and ReBAC-gated.

### Proxy Path Pattern

```
{METHOD} /api/mesh/{federation_name}/{remote_path}
```

The `{federation_name}` is the `remote_cluster_name` from the federation record. The `{remote_path}` is the path on the remote cluster (without the `/api` prefix — it's re-added by the proxy).

**Authorization:** The caller must have `operator` relation on the federation (seeded automatically when the federation is paired by an admin; can be granted to other users via the ReBAC API).

**Request headers forwarded upstream:**

| Header | Source | Purpose |
|--------|--------|---------|
| `X-KZ-Mesh-Source-Cluster-Id` | Local cluster ID | Identifies the originating cluster |
| `X-KZ-Mesh-User-Id` | Local user's `sub` claim | Remote identity resolution |
| `X-KZ-Mesh-User-Roles` | Local user's roles (CSV) | Remote role-based checks |
| `X-KZ-Mesh-Route` | `{method} {path}` | Bound into the HMAC signature |
| `X-KZ-Mesh-Signature` | HMAC-SHA256 | Verified on the remote cluster |
| `X-KZ-Mesh-Signature-Ts` | Unix timestamp | Replay protection (5-minute window) |
| `X-KZ-Mesh-Correlation-Id` | Per-request UUID | Observability tracing |
| `X-KZ-Mesh-User-Attributes` | `X-User-Attributes` from source | Passed through to attribute gates |

**Stripped before forwarding:**
- `Authorization` (the local token is not valid on the remote cluster)
- `Cookie`
- `Proxy-*` headers

### Common Proxied Endpoints

| Path | Purpose |
|------|---------|
| `GET /api/mesh/{fed}/catalog/datasets/` | List remote datasets |
| `GET /api/mesh/{fed}/serving/deployments` | List remote models |
| `POST /api/mesh/{fed}/retrieval/jobs` | Run a retrieval job on the remote cluster |
| `GET /api/mesh/{fed}/retrieval/jobs/{id}/stream` | SSE stream of a remote retrieval |
| `POST /api/mesh/{fed}/cluster/jobs/run` | Submit and run a Ray job on the remote cluster |

### Error Responses

| Status | Condition |
|--------|-----------|
| `401` | Local auth failed (invalid JWT / PAT) |
| `403` `rebac_denied` | Caller lacks operator on the federation or remote ReBAC blocks the operation |
| `503` | Remote cluster unreachable or HMAC verification failed on the remote side |
| `504` | Remote request exceeded the proxy timeout |

---

## Job Submission

Submit and manage Ray jobs on local or remote clusters. For the full lifecycle narrative with examples, see [Job Submission](./job-submission.md).

### Submit Asynchronously

```
POST /api/cluster/jobs/submit
```

Submits a job to Ray and returns immediately. Poll `/status` or `/result` to track it.

**Request:**
```json
{
  "cluster_selector": "local" | "federation_name",
  "entrypoint": "python analysis.py",
  "runtime_env": {
    "env_vars": {"KEY": "value"},
    "working_dir": "s3://..."
  },
  "metadata": {"label": "value"},
  "timeout_seconds": 300
}
```

**Response:**
```json
{
  "id": "uuid",
  "ray_job_id": "string",
  "status": "PENDING",
  "cluster_selector": "string",
  "submitted_at": "timestamp"
}
```

### Run Synchronously

```
POST /api/cluster/jobs/run
```

Submits the job, polls until completion (or timeout), extracts the result marker, and returns everything in one response.

**Response:**
```json
{
  "id": "uuid",
  "status": "SUCCEEDED" | "FAILED" | "TIMEOUT" | "CANCELLED",
  "result": { ... },
  "duration_seconds": 3.1,
  "error_message": "string | null"
}
```

### Get Status

```
GET /api/cluster/jobs/{job_id}/status
```

### Get Result

```
GET /api/cluster/jobs/{job_id}/result
```

Returns the structured result extracted from the job's log marker (`KZ_MESH_RUN_ON_JSON::{...}`).

### Get Logs

```
GET /api/cluster/jobs/{job_id}/logs
```

Returns Ray stdout/stderr for the job.

### Cancel

```
POST /api/cluster/jobs/{job_id}/cancel
```

Signals Ray to cancel a running job.

---

## ReBAC Relations

Fine-grained authorization. All mesh and federation operations go through ReBAC checks.

### Grant a Relation

```
POST /api/auth/tuples
```

**Request:**
```json
{
  "subject": {"namespace": "user", "id": "<uuid>"},
  "relation": "operator" | "viewer" | "owner" | "executor",
  "object": {
    "namespace": "federation" | "dataset" | "model" | "cluster_jobs",
    "id": "string"
  }
}
```

This grants a relation to a **local** user — one with an account on the cluster you call. It does **not** work for brokered mesh users (see the note below).

### Common Grant Patterns

| Scenario | Namespace | Relation | Notes |
|----------|-----------|----------|-------|
| User can use a federation | `federation` | `operator` | Required to call `/api/mesh/{fed}/*`; granted to a local user on the **source** cluster |
| Local user can query a dataset | `dataset` | `viewer` | For native (non-mesh) retrieval on this cluster |
| User can submit jobs | `cluster_jobs` | `executor` | Object id is the constant `"__all__"` |
| User can own a dataset | `dataset` | `owner` | Can write and manage |

:::warning Brokered mesh users
A federated caller has **no local account** on the target cluster until their first mesh request, when brokering auto-provisions a local Keycloak user with a freshly-minted UUID. The per-dataset check authorizes against that local UUID, so granting `dataset:viewer` via `/api/auth/tuples` with the source UUID returns `204` but never matches (retrieval stays `404`). Grant cross-mesh dataset access through the federation allowlist's `initial_tuples` instead — see [Retrieval → Access Control](./retrieval.md#access-control).
:::

---

## Attribute Headers

User attributes flow through ext-authz from JWT claims to domain gates on the retrieval service.

### X-User-Attributes

Generic JSON header carrying all custom Keycloak user attributes. Set by ext-authz on the gateway when the JWT has custom claims (e.g. `clearance`, `country`, `department`).

**Example:**
```
X-User-Attributes: {"clearance":"S","country":"GBR"}
```

Forwarded across the mesh as `X-KZ-Mesh-User-Attributes`. Attribute gates on the retrieval service read this header to filter records per-user.

See the [Classification Gate design](https://docs.kamiwaza.ai/engineering/designs/attribute-gate) for the full attribute gate architecture.
