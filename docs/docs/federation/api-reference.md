---
sidebar_position: 7
title: API Reference
---

# Federation API Reference

Reference for the public federation-management and mesh-proxy contracts. The
examples below use the `/api` prefix. Management routes are versioned with the
1.2 contract; the receiver-realm and per-user onboarding routes are the current
1.3 federation extension. The peer-protocol routes under
`/api/cluster/remote/*` are included for troubleshooting but are not intended
for direct user calls.

Unless a row says otherwise, a user-facing route accepts a Keycloak JWT or PAT.
`NativeRealmRequired` means the credential must be issued by this cluster's
native realm; a mesh-forwarded credential is rejected before the handler runs.

## Federation Management

Manage cluster federation pairing and cluster metadata.

### List Federations

```
GET /api/cluster/federations
```

Returns federations visible to any authenticated native-realm user. The route
does not apply a per-user federation ReBAC relation filter; management writes
remain administrator-only.
The optional `status` query parameter accepts `PAIRING`, `PAIRED`,
`DISCONNECTED`, or `DELETED`; `skip` and `limit` provide pagination. This is
not a per-user ReBAC-filtered list.

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
    "status": "PAIRING | PAIRED | DISCONNECTED | DELETED",
    "last_ping": "timestamp",
    "created_at": "timestamp"
  }
]
```

### Get or Update a Federation

```
GET /api/cluster/federations/{federation_id}
PUT /api/cluster/federations/{federation_id}
```

Both operations require an authenticated native-realm administrator. `GET`
returns the complete federation record. `PUT` accepts the mutable connection
metadata (for example `remote_ips`, `callback_hostname`, and the display name)
and returns the updated record; trust mode and terminal status are not mutable
through this endpoint.

### Create and Pair a Federation (legacy flow)

```
POST /api/cluster/federations
POST /api/cluster/federations/{federation_id}/pair
```

The first endpoint creates one half of the deprecated symmetric pairing. The
second completes the returned row and exchanges the peer CA/trust material.
Both require a native-realm administrator. New deployments should use the
request/approve flow below; legacy creation may be refused when
`ALLOW_UNTRUSTED_FEDERATION` is disabled.

**Legacy create request (representative):**
```json
{
  "remote_cluster_name": "peer-name",
  "remote_ips": [{"ip": "<PEER_IP>", "hostname": "<PEER_FQDN>", "primary": true}],
  "callback_hostname": "<THIS_CLUSTER_FQDN>",
  "preshared_key": "<PSK_FROM_PRIVATE_FILE>",
  "role": "initiator"
}
```

The pair request body is a `FederationPairRequest` containing the local CA
material required by the legacy handshake. The API returns `400` for invalid
or unsupported mode input, `403` for a non-admin/non-native caller, `404` for
an unknown federation, and `409` when the row is already paired or otherwise
in a conflicting state.

### Request, Approve, and Poll (current flow)

The current flow keeps the receiver in control of identity trust and admission:

```
POST /api/cluster/federations/request
POST /api/cluster/federations/{federation_id}/approve
POST /api/cluster/federations/{federation_id}/deny
GET  /api/cluster/federations/{federation_id}/request-status
```

The initiator submits a request with its remote address and a freshly generated
PSK. The receiver reviews the inert `REQUESTED` card, chooses `shared_idp` or
`receiver_realm`, and supplies the out-of-band PSK before approving. The
initiator polls `request-status`; it never treats a local row as paired until
the signed completion succeeds. `deny` is terminal for that request.

Use `POST /api/cluster/federations/generate-psk` to mint a new PSK without
creating a federation row. PSKs are secrets: transmit them through an approved
out-of-band channel and never place them in logs or source control.

### Unpair a Federation

```
DELETE /api/cluster/federations/{federation_id}
```

Tears down the federation. Removes ReBAC grants and cleans up the pre-shared key.

### Disconnect and Reconnect

```
POST /api/cluster/federations/{federation_id}/disconnect
POST /api/cluster/federations/{federation_id}/reconnect
```

`disconnect` is a reversible admission stop: it blocks new mesh requests while
preserving the federation row, trust material, and receiver realm. `reconnect`
is allowed only from `DISCONNECTED` and restores the local admission state.
Neither operation deletes the federation; use `DELETE` for a soft delete.

### Preflight, Diagnose, and Address Resolution

```
POST /api/cluster/federations/preflight
POST /api/cluster/federations/{federation_id}/diagnose
POST /api/cluster/federations/resolve-address
```

These native-admin endpoints validate a proposed route, diagnose a stored
route, or derive the IP/hostname pair used by the pairing UI. They do not
replace the pairing handshake or persist a federation by themselves.

### Rotate the Pre-Shared Key

```
POST /api/cluster/federations/{federation_id}/rotate-preshared-key
```

Mints K2 and returns the plaintext **once**, plus a non-secret fingerprint and
generation. K1 remains active while the peer operator receives K2 out of band.
Requires a native-realm administrator.

```
POST /api/cluster/federations/{federation_id}/adopt-preshared-key-rotation
{ "preshared_key": "<K2>", "fingerprint": "<sha256>" }
```

The peer operator adopts K2 without changing its active signer. The initiating
operator then performs the peer-first cutover:

```
GET  /api/cluster/federations/{federation_id}/key-rotation-status
POST /api/cluster/federations/{federation_id}/activate-key-rotation
     { "fingerprint": "<K2 fingerprint>" }
