---
sidebar_position: 2
title: Identity Trust Modes
---

# Identity Trust Modes

When you pair two clusters, you decide **whose identity a cross-cluster caller
presents to the remote cluster, and how the remote cluster verifies it.** This is
the federation's **identity mode** — a per-federation setting chosen by the
cluster that receives the calls (the *grantor*).

Kamiwaza 1.1 ships two identity modes:

| Mode | Trust | Who validates the caller | Use when |
|---|---|---|---|
| **`shared_idp`** | Receiver-controlled | The receiver validates the caller's token against a **shared realm** both clusters trust | Both clusters can trust one shared identity provider (single operator, or a tightly-coupled pair) |
| **`peer_kc`** | Source-trusted (legacy 1.0) | The receiver validates against the **peer cluster's own** Keycloak realm | Grandfathered pairings, or when you explicitly accept the source cluster as an identity authority |

:::note
A third mode, `receiver_realm`, is planned for a future release and is **not
available in 1.1**. Only `shared_idp` and `peer_kc` can be configured today.
:::

## Core principle: shared identity ≠ shared authority

Trusting a shared identity does **not** grant shared authority. When a caller from
another cluster presents a validated token, that token confers **identity only**:

- **Roles do not cross clusters.** A shared-realm caller's cluster-admin role is
  stripped; what they can do on the receiver is governed entirely by the
  **receiver's own** relationship-based access control (ReBAC).
- **Attributes come from the validated token, never from forwarded headers.**
  Attributes such as `clearance` or `compartment` are read from the caller's own
  signature-verified token. The receiver **ignores** any attribute headers the
  source cluster forwards.
- **Attributes are read from the token the caller presents**, not fetched live
  from the identity provider. A downgrade (for example, lowering a `clearance`)
  takes effect on the caller's **next** token, bounded by the token's lifetime.

This is why `shared_idp` is *receiver-controlled*: the receiver decides who its
users are (via the shared realm it trusts) **and** what they may do (via its own
ReBAC and per-record gates).

## `shared_idp` — receiver-controlled

Both clusters trust the **same** realm as an identity provider. A caller
authenticates against that shared realm and presents its token; the receiver
validates that token against the realm's published keys (JWKS) before honoring
the request.

Per-federation configuration (set on the receiver at pairing time):

| Field | Purpose |
|---|---|
| `shared_issuer_url` | The shared realm's issuer URL. **Supplying this at create time selects `shared_idp`.** |
| `shared_jwks_url` | Where the receiver fetches the shared realm's signing keys to validate tokens. |
| `shared_ca_pem` | (Optional) TLS trust root used to reach the shared realm's JWKS endpoint. |

:::important
Naming an issuer on a federation is **not sufficient** for the receiver to accept
its tokens. The receiver only accepts a shared-realm token if that issuer is
**enrolled in the cluster's trusted-shared-issuers list** (see
[Cluster policy](#cluster-policy) below). An unenrolled issuer is rejected.
:::

## `peer_kc` — source-trusted (legacy)

The receiver validates the caller against the **peer cluster's own** Keycloak
realm — it trusts the source cluster to be the identity authority. This is the
1.0 model.

- Creating a **new** `peer_kc` federation is **refused** unless the cluster policy
  `ALLOW_UNTRUSTED_FEDERATION` is enabled (it is **off by default**). See
  [Cluster policy](#cluster-policy).
- A new `peer_kc` federation is created in **strict mode** (`require_peer_jwt`):
  the caller's peer token must validate against the pinned peer realm.
- A federation created before 1.1 has **no identity mode set** — it is treated as
  a **grandfathered** `peer_kc` pairing and keeps working after upgrade, exempt
  from the `ALLOW_UNTRUSTED_FEDERATION` refusal, and surfaced as the weaker
  posture so operators can see which pairings rest on trusting the source.

## Choosing and configuring a mode

The **grantor** (the cluster receiving the calls) decides the mode from its own
policy at pairing time. A requester may *propose* a mode, but an inbound proposal
is not auto-trusted — the receiver's policy decides.

The mode is selected implicitly by what you supply when you create the federation:

- **Supply `shared_issuer_url`** → the federation is `shared_idp`.
- **Omit it** → the federation is legacy `peer_kc` (subject to
  `ALLOW_UNTRUSTED_FEDERATION`).

:::warning
**The identity mode cannot be changed in place.** Switching a federation between
`peer_kc` and `shared_idp` requires **deleting and re-pairing** it. (Rotatable
trust details, such as the shared JWKS URL, *can* be updated without re-pairing.)
:::

See the [Setup Guide](./setup.md) for the concrete pairing steps.

## Cluster policy

Two cluster-level settings govern identity trust across **all** of a cluster's
federations. Both are operator-configured (via the deploy chart) and default to
the secure posture.

| Setting | Deploy chart key | Default | Effect |
|---|---|---|---|
| `ALLOW_UNTRUSTED_FEDERATION` | `scheduler.allowUntrustedFederation` | `false` | When `false`, creating a **new** `peer_kc` (source-trusted) federation is refused. Existing pairings are grandfathered. |
| `AUTH_GATEWAY_TRUSTED_SHARED_ISSUERS` | `scheduler.trustedSharedIssuers` | *(empty)* | The comma-separated list of shared-realm issuer URLs this cluster will accept `shared_idp` tokens from. **Empty means no shared issuers are trusted** — a `shared_idp` token is rejected unless its issuer is on this list. |

## Next steps

- [Setup Guide](./setup.md) — pair clusters and choose a mode
- [Federated Retrieval](./retrieval.md) — cross-cluster retrieval with per-record gating
- [Overview](./overview.md) — how federation fits together
