---
sidebar_position: 5
title: Execution Gates (Federated Authz)
---

# Execution Gates

The federated job service on the receiving cluster consults a pluggable
**execution gate** before dispatching any job to Ray. The gate decides whether
this user is allowed to run jobs on this cluster, independent of what data
the job will read. Record-level filtering — "what columns and rows can this
user see once the job runs?" — is handled separately by per-dataset attribute
gates (see the retrieval docs).

This page covers the operator-facing surface: what the default behavior is,
how to configure a policy, and how to diagnose 403 responses on federated
job submissions.

## Default behavior

An Execution Gate is a cluster-wide resource, set in one place per cluster.
When no gate is configured, the platform applies **source-scoped default
policy**:

| Submission source | Default when unconfigured | Reason code |
|---|---|---|
| `local` (same-cluster authenticated user) | **ALLOW** | `no_execution_gate_configured_local_allowed` |
| `mesh` (arrived via federation peer) | **DENY (403)** | `no_execution_gate_configured_for_mesh` |

Local submissions preserve the pre-feature behavior of single-cluster clusters.
Mesh submissions — the new cross-cluster surface — are denied until an
operator explicitly declares the cluster's policy. This prevents a forgotten
configuration from silently accepting federated work.

## Configuring a gate

Execution gates live in the cluster's runtime configuration, which is rendered
into the `core-runtime-config` ConfigMap by the Helm chart. The knob is
exposed as `core.authz.executionGate.{type, config}` in chart values.

### Quick start: permit all mesh submissions

If your cluster's security posture is "accept all authenticated federated
submissions" (for example, a dev cluster or a single-tenant deployment), set
the classpath to the shipped allow-all gate. Add this to your
`cluster/values/overrides.yaml`:

```yaml
core:
  authz:
    executionGate:
      type: kamiwaza.services.authz.gates.default_gates.AllowAllExecutionGate
      config: {}
```

Then `helmfile sync` (or `make install` / `make dev-*` as appropriate). The
scheduler picks up the new ConfigMap on restart and the default mesh-deny
policy is replaced with the explicit allow-all decision.

### Installing a site-specific policy

For clusters with a real policy — clearance gating, tenant isolation, program
compartments, etc. — point at your own gate classpath:

```yaml
core:
  authz:
    executionGate:
      type: acme_sec.policy.ClearanceExecutionGate
      config:
        min_clearance: C
        require_authenticated: true
```

Requirements for the classpath:

- The module must be importable from inside the scheduler pod. Bake it into
  the scheduler image or mount it via a sidecar. The platform does **not**
  ship site-specific gates.
- The class must subclass `kamiwaza.services.authz.gates.ExecutionGate` and
  implement `name` (property), `required_attributes()`, and `authorize()`.
- The `config` dict is passed to the gate at load time and remains fixed for
  the lifetime of the scheduler pod.

Gate authors' guide: see the Kamiwaza Agent SDK docs for the
`AttributeGate` / `ExecutionGate` plugin authoring interface.

### Env var override (ad-hoc testing)

For one-off testing or debugging without a Helm rollout, you can set the env
var directly on the scheduler pod:

```bash
kubectl set env deployment/core-scheduler -n kamiwaza \
  AUTHZ_EXECUTION_GATE='{"type":"kamiwaza.services.authz.gates.default_gates.AllowAllExecutionGate","config":{}}'
```

The value is a JSON string. `RuntimeConfig.get_config("authz.execution_gate")`
reads the flat key from local settings first, then falls back to the env var.

Env var overrides are ephemeral — the next Helm sync restores the ConfigMap's
value.

## Verifying the active gate

Inspect the rendered runtime config:

```bash
kubectl get configmap core-runtime-config -n kamiwaza \
  -o jsonpath='{.data.runtime_config\.json}' | python3 -m json.tool | grep -A3 authz.execution_gate
```

Expected when a gate is configured:

```json
"authz.execution_gate": {
    "type": "kamiwaza.services.authz.gates.default_gates.AllowAllExecutionGate",
    "config": {}
}
```

The key is **omitted entirely** when unconfigured — `grep` will return
nothing. That is the correct state for the "default mesh-deny" posture.

The scheduler logs the active gate's decision on every federated job submit:

```
INFO  kamiwaza.cluster.jobs.gate_runner  Execution gate allow_all_execution_gate
      decision: allow (reason=default_allow_all)
```

## Troubleshooting

### 403 on a federated job submit

The API returns a structured body with the gate's reason code:

```json
{
  "detail": {
    "reason": "no_execution_gate_configured_for_mesh",
    "gate": "(unconfigured)"
  }
}
```

Common reason codes:

| `reason` | Meaning | Fix |
|---|---|---|
| `no_execution_gate_configured_for_mesh` | Receiving cluster has no execution gate set and the default policy denies mesh submissions. | Configure `core.authz.executionGate.type` on the receiving cluster. |
| `gate_load_error` | Configured classpath cannot be imported. | Check the scheduler pod logs for the ImportError; ensure the plugin module is reachable. |
| `gate_exception` | The gate's `authorize()` method raised. | Check the scheduler logs for the traceback; fix the gate or unset the config to revert to defaults. |
| _(site-specific)_ | Reason strings beyond the ones above come from the configured gate itself (e.g., `clearance_insufficient`, `tenant_mismatch`). | Look at the gate's own docs for the reason vocabulary. |

### Gate takes effect on which pods?

The ExecutionGate is loaded by the scheduler process that handles the
`/cluster/jobs/submit` endpoint. Restart the scheduler to pick up a new
configuration:

```bash
kubectl rollout restart deployment/core-scheduler -n kamiwaza
```

Ray worker pods do not evaluate the gate — it runs once per submit at the
control plane, before Ray sees the job.

### Gate configured but local submissions still bypass

That is correct behavior. Local submissions (from same-cluster authenticated
users) also run through the configured gate — if your gate `authorize()`
method returns ALLOW for them, they pass. If you want the gate to be the sole
gatekeeper for both local and mesh, your gate's `authorize()` should inspect
`job_spec["source"]` and apply identical rules to both. The platform's
*default* policy is source-scoped only when no gate is configured.

## See also

- [Operations & Troubleshooting](./operations.md) — general federation ops
  runbook, including federation-pair setup and diagnostic queries.
- [Federated Job Submission](./job-submission.md) — the client side of the
  `/cluster/jobs/` API.
- [Federation API Reference](./api-reference.md) — full endpoint reference.