POST /api/cluster/federations/{federation_id}/complete-key-rotation
     { "fingerprint": "<K2 fingerprint>" }
```

Activation proves possession of K2 at the peer before making it the local
active signer. Completion retires K1 at the peer first, then removes the local
alternate. `key-rotation-status` exposes phase, generation, and fingerprints,
never plaintext keys. If a staged window must be abandoned before activation:

```
POST /api/cluster/federations/{federation_id}/abort-key-rotation
{ "fingerprint": "<K2 fingerprint>", "generation": "<generation>" }
```

Because the key is symmetric, replacing it on one side alone would sever the mesh
immediately — rotation exists to provide the window in which both keys are valid.
Do not edit the stored secret directly.

### Ping a Federation

```
POST /api/cluster/federations/{federation_id}/ping
```

Tests authenticated end-to-end connectivity through the signed peer path and
returns `{ "federation_id": "...", "reachable": true }` on success.

### Realm cleanup

```
POST /api/cluster/federations/realms/reclaim?dry_run=true&include_disconnected=false
```

Native-realm administrators can list receiver-owned realms that no longer have
an active federation. `dry_run=true` (the default) returns the orphan report;
set it to `false` only after reviewing that report. Disconnected federations are
excluded unless `include_disconnected=true`. A `403` means the caller is not a
native administrator; a `409`/`500` indicates a reclamation conflict or cleanup
failure. Realm reclamation is destructive and cannot be undone.

### Management authorization and status matrix

| Routes | Caller | Success / representative refusal |
|---|---|---|
| `GET /federations` | Any authenticated **native-realm** user | `200`; `401` unauthenticated, `403` mesh-origin |
| `GET/PUT/DELETE /federations/{id}` | Native-realm administrator | `200`; `404` unknown id, `409` invalid lifecycle, `403` non-admin or mesh-origin |
| `POST /federations`, `POST /federations/{id}/pair` (deprecated) | Native-realm administrator | `200`; `400` validation/policy refusal, `404` unknown id, `409` state conflict |
| `POST /federations/generate-psk`, `/request`, `/{id}/approve`, `/{id}/deny`, `/{id}/request-status` | Native-realm administrator | `200`; `400` validation, `404` unknown request, `409` request state conflict, `502` peer failure |
| `POST /federations/preflight`, `/resolve-address`, `/{id}/diagnose`, `/{id}/ping` | Native-realm administrator | `200`; `400` invalid route, `404` unknown id, `502`/`504` peer reachability failure |
| `POST /federations/{id}/disconnect`, `/reconnect`, `/refresh-peer-ca` | Native-realm administrator | `200`; `400` invalid input, `404` unknown id, `409` lifecycle/fingerprint conflict |
| `POST /federations/{id}/rotate-preshared-key`, `/adopt-preshared-key-rotation`, `/abort-key-rotation`, `/activate-key-rotation`, `/complete-key-rotation`; `GET .../key-rotation-status` | Native-realm administrator | `200`; `404` unknown id, `409` rotation state/fingerprint conflict, `502` peer refusal/unavailability |
| `POST/GET /federations/{id}/users*`, guest and relation routes | Native-realm administrator | `200`; `400` invalid relation/body, `404` unknown federation/user, `409` concurrent or lifecycle conflict |
| `POST /federations/{id}/onboarding/request`, `GET .../onboarding/me`, claim/status/recover | Authenticated caller, scoped to their own identity | `200`; `403` unauthorized delegation, `404` unknown request, `409` already claimed/conflict |
| `GET .../onboarding`, onboarding approve/deny | Native-realm administrator | `200`; `404` unknown request, `409` request conflict |

Validation failures use FastAPI's `422` response when the JSON shape cannot be
parsed. A `500` is reserved for an unexpected server failure; clients should
not interpret it as a successful federation transition.

### Federation User Allowlist and Guest Lifecycle

These receiver-side operations require a native-realm administrator. They are
not mesh-user enumeration endpoints.

```
POST /api/cluster/federations/{federation_id}/users
GET  /api/cluster/federations/{federation_id}/users
POST /api/cluster/federations/{federation_id}/users/{external_id}/revoke
POST /api/cluster/federations/{federation_id}/users/{external_id}/restore
```

The allowlist controls which source identities may be brokered. Revocation
marks the receiver row disabled and rejects subsequent calls; `restore` reverses
that exact allowlist mutation without changing the stored tuple recipe. A
federation-wide `reconnect` restores access after a disconnect. A
receiver-realm federation uses the guest endpoints:

```
POST /api/cluster/federations/{federation_id}/guests
GET  /api/cluster/federations/{federation_id}/guests/{external_id}/attributes
PUT  /api/cluster/federations/{federation_id}/guests/{external_id}/attributes
POST /api/cluster/federations/{federation_id}/guests/{external_id}/revoke
```

Guest enrollment returns the receiver-issued offline credential once. Store it
only in the source credential store; do not log or return it again. Attribute
assignment is receiver-owned and is available only for `receiver_realm` guests.

For a cross-federation administrative roster, use:

```
GET /api/cluster/federation-guests?with_attributes=true
```

For an admitted guest, receiver-owned ReBAC relations can be inspected or
changed with:

```
GET    /api/cluster/federations/{federation_id}/users/{external_id}/relations
POST   /api/cluster/federations/{federation_id}/users/{external_id}/relations
DELETE /api/cluster/federations/{federation_id}/users/{external_id}/relations
```

Relation mutation bodies contain `object_namespace`, `object_id`, and
`relation`; privileged/admin relations are rejected by the service layer.

### Per-user onboarding

Receiver-realm and shared-IDP federations use the same self-service/requester
surface. The requester can see only their own state; the receiver administrator
controls admission and denial.

```
POST /api/cluster/federations/{federation_id}/onboarding/request
GET  /api/cluster/federations/{federation_id}/onboarding
GET  /api/cluster/federations/{federation_id}/onboarding/me
POST /api/cluster/federations/{federation_id}/onboarding/{request_id}/approve
POST /api/cluster/federations/{federation_id}/onboarding/{request_id}/deny
POST /api/cluster/federations/{federation_id}/onboarding/claim
GET  /api/cluster/federations/{federation_id}/onboarding/claims/{attempt_id}
POST /api/cluster/federations/{federation_id}/onboarding/claims/{attempt_id}/recover
```

`request` accepts a justification/contact and, for an administrator acting for
another local user, an explicit `external_id`. `approve` may carry the
receiver-owned attributes and relation recipe; it never accepts authority from
the source cluster. `claim` exchanges a one-time claim token for the durable
credential and binds it to the calling user. `GET .../me`, claim status, and
recovery never return a credential. Typical errors are `403` for an
unauthorized delegated request, `404` for an unknown federation/request, and
`409` for a request already approved, denied, or claimed.

### Peer protocol (internal)

These routes are mounted under `/api/cluster/remote`. They are called by a
paired peer, not by a browser or SDK. Except for the initial request intake and
the token-scoped poll, they require the authenticated federation HMAC/mTLS
context (`TrustedFederatedCluster`).

```
POST /api/cluster/remote/federation-request                 # initial inert intake
GET  /api/cluster/remote/federation-request/{request_token} # token-scoped poll
POST /api/cluster/remote/pair
POST /api/cluster/remote/onboarding-request
POST /api/cluster/remote/onboarding-status
POST /api/cluster/remote/onboarding-claim
POST /api/cluster/remote/onboarding-claim-attempt
POST /api/cluster/remote/onboarding-claim-status
POST /api/cluster/remote/key-rotation-activate
POST /api/cluster/remote/key-rotation-complete
POST /api/cluster/remote/ping
POST /api/cluster/remote/identity-status
POST /api/cluster/remote/disconnect
```

The unauthenticated intake is bounded and creates only a `REQUESTED` record; it
does not accept a PSK or trust configuration. The request-token poll is scoped
to that one non-secret token. Peer-protocol failures return structured `4xx`
responses (invalid HMAC, replay, unknown federation, or state conflict); the
caller should not retry a refusal as if it were a successful transition.

---

## Mesh Proxy

The mesh proxy forwards requests to remote federated clusters. Every request is
HMAC-signed; the receiver applies identity-mode validation, allowlisting,
ReBAC, and attribute gates.

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
| `X-KZ-Mesh-Peer-Token` | Caller bearer or receiver-realm credential | Receiver-side identity validation in receiver-controlled modes |
| `X-KZ-Mesh-User-Attributes` | Source's `X-User-Attributes` | Source-asserted attributes (see note) |

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
- `Authorization` (the local token is not valid on the remote cluster)
- `Cookie`
- `Proxy-*` headers

### Terminal response proof headers

When the receiver rejects a caller because its guest or brokered-user admission
is revoked, it signs the exact status and response body before returning it.
The source proxy uses these headers to verify the refusal before purging only
that caller's durable federation credential:

| Header | Meaning |
|---|---|
| `X-KZ-Mesh-Response-Signature` | HMAC proof over status, body, timestamp, correlation id, and request signature |
| `X-KZ-Mesh-Response-Signature-Ts` | Proof timestamp; checked against the same replay window |
| `X-KZ-Mesh-Response-Correlation-Id` | Correlation id bound to the original request |
| `X-KZ-Mesh-Response-Request-Signature` | Exact request signature bound into the proof |

Ingress/ext-authz configuration must preserve these four response headers on the
return path. Missing, malformed, stale, or tampered proof headers never trigger
credential deletion; the proxy returns the upstream refusal without purging.

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
| `403` `rebac_denied` | The **receiver's** per-resource ReBAC blocks the operation (there is no source-side `federation:operator` egress gate in the current flow) |
| `400` / `404` | Invalid route, local target, or no paired federation |
| `502` `mesh_proxy_bad_gateway` | Remote connection, TLS, or upstream gateway failure |
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
| Manage a federation (admin) | `federation` | `operator` | Federation **management** endpoints. **Not** required to call `/api/mesh/{fed}/*` — mesh egress is authenticated-only in the current flow |
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
