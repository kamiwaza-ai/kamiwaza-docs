---
title: Workroom Runtime Contract
description: How workrooms bind to runtime applications, membership APIs, and the collaboration SSE feed in 0.12.1.
---

# Workroom Runtime Contract

0.12.1 introduces a stabilized **workroom runtime contract** for extensions that run inside a shared workroom, plus a real-time Server-Sent Events (SSE) feed for presence and collaboration events. This page covers the parts of the contract that extension authors and administrators need to know.

## Runtime app binding

A runtime application can be launched inside a workroom. While it is running in that workroom:

- its lifecycle (start, stop, restart) is scoped to the workroom
- its identity headers carry the workroom via `X-Workroom-Id`
- API calls it makes on behalf of a caller are evaluated against the caller's workroom membership and role, not the launcher's
- shared workroom credentials (connectors, model endpoints) are only exposed to the runtime when the caller is a member

When a user leaves a workroom, the platform refreshes any bound runtime sessions so the departing user's access is dropped. The refresh completes within the runtime launch token's TTL (minutes, not hours) — the outgoing user's token is not proactively revoked, but it is not renewed, so any in-flight call survives at most until the current token expires.

## Membership and roles

The workrooms API exposes roster operations that runtimes and the Workroom Manager UI share:

| Endpoint | Purpose |
| --- | --- |
| `GET  /api/workrooms/{id}/members/`     | List members visible to the caller. |
| `POST /api/workrooms/{id}/members/`     | Invite or add a member. |
| `PATCH /api/workrooms/{id}/members/{user_id}/` | Update a member's role. |
| `DELETE /api/workrooms/{id}/members/{user_id}/` | Remove a member (see active-session confirmation below). |

**Active-session confirmation mechanism.** Confirmation is carried as the query parameter `?confirm_active_sessions=true` on the `DELETE` request. The contract, grounded in `kamiwaza/services/workrooms/api.py::remove_workroom_member`:

1. Client issues `DELETE /api/workrooms/{id}/members/{user_id}/` without the query parameter (or with `false`).
2. If the target has one or more active workroom sessions, the server returns **HTTP 409** with `detail: "Member has active workroom sessions; confirm removal to continue"`. The membership is **not** modified.
3. Client surfaces the confirmation prompt to the operator, then retries with `DELETE /api/workrooms/{id}/members/{user_id}/?confirm_active_sessions=true`.
4. On the confirmed retry, the server removes the membership and terminates any bound runtime sessions for that user as part of the same request.

If the target has no active sessions, the initial `DELETE` succeeds without the query parameter. There is no request body or custom header — the mechanism is purely the query-string flag plus the `409` retry handshake.

## Collaboration SSE feed

Clients can subscribe to a per-workroom SSE stream for presence and collaboration signals:

```
GET /api/workrooms/{workroom_id}/events/stream
Accept: text/event-stream
Authorization: Bearer <token>
```

**Accepted bearer types.** The `Authorization` header accepts any of the following, in order of preference:

- A **user JWT** issued by the deployment's IdP. Use this for interactive browser/SPA clients subscribed on behalf of a signed-in user. The current platform validator expects a signed `RS256` token with `exp`; include `kid` so it can resolve the JWK. The deployment validates `iss` and, when configured, `aud`.
- A **runtime launch token** issued for an extension runtime bound to this workroom. Use this when the subscriber is an extension runtime — see [Runtime launch tokens](../developer-guide.md#runtime-launch-tokens). The token's runtime + user + workroom tuple must match the `{workroom_id}` in the path.
- A **personal access token (PAT)** scoped to the caller. Use this for service-to-service or CLI subscribers that cannot complete an interactive IdP flow. The caller still must be a current workroom member.

Tokens that do not resolve to a current member of the workroom receive `403`. Expired tokens receive `401`; reconnect with a freshly issued token and the `Last-Event-ID` header for resumable delivery.

Event categories:

- **presence** — a member joins, leaves, or goes idle in the workroom
- **runtime** — a runtime app in the workroom changes state (starting, ready, stopping)
- **collaboration** — membership or role changes the caller has permission to see

Each event includes a stable `id`, an `event` type, and a JSON `data` payload. Clients should honor the `retry` hint and reconnect with the last event id for resumable delivery.

**Rate limits and connection budget.**

- One active SSE connection per `(user, workroom)` tuple is the supported contract. Opening a second connection with the same tuple may cause the platform to close the older connection; do not rely on fan-out across multiple tabs without a client-side shared worker.
- Server-side `retry` hints are advisory. On unexpected disconnects, reconnect with exponential backoff starting at 1s and capping at 30s, with jitter. Do not reconnect in a tight loop on `401`/`403` — re-authenticate first.
- The stream is not a durable queue. Events older than the server's in-memory buffer may be dropped; `Last-Event-ID` provides best-effort resumption, not guaranteed delivery. Clients that need an authoritative state should re-fetch the relevant REST resource after reconnect.

## Behavior to rely on

- Workroom context isolation: a runtime cannot read data belonging to another workroom, even when the same user is a member of both.
- Credential gating: shared workroom credentials are distributed only to runtimes whose caller is a current workroom member.
- Fail-closed reads: ambiguous workroom reads are denied rather than silently broadened.

## See Also

- [Workroom Manager User Guide](./workroom-manager-user-guide.md)
- [Developer Guide — Runtime Launch Tokens](../developer-guide.md#runtime-launch-tokens)
