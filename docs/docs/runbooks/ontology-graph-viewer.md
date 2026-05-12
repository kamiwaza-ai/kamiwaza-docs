---
id: ontology-graph-viewer
title: Ontology Graph Viewer Runbook
sidebar_label: Ontology Graph Viewer
sidebar_position: 1
---

# Ontology Graph Viewer Runbook

Troubleshooting guidance for the **Graph** tab in a workroom when the ontology graph viewer shows an empty or degraded state. The Graph tab links here from its **View runbook** button when the graph instance is in an idle, pending, or otherwise non-running state.

## Symptoms

You opened the **Graph** tab in a workroom and saw one of:

- **"Knowledge graph is being set up"** with a spinner and a **View runbook** link.
- **"Graph instance idle"** with an instance status such as `pending`, `stopped`, `failed`, or `unknown`.

The graph viewer is gated on a healthy ontology instance backing the workroom. When the instance has not yet reached a running state, or has fallen out of one, the viewer surfaces an empty state with a link to this page.

## Common causes

### Auto-provisioner still running

When a workroom is first opened (or after a long idle period), an auto-provisioner deploys the underlying graph database for the workroom. The typical end-to-end time is around 30 seconds, but image pulls, node scheduling, and dependency readiness can extend it.

The UI polls instance status every 5 seconds for up to 60 seconds. After that cap, polling stops to avoid hammering the API, and the runbook link is surfaced as the recovery path.

### Provisioner finished but instance is not running

The instance was provisioned at some point but is no longer `running`. Common reasons:

- The underlying pod was evicted or restarted and has not yet become ready.
- A dependency (e.g. the embedding service) is unavailable, so the provisioner marked the instance `failed`.
- The instance was deliberately stopped to free resources.

### Backend dependency unreachable

The Graphiti ontology backend depends on its own Neo4j store. If the configured Neo4j endpoint isn't reachable (network policy, wrong endpoint configured, credentials mismatch, the Neo4j pod itself unhealthy), the readiness check never passes and the instance stays `pending`.

## Diagnostic steps

Work through these in order, stopping as soon as one resolves the issue.

1. **Wait for the typical provisioning window.** If the empty state copy reads "Knowledge graph is being set up", give it 60–90 seconds total before treating it as stuck. Most healthy provisions complete inside that window.

2. **Refresh the Graph tab.** A page reload re-issues the instance status query and re-arms the 60-second auto-poll. If the instance has since flipped to `running` in the background, the viewer will pick it up.

3. **Check the underlying pods from kubectl.**

   The Graphiti ontology backend is deployed by the Kamiwaza extension operator, which labels pods with `extensions.kamiwaza.io/name`. From a shell with `kubectl` access to the cluster running Kamiwaza:

   ```bash
   kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti
   ```

   The same query with `--show-labels` is useful for confirming the deployment is the one you expect:

   ```bash
   kubectl get pods -n kamiwaza -l extensions.kamiwaza.io/name=service-graphiti --show-labels
   ```

   Pods in `Pending` or `CrashLoopBackOff` for more than a few minutes indicate a deployment-level problem. `kubectl describe pod <name>` and `kubectl logs <name>` will narrow it down (image pull failure, missing secret, OOM, the Neo4j sidecar failing to start, etc.).

4. **Verify the Neo4j backend is reachable.** The Graphiti instance depends on its Neo4j store. If the Neo4j pod is not running, or if the endpoint configured for the Graphiti instance points at something unreachable, the instance status stays `pending` indefinitely. Inspect the Neo4j pod's status with the same selector above and check the Graphiti pod's logs for connection errors.

5. **Recreate the ontology instance.** If the underlying pod is stuck in a failure state, an admin can delete the instance and let the auto-provisioner create a fresh one. The Graph tab will return to the **No ontology instance** state on next load, and the **Create ontology instance** CTA will provision a new instance:

   ```
   DELETE /context/ontologies/{ontology_id}
   ```

   Issue this call with admin credentials; the workroom's current `ontology_id` is visible in the instance status payload that backs the Graph tab.

6. **Check the embedding service.** Graph ingestion depends on the embedding service. If embeddings are returning HTTP 403 or are otherwise unreachable, downstream pipelines may mark the instance unhealthy. Verify the embedding service is deployed, healthy, and that its credentials are valid for the workroom's tenant.

## Getting help

If the above steps do not recover the graph viewer, gather the following before reaching out:

- The workroom ID.
- The instance status string visible in the Graph tab empty state (e.g. `pending`, `failed`).
- Output of `kubectl get pods -n kamiwaza` filtered to the ontology component, plus `kubectl describe` and recent `kubectl logs` for any non-ready pod.
- Any correlation ID surfaced by the **Graph unavailable** error state, if you reached it.

See the [Help & Fixes](../help-and-fixes.md) page for community and support channels.
