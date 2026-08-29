---
sidebar_position: 7
title: API Reference
---

# Federation API reference

Reference for the federation-management and mesh-proxy endpoints. User-facing
routes accept a Keycloak JWT or personal access token (PAT). Federation
management writes require a native-realm administrator; a mesh-forwarded
credential cannot manage a receiver's federation records.

## Federation management

Manage cluster pairing, trust metadata, and brokered-user admission.

### List federations

```text
GET /api/cluster/federations
```

Returns all federation records to an authenticated native-realm caller. This
route does not apply a per-user federation ReBAC filter. The optional `status`
query parameter accepts `PAIRING`, `PAIRED`, `DISCONNECTED`, or `DELETED`;
`skip` and `limit` provide pagination.

**Response:**

```json
[
  {
    "id": "uuid",
    "remote_cluster_name": "string",
    "remote_ips": [{"ip": "string", "hostname": "string", "primary": true}],
    "callback_hostname": "string",
    "local_cluster_id": "uuid",
    "remote_cluster_id": "uuid",
    "status": "WAITING | PAIRING | PAIRED | DISCONNECTED | DELETED",
    "last_ping": "timestamp",
    "created_at": "timestamp",
    "identity_mode": "shared_idp | peer_kc",
    "trust_posture": "receiver_controlled_shared | source_trusted",
    "grandfathered": false,
    "brokering_enabled": true
  }
]
```

### Get a federation

```text
GET /api/cluster/federations/{federation_id}
```

Returns one federation record by UUID. This route requires a native-realm
administrator and returns `404` when the record does not exist.

### Create and pair a federation

```text
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

### Update a federation

```text
PUT /api/cluster/federations/{federation_id}
```

Updates only the fields that are safe to change in place:

- `brokering_enabled`
- `shared_jwks_url`
- `shared_ca_pem`
- `require_peer_jwt`

The endpoint rejects PSK, peer-binding, issuer-binding, identity-mode, remote
address, lifecycle, and audit-field changes. Delete and re-pair the federation
to change its PSK, peer binding, shared issuer, or identity mode.

**Request:**

```json
{
  "brokering_enabled": true,
  "shared_jwks_url": "https://idp.example.internal/realms/federation/protocol/openid-connect/certs",
  "require_peer_jwt": true
}
```

### Disconnect a federation

```text
POST /api/cluster/federations/{federation_id}/disconnect
POST /api/cluster/federations/{federation_id}/disconnect?force=true
```

The default form asks the peer to disconnect before the local record enters
`DISCONNECTED`. The `force=true` form performs the local transition when the
peer cannot acknowledge the request. Both forms require a native-realm
administrator.

### Delete a federation

```text
DELETE /api/cluster/federations/{federation_id}
```

Soft-deletes the local federation record and performs best-effort peer and
identity-provider teardown. Use the pairing flow to create a new record after
deletion.

### Manage allowlisted users

```text
POST /api/cluster/federations/{federation_id}/users
GET /api/cluster/federations/{federation_id}/users
POST /api/cluster/federations/{federation_id}/users/{external_id}/revoke
POST /api/cluster/federations/{federation_id}/users/{external_id}/restore
```

These native-administrator routes manage the receiver's brokered-user
allowlist. `external_id` identifies the source subject. Optional
`initial_tuples` are rendered when the receiver provisions the local brokered
user; `{{user_id}}` expands to that receiver-local UUID. Revoke disables new
mesh admission. The optional `cancel_in_flight_jobs=true` query parameter also
marks the user's active jobs stopped on a best-effort basis. Restore re-enables
the allowlist entry and can replace its tuple recipe.

**Add or update request:**

```json
{
  "external_id": "<source-user-uuid>@<source-cluster-uuid>",
  "initial_tuples": [
    {
      "subject": "user:{{user_id}}",
      "relation": "viewer",
      "object": "dataset:<dataset-urn>"
    }
  ]
}
```

### Ping a federation

```text
POST /api/cluster/federations/{federation_id}/ping
```

Tests authenticated end-to-end connectivity through the signed peer path and
returns `{ "federation_id": "...", "reachable": true }` on success.

### Preflight and diagnose

```text
POST /api/cluster/federations/preflight
POST /api/cluster/federations/{federation_id}/diagnose
POST /api/cluster/federations/resolve-address
```

Preflight probes a proposed route before persistence. Diagnose probes the
stored route. Resolve-address derives the IP/FQDN complement used by the
console pairing wizard. These endpoints require a native-realm administrator.

---

## Mesh Proxy

The mesh proxy forwards requests to remote federated clusters. Every request is HMAC-signed and ReBAC-gated.

### Proxy Path Pattern

```text
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
