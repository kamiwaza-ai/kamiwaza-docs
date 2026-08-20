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

### Create and Pair a Federation

```
POST /api/cluster/federations
POST /api/cluster/federations/{federation_id}/pair
```

Create the receiver's `WAITING` record first, then the initiator record. Call
`/{federation_id}/pair` on the initiator to drive the signed handshake and CA
exchange. Both endpoints require a native-realm administrator.

**Request:**
```json
{
  "remote_cluster_name": "fed-b",
  "remote_ips": [
    {"ip": "10.0.0.12", "hostname": "fed-b.example.internal", "primary": true}
  ],
  "preshared_key": "read-from-private-input",
  "role": "initiator",
  "shared_issuer_url": "https://idp.example.internal/realms/federation",
  "shared_jwks_url": "https://idp.example.internal/realms/federation/protocol/openid-connect/certs"
}
```

### Unpair a Federation

```
DELETE /api/cluster/federations/{federation_id}
```

Tears down the federation. Removes ReBAC grants and cleans up the pre-shared key.

### Rotate the Pre-Shared Key

```
POST /api/cluster/federations/{federation_id}/rotate-preshared-key
```

Mints a new pre-shared key and returns it **once**. The outgoing key keeps
verifying until the rotation is completed, so the mesh stays up while you deliver
the new value to the peer's operator out of band. Requires admin role.

```
POST /api/cluster/federations/{federation_id}/complete-key-rotation
{ "acknowledged": true }
```

Retires the outgoing key, ending the rotation. `acknowledged` is required because
this step breaks any peer still signing with the old key, and the cluster cannot
observe whether the peer has adopted the new one.

Because the key is symmetric, replacing it on one side alone would sever the mesh
immediately — rotation exists to provide the window in which both keys are valid.
Do not edit the stored secret directly.

### Ping a Federation

```
POST /api/cluster/federations/{federation_id}/ping
```

Tests authenticated end-to-end connectivity through the signed peer path and
returns `{ "federation_id": "...", "reachable": true }` on success.

### Preflight and Diagnose

```
POST /api/cluster/federations/preflight
POST /api/cluster/federations/{federation_id}/diagnose
POST /api/cluster/federations/resolve-address
```

Preflight probes a proposed route before persistence. Diagnose probes the
stored route. Resolve-address derives the IP/FQDN complement used by the
console pairing wizard. These endpoints are admin-only.

---

## Mesh Proxy

The mesh proxy forwards requests to remote federated clusters. Every request is HMAC-signed and ReBAC-gated.

### Proxy Path Pattern

```
{METHOD} /api/mesh/{federation_selector}/{remote_path}
```

`{federation_selector}` accepts an exact federation UUID, an exact remote cluster
UUID, or the federation record's `remote_cluster_name` as an exact or prefix
match. Use the federation UUID for automation. A name or prefix that matches
multiple paired rows returns `409 mesh_target_ambiguous` instead of choosing a
peer.

`remote_cluster_name` is the peer label stored when the federation is created
or paired. Ping does not refresh it after a peer rename. The cached old name
and federation UUID continue to work; re-pairing adopts the new display name.

`{remote_path}` is the path on the remote cluster. The proxy adds `/api` when
the path does not already begin with `/api` or `/runtime`.

**Authorization:** Mesh egress is **authenticated-only** — any authenticated local
user may call `/api/mesh/{fed}/*`. There is **no** `federation:operator` gate on the
egress path (it was removed in 1.1). Cross-cluster authorization is decided entirely
by the **receiving** cluster (its allowlist, per-resource ReBAC, and per-record gates).

**Request headers forwarded upstream:**

| Header | Source | Purpose |
|--------|--------|---------|
| `X-KZ-Mesh-Source-Cluster-Id` | Local cluster ID | Identifies the originating cluster |
| `X-KZ-Mesh-User-Id` | Local user's `sub` claim | Source-asserted user id (see note) |
| `X-KZ-Mesh-User-Roles` | Local user's roles (CSV) | Source-asserted roles (see note) |
| `X-KZ-Mesh-Route` | `{method} {path}` | Bound into the HMAC signature |
| `X-KZ-Mesh-Signature` | HMAC-SHA256 | Verified on the remote cluster |
| `X-KZ-Mesh-Signature-Ts` | Unix timestamp | Replay protection (5-minute window) |
| `X-KZ-Mesh-Correlation-Id` | Per-request UUID | Observability tracing |
| `X-KZ-Mesh-Peer-Token` | Caller's bearer token | Validated by the receiver in receiver-controlled identity modes and hashed into the signed envelope |
| `X-KZ-Mesh-User-Attributes` | Source's `X-User-Attributes` | Source-asserted attributes (ignored in receiver-controlled modes) |

