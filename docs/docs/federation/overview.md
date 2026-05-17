---
sidebar_position: 1
title: Federation Overview
---

# Cluster Federation

Kamiwaza cluster federation enables cross-cluster operations between paired Kamiwaza clusters. A federated cluster can query remote data, list remote models, and execute compute jobs on its partner — all through a secured mesh proxy with HMAC-signed trust and ReBAC authorization.

## Key Concepts

**Mesh Proxy** — Routes API calls from one cluster to another. The proxy strips the caller's authentication, signs the request with the federation's pre-shared key (PSK) via HMAC-SHA256, and forwards to the remote cluster's Istio ingress gateway. The response streams back transparently.

**Federation Trust** — Each federation pair shares a pre-shared key. All cross-cluster requests are HMAC-signed with this key. The receiving cluster verifies the signature before processing the request. Trust is per-federation, not per-cluster.

**ReBAC Gating** — Authorization is enforced on both sides of the federation link:
- **Source cluster**: The calling user must have the `operator` relation on the `federation` namespace for the target federation
- **Target cluster**: The mesh-originated identity is evaluated against standard per-resource ReBAC guards (catalog, retrieval, jobs)

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
│   │ @guarded         │   HTTPS + mTLS     │   ▼                 │
│   │ (federation:     │                    │ ext-authz           │
│   │  operator)       │                    │   │ verify HMAC     │
│   │                  │                    │   │ mint identity   │
│   │                  │                    │   ▼                 │
│   │                  │                    │ @guarded endpoint   │
│   │                  │                    │   │ (standard ReBAC)│
│   │                  │   streamed         │   ▼                 │
│   │◀─────────────────│◀──────────────────│ Service response    │
│   │ response         │                    │                     │
└─────────────────────┘                    └─────────────────────┘
```

## Prerequisites

- Two Kamiwaza clusters running on Istio with `KAMIWAZA_ROUTING_PROVIDER=istio`
- STRICT mTLS (`PeerAuthentication`) in both namespaces
- Network connectivity between clusters on port 443
- Each cluster's Istio gateway TLS cert must include its node IP in SANs

## Next Steps

- [Federation Setup Guide](./setup.md) — Create and pair federations
- [Federated Retrieval](./retrieval.md) — Query remote data through the mesh proxy
