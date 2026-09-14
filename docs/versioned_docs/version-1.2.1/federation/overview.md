---
sidebar_position: 1
title: Federation Overview
---

# Cluster Federation

Kamiwaza cluster federation enables cross-cluster operations between paired Kamiwaza clusters. A federated cluster can query remote data, list remote models, and execute compute jobs on its partner — all through a secured mesh proxy. The transport is HMAC-signed and mTLS-protected; **who the caller is** is decided by the federation's [identity mode](./identity-trust-modes.md), and **what they may do** is enforced by the receiving cluster's own ReBAC and per-record gates.

## Key Concepts

**Mesh Proxy** — Routes API calls from one cluster to another. For transport integrity the proxy signs each request with the federation's pre-shared key (PSK) via HMAC-SHA256; it forwards the caller's own token so the receiver can validate the caller's identity, and routes to the remote cluster's Istio ingress gateway. The response streams back transparently.

**Federation Trust** — Each federation pair shares a pre-shared key. All cross-cluster requests are HMAC-signed with this key, and the receiving cluster verifies the signature before processing the request. The PSK/HMAC secures the *transport*; the caller's *identity* is validated separately, according to the federation's [identity mode](./identity-trust-modes.md). Trust is per-federation, not per-cluster.

**Identity Modes** — A federation's [identity mode](./identity-trust-modes.md) decides whose identity a cross-cluster caller presents and how the receiver validates it. Kamiwaza 1.2.0 supports **`shared_idp`** (receiver-controlled shared realm) and **`peer_kc`** (source-trusted compatibility mode, gated by cluster policy). **`receiver_realm`** is reserved for a future receiver-owned guest-identity workflow and is rejected in 1.2.0.

**Receiver-controlled authorization** — Cross-cluster egress on the source is **authenticated-only**: any authenticated caller may reach the mesh proxy — there is no `operator`-relation gate. Authorization is decided by the **receiving** cluster, which validates the caller's identity per the identity mode and then evaluates the request against its **own** per-resource ReBAC guards (catalog, retrieval, jobs) and per-record gates. Roles do **not** cross clusters (see [shared identity ≠ shared authority](./identity-trust-modes.md#core-principle-shared-identity--shared-authority)).

**Compute Ships to Data** — Raw data never leaves the originating cluster. Only structured results (API responses, job outputs) cross the federation boundary.

## What You Can Do

| Operation | How | What Crosses the Network |
|-----------|-----|--------------------------|
| Query remote catalog | `GET /api/mesh/{cluster}/api/catalog/datasets/` | Dataset metadata (names, schemas, URNs) |
| Retrieve remote data | `POST /api/mesh/{cluster}/api/retrieval/jobs` | Query results (rows matching your filter) |
| List remote models | `GET /api/mesh/{cluster}/api/serving/deployments` | Deployment metadata (model names, status) |
| Run remote inference | `POST /api/mesh/{cluster}/runtime/models/{id}/v1/chat/completions` | Inference results |
| Submit remote job | `POST /api/mesh/{cluster}/cluster/jobs/run` | Structured job result (MVP+1) |

## Architecture

```
Cluster A (source)                          Cluster B (target)
┌─────────────────────┐                    ┌─────────────────────┐
│ User / Kaizen Agent  │                    │                     │
│   │                  │                    │                     │
│   ▼                  │                    │                     │
│ Mesh Proxy           │   HMAC-signed      │ Istio Gateway       │
│ /api/mesh/{cluster}/ │──────────────────▶│   │                 │
│   │ (auth-only)      │   HTTPS + mTLS     │   ▼                 │
│   │                  │                    │ ext-authz           │
│   │                  │                    │   │ verify HMAC     │
│   │                  │                    │   │ validate ident. │
│   │                  │                    │   ▼                 │
│   │                  │                    │ @guarded endpoint   │
│   │                  │                    │   │ (receiver ReBAC)│
│   │                  │   streamed         │   ▼                 │
│   │◀─────────────────│◀──────────────────│ Service response    │
│   │ response         │                    │                     │
└─────────────────────┘                    └─────────────────────┘
```

## Prerequisites

- Two compatible Kamiwaza 1.2.0 clusters using the Istio deployment profile
- STRICT mTLS (`PeerAuthentication`) in both namespaces
- Network connectivity between clusters on port 443
- Distinct, mutually reachable peer hostnames covered by each gateway TLS
  certificate. When connecting by IP, set `remote_ips[].hostname` for Host/SNI
  routing and include both the IP and hostname in the certificate SANs.
- A receiver-controlled identity mode. Use `shared_idp` for the first-wave
  workflow documented here; keep `peer_kc` default-off unless its weaker trust
  posture is explicitly accepted.

## Federation lifecycle at a glance

| Step | What | Where it's documented |
|------|------|----------------------|
| Pair two clusters | Preflight both routes, create reciprocal records, and let the handshake exchange CA trust | [Setup](./setup.md) |
| Allowlist federated users | Decide which remote users can act on this cluster | [Setup](./setup.md) |
| Query remote data | Federated retrieval over the mesh proxy | [Retrieval](./retrieval.md) |
| Submit remote jobs | Cluster-job execution with on-behalf-of (OBO) identity | [Job Submission](./job-submission.md) |
| Apply policy gates | Cluster `ExecutionGate` and per-dataset `AttributeGate` bindings | [Execution Gates](./execution-gates.md) |
| Install custom gates | Ship custom policy code as Python packages | [Gate Packages](./gate-packages.md) |
| Day-2 operations | Diagnose, cancel, revoke, audit | [Operations](./operations.md) |

## Next Steps

- [Federation Setup Guide](./setup.md) — Create and pair federations
- [Federated Retrieval](./retrieval.md) — Query remote data through the mesh proxy
- [Job Submission](./job-submission.md) — Submit federated jobs with OBO identity
- [Execution Gates](./execution-gates.md) — Cluster `ExecutionGate` + dataset `AttributeGate` policy bindings
- [Gate Packages](./gate-packages.md) — Install custom gate classes as hash-pinned Python packages
- [Operations & Troubleshooting](./operations.md) — Day-2 federation operations
- [API Reference](./api-reference.md) — Endpoint catalog
