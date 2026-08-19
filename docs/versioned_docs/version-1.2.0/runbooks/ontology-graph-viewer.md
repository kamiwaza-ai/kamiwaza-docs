---
id: ontology-graph-viewer
title: Ontology Graph Viewer Runbook
sidebar_label: Ontology Graph Viewer
---

# Ontology Graph Viewer Runbook

The **Graph** tab in a workroom shows a knowledge graph built from the workroom's sources. The Graph tab renders an empty or "being set up" state when the underlying ontology graph instance for the workroom is not yet running. This page describes what those states mean and how to recover from them.

If you reached this page from the **View runbook** button in the Graph tab, the workroom's graph instance is provisioned but not in a running state, or is still being provisioned and has exceeded the typical setup window.

## What You May See

The Graph tab surfaces two empty states that link to this runbook:

- **"Knowledge graph is being set up"** — the workroom's graph instance is `pending`. The auto-provisioner deploys the graph backend in the background; typical provisioning takes around 30 seconds. The UI polls instance status for up to 60 seconds and then stops auto-refreshing.
- **"Graph instance idle"** — the workroom's graph instance was provisioned at some point but is not currently running. The empty state displays the instance status string (for example, `stopped`, `failed`, `unknown`).

For context, two adjacent Graph tab states that don't link here but appear elsewhere in this page:

- **"No ontology instance"** — shown before any provisioning has occurred for the workroom, with a "Create ontology instance" CTA gated on the admin role. This state is the post-recovery target of the [Recreate the Instance](#recreate-the-instance) step below.
- **"Graph unavailable"** — the backend-error state, shown with a retry action and a correlation ID for support. If you saw this and were redirected to this runbook, include the correlation ID when you ask for help.

The first response to either of the runbook-linked states is to refresh the page. The tab re-queries instance status on reload, and a transient state may resolve on its own.

## "Knowledge graph is being set up"

If this message persists for longer than a minute or two, the auto-provisioner is not completing. Check the underlying pods:

```bash
kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti
```

The Kamiwaza extension operator labels graph backend pods with `extensions.kamiwaza.io/name=service-graphiti`. If the selector returns no pods, the operator has not yet created them — confirm the `service-graphiti` `KamiwazaExtension` resource is present in the namespace and reconciling without errors.

If the pods exist but are not `Running`, inspect them:

```bash
kubectl describe pod -n kamiwaza <pod>
kubectl logs -n kamiwaza <pod>
```

Common causes for a stuck `pending` state include:

- The image is still being pulled (check `describe` events).
- A required secret or config value is missing.
- The underlying graph database is starting up or failing its readiness probe.
- The pod cannot reach a dependency it needs to become ready.

## "Graph instance idle"

The instance status string in the empty state indicates the broad failure mode. Use the same selector to find the pods:

```bash
kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti \
  -L extensions.kamiwaza.io/deployment-id
```

`-L extensions.kamiwaza.io/deployment-id` surfaces the per-workroom deployment id as a column rather than printing the full label set. Each per-workroom graph instance is provisioned as a separate `KamiwazaExtension` and carries a unique `extensions.kamiwaza.io/deployment-id` label, which the operator also propagates to the owning Deployment — so the same label scopes both pod-level and Deployment-level commands later in this runbook. To list just the deployment-id values currently in the namespace:

```bash
kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti \
  -o jsonpath='{range .items[*]}{.metadata.labels.extensions\.kamiwaza\.io/deployment-id}{"\t"}{.metadata.name}{"\n"}{end}' \
  | sort -u
```

Cross-reference the listed deployment-ids against the affected workroom's `ontology_id` from the Graph tab status payload to pick the one to recover. The subsequent recovery steps use this value to scope actions to that single instance.

A `failed` status indicates the platform tried to reconcile the instance to running and surfaced a terminal error. A `stopped` status means the instance was explicitly stopped. An `unknown` status means the platform could not determine the instance's current state at all.

In each case, the next step is the same: inspect the pods and the operator's reconciliation events, identify the root cause, and start with the least destructive recovery — pod restart — before resorting to recreating the instance.

## Recovering a Stuck Instance

### Try a Pod Restart First

If the underlying pods are unhealthy but the instance record itself looks fine, restart the deployment before deleting anything. Scope the restart to the single workroom's instance using the `deployment-id` value you noted above — the namespace may host multiple Graphiti deployments, one per workroom, and restarting all of them would bounce unrelated workrooms:

```bash
kubectl rollout restart deployment -n kamiwaza -l extensions.kamiwaza.io/deployment-id=<deployment-id>
kubectl rollout status deployment -n kamiwaza -l extensions.kamiwaza.io/deployment-id=<deployment-id> --timeout=180s
```

Refresh the Graph tab once the rollout reports ready. If the instance returns to running, no further action is needed.

### Recreate the Instance

If a pod restart does not recover the instance — for example, the instance is in a terminal `failed` state, or the underlying configuration that produced it is no longer correct — an administrator can delete the instance and let the platform's auto-provisioner deploy a fresh one the next time the workroom is opened.

:::caution
Recreating a graph instance discards the graph data that was built up for the workroom. Sources will need to be re-ingested into the new instance before the Graph tab repopulates. Do not recreate an instance while a long-running ingestion is in flight unless you intend to redo it.
:::

Issue the following call against the Kamiwaza API gateway with an admin bearer token:

```bash
curl -X DELETE "https://<your-domain>/api/context/ontologies/<ontology-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workroom-ID: <workroom-id>"
```

`<your-domain>` is the host serving the Kamiwaza UI, and `<ontology-id>` is the workroom's current ontology id (see below for retrieval). The `X-Workroom-ID` header is optional per the OpenAPI spec but is the workroom-isolation header used by the surrounding API; include it on admin recovery calls so the operation stays scoped to the right workroom. The bearer token must belong to an account with administrative authority on the platform.

To retrieve the ontology id for a workroom, list its ontology instances via the same API. The endpoint accepts the same `X-Workroom-ID` header for scope:

```bash
curl "https://<your-domain>/api/context/ontologies/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workroom-ID: <workroom-id>"
```

The response payload includes each instance's `id` (the `ontology_id` referenced above), `status`, and runtime endpoint. Alternatively, the same payload backs the Graph tab in the UI — operators with browser access can read it from the network panel by opening the affected workroom's Graph tab.

After the delete completes, reload the Graph tab in the workroom; the empty state will return to **"No ontology instance"** (described above), and the auto-provisioner will create a fresh instance when the next admin or eligible user opens the workroom.

## What to Gather Before Reaching Out

If the steps above do not recover the Graph tab, share the following with Kamiwaza support or your platform team:

- **Workroom ID** — visible in the workroom URL.
- **Instance status string** — the value shown in the Graph tab empty state (for example, `pending`, `failed`).
- **Pod state** — output of `kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti -o wide`, plus `kubectl describe` for any pod that is not `Running`.
- **Correlation ID** — if you reached the **Graph unavailable** error state, the correlation ID it displays.
- **Approximate time** the issue began.

See [Help & Fixes](../help-and-fixes.md) for the broader set of Kamiwaza support channels.
