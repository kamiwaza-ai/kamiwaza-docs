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

When a user leaves a workroom, the platform refreshes any bound runtime sessions so the departing user's access is dropped promptly.

## Membership and roles

The workrooms API exposes roster operations that runtimes and the Workroom Manager UI share:

| Endpoint | Purpose |
| --- | --- |
| `GET  /api/workrooms/{id}/members/`     | List members visible to the caller. |
| `POST /api/workrooms/{id}/members/`     | Invite or add a member. |
| `PATCH /api/workrooms/{id}/members/{user_id}/` | Update a member's role. |
| `DELETE /api/workrooms/{id}/members/{user_id}/` | Remove a member (requires active-session confirmation). |

Member-removal flows now require explicit confirmation when the target has an active session, and any bound runtime sessions for that user are released as part of the removal.

## Collaboration SSE feed

Clients can subscribe to a per-workroom SSE stream for presence and collaboration signals:

```
GET /api/workrooms/{id}/events/
Accept: text/event-stream
Authorization: Bearer <token>
```

Event categories:

- **presence** — a member joins, leaves, or goes idle in the workroom
- **runtime** — a runtime app in the workroom changes state (starting, ready, stopping)
- **collaboration** — membership or role changes the caller has permission to see

Each event includes a stable `id`, an `event` type, and a JSON `data` payload. Clients should honor the `retry` hint and reconnect with the last event id for resumable delivery.

## Behavior to rely on

- Workroom context isolation: a runtime cannot read data belonging to another workroom, even when the same user is a member of both.
- Credential gating: shared workroom credentials are distributed only to runtimes whose caller is a current workroom member.
- Fail-closed reads: ambiguous workroom reads are denied rather than silently broadened.

## See Also

- [Workroom Manager User Guide](./workroom-manager-user-guide.md)
- [Developer Guide — Runtime Launch Tokens](../developer-guide.md#runtime-launch-tokens-0121)