:::warning Identity-mode-dependent trust
Whether the receiver **trusts** the source-asserted identity headers
(`X-KZ-Mesh-User-Id` / `-Roles` / `-Attributes`) depends on the federation's
[identity mode](./identity-trust-modes.md). In **`shared_idp`** (receiver-controlled)
the receiver establishes identity and attributes from the caller's **own validated
shared-realm token**, strips source-asserted cluster roles, and **ignores** the source
attribute header (F10 — "shared identity ≠ shared authority"). The source-asserted
headers are trusted only in source-trusted **`peer_kc`** / grandfathered mode.
:::

**Stripped before forwarding:**
- `Authorization` (the value is carried in the dedicated peer-token field,
  not as the receiver's normal bearer header)
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
| `403` `rebac_denied` | The **receiver's** per-resource ReBAC blocks the operation (there is no source-side `federation:operator` egress gate in 1.1) |
| `400` / `404` | Invalid route, local target, or no exact paired federation |
| `502` `mesh_proxy_bad_gateway` | Receiver connection, TLS, or upstream gateway failure |
| `504` `mesh_proxy_timeout` | Remote request exceeded the proxy timeout |
| `508` | Mesh hop/loop limit exceeded |

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
    "env_vars": {"KEY": "value"}
  },
  "metadata": {"label": "value"},
  "timeout_seconds": 300,
  "delegated_access": {
    "datasets": [
      {
        "urn": "urn:li:dataset:(urn:li:dataPlatform:postgres,orders,PROD)",
        "operations": ["discover", "retrieve"]
      }
    ],
    "models": []
  },
  "python_packages": ["humanize==4.13.0"]
}
```

`runtime_env` accepts environment variables only. Delegated jobs may request
exact package versions from the receiver's approved package catalog; arbitrary
Ray `pip`, `working_dir`, `py_modules`, and `conda` settings are stripped.

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
  "status": "SUCCEEDED" | "FAILED" | "STOPPED",
  "result": { ... },
  "duration_seconds": 3.1,
  "timed_out": false,
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
| Manage a federation (admin) | `federation` | `operator` | Federation **management** endpoints. **Not** required to call `/api/mesh/{fed}/*` — mesh egress is authenticated-only in 1.1 |
| Local user can query a dataset | `dataset` | `viewer` | For native (non-mesh) retrieval on this cluster |
| User can submit jobs | `cluster_jobs` | `executor` | Object id is the constant `"__all__"` |
| User can own a dataset | `dataset` | `owner` | Can write and manage |

:::warning Brokered mesh users
A federated caller has **no local account** on the target cluster until their first mesh request, when brokering auto-provisions a local Keycloak user with a freshly-minted UUID. The per-dataset check authorizes against that local UUID, so granting `dataset:viewer` via `/api/auth/tuples` with the source UUID returns `204` but never matches (retrieval stays `404`). Grant cross-mesh dataset access through the federation allowlist's `initial_tuples` instead — see [Retrieval → Access Control](./retrieval.md#access-control).
:::

---

## Attribute Headers

User attributes flow through ext-authz from JWT claims to domain gates on the retrieval service.

:::note Cross-cluster attributes
On a **cross-cluster (mesh)** call, the receiver does not blindly forward the
source's attributes. In `shared_idp` mode it derives `X-User-Attributes` from the
caller's **own validated shared-realm token** and ignores the source's forwarded
`X-KZ-Mesh-User-Attributes` (F10); the source-forwarded header is trusted only in
source-trusted `peer_kc` mode. See [Identity Trust Modes](./identity-trust-modes.md).
:::

### X-User-Attributes

Generic JSON header carrying all custom Keycloak user attributes. Set by ext-authz on the gateway when the JWT has custom claims (e.g. `clearance`, `country`, `department`).

**Example:**
```
X-User-Attributes: {"clearance":"S","country":"GBR"}
```

Forwarded across the mesh as `X-KZ-Mesh-User-Attributes`. Attribute gates on the retrieval service read this header to filter records per-user.

See the [Classification Gate design](https://docs.kamiwaza.ai/engineering/designs/attribute-gate) for the full attribute gate architecture.
