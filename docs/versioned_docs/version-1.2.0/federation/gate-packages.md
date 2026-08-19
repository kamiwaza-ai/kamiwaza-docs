---
sidebar_position: 5.5
title: Gate Packages
drafted_by: ai
ai_review_status: pending
---

# Gate Packages

Gate packages let you install custom **ExecutionGate** and **AttributeGate** classes onto a paired cluster from a Python package index — without rebuilding the platform image. This capability is available in Kamiwaza 1.2.0.

A gate package is an ordinary Python package whose modules contribute one or more gate classes (subclasses of `ExecutionGate` or `AttributeGate`). The cluster's `kz.gates.packages` API (Python module: `kamiwaza_sdk.gates.packages`) installs the package into an isolated per-package directory, makes its classes reachable from `kz.gates.discover`, and persists the install record. The classes are then bindable via the existing `cluster.set_execution_gate(...)` and `datasets.set_gate(...)` APIs covered in [Execution Gates](./execution-gates.md).

:::info AI-drafted content
This page was drafted with AI assistance and is pending human review. Specific behavioral claims are verifiable against the canonical design at [`docs/specifications/core/federation-api-and-sdk/design.md`](https://github.com/kamiwaza-internal/kamiwaza-docs-engineering-internal/blob/main/docs/specifications/core/federation-api-and-sdk/design.md) §6.2 WS-M5. Procedural code examples are derived directly from the M5 smoke playbook.
:::

## When to use this

Use gate packages when:

- You need to apply policy logic (clearance gating, attribute mapping, tier-based access) that lives in code your team owns
- You want to ship that policy without forking or rebuilding the Kamiwaza platform image
- Your gate class implements either the `ExecutionGate` protocol (cluster-scoped job authorization) or `AttributeGate` protocol (dataset-scoped attribute resolution)

Don't use gate packages for:

- General-purpose application code — gate packages are isolated to the gate runtime and don't have access to the broader application context
- Policy that's already expressible via standard ReBAC relations — use those directly via the `subjects` and `datasets` APIs instead

## Lifecycle overview

```
install ─▶ discover ─▶ bind ─▶ (job submit / dataset access) ─▶ replace ─▶ uninstall
                                                                 │
                                                                 └─ atomic in-place
                                                                    (no unbound-gate window)
```

Each lifecycle action is an SDK call:

| Action | SDK call | Required permission |
|--------|----------|--------------------|
| Install | `kz.gates.packages.install(spec, hash_digest=..., index_url=...)` | admin |
| List installed | `kz.gates.packages.list()` | admin |
| Get one | `kz.gates.packages.get(name)` | admin |
| Atomic replace | `kz.gates.packages.replace(name, new_spec, hash_digest=..., index_url=...)` | admin |
| Uninstall | `kz.gates.packages.uninstall(name)` | admin (refused if any active binding references the package's classpaths) |
| Discover a class | `kz.gates.discover(classpath)` | viewer or above |
| Bind as ExecutionGate | `kz.cluster.set_execution_gate(type=..., config=...)` | admin |
| Bind as AttributeGate | `kz.datasets.set_gate(urn=..., type=..., config=...)` | admin |

## Installing a gate package

```python
from kamiwaza_sdk import KamiwazaClient

kz = KamiwazaClient(base_url="https://kamiwaza.example.com/api")

# Hash-pin to the exact wheel you've verified out-of-band.
# pip refuses installs whose downloaded artifact doesn't match.
result = kz.gates.packages.install(
    "acme-gates==1.0.0",
    hash_digest="sha256:<sha256-of-the-wheel>",
    index_url="https://pypi.example.com/simple",
)
print(result.package.name, result.package.version)
print(result.package.classpaths)  # ['acme_gates.gate.AcmeAttributeGate', ...]
```

The install path:

1. Resolves the wheel from `index_url` (any PEP 503 simple index is acceptable, including PyPI, a private mirror, or a local file index served over HTTP)
2. Validates the SHA-256 digest against the supplied `hash_digest` via `pip install --require-hashes` — if pip can't verify, install fails before any files are written
3. Installs into a per-package directory under the gate-packages PVC (mounted on the Ray head, the scheduler, and the API server pods)
4. Scans the installed package for `ExecutionGate`/`AttributeGate` subclasses and records the resulting classpaths in the `cluster_gate_packages` table
5. Extends the API server's classpath allowlist and `sys.path` so `kz.gates.discover` sees the new gate immediately

## Discovering and binding

Once installed, the gate classpath is reachable via discover:

```python
gate = kz.gates.discover("acme_gates.gate.AcmeAttributeGate")
print(gate.name, gate.kind, gate.config_schema)
```

Bind as a cluster `ExecutionGate` (if the class implements that protocol) or as a per-dataset `AttributeGate` (if the class implements that protocol). The same APIs work whether the class came from a built-in module or an installed gate package — there's no separate binding path for installed gates.

## Atomic replace

Replace updates the package in place without leaving a window where the bound gate class is unimportable. The platform installs the new version into a staging sibling directory, validates that the new version's classpath set is a *superset* of the old version's bound classpaths, then performs a two-rename POSIX swap.

```python
result = kz.gates.packages.replace(
    "acme-gates",
    "acme-gates==1.0.1",
    hash_digest="sha256:<sha256-of-the-new-wheel>",
    index_url="https://pypi.example.com/simple",
)
```

If the new version drops a classpath that's currently bound, the replace is refused with `GatePackageClasspathDropError` and the live tree is unchanged. This is the **classpath-superset guarantee**: an actively-bound gate can never be silently removed by an upgrade.

## Hash-mismatch refusal

The platform refuses an install or replace whose downloaded artifact doesn't match the supplied hash:

```python
from kamiwaza_sdk.exceptions import GatePackageHashMismatchError

try:
    kz.gates.packages.replace(
        "acme-gates",
        "acme-gates==1.0.1",
        hash_digest="sha256:" + "0" * 64,  # wrong on purpose
        index_url="https://pypi.example.com/simple",
    )
except GatePackageHashMismatchError as exc:
    print(exc.body["detail"])
```

The refusal is enforced by pip's `--require-hashes` mode; the platform doesn't compute or trust a separately-derived hash. The live tree is untouched.

## Uninstall

```python
kz.gates.packages.uninstall("acme-gates")
```

The uninstall path checks for active bindings: any cluster `ExecutionGate` or per-dataset `AttributeGate` whose classpath matches one contributed by the package will cause the uninstall to refuse with `GatePackageUninstallBlockedError`, naming the bound classpath(s). Unbind the gate first, then retry.

## Security model

The gate-packages feature ships with several boundaries:

- **Hash pinning** is required on every install and replace. The platform does not allow unhashed installs.
- **Admin-only API**: the install/replace/uninstall endpoints require the `admin` role on the local cluster. Federation peers cannot install gate packages remotely.
- **NetworkPolicy isolation**: when the optional top-level chart value `workerNetworkPolicy.enabled` is set to `true`, the Ray worker pods running gate code are blocked from arbitrary internet egress. The Ray head pod has a similar policy under the top-level `rayHeadNetworkPolicy.enabled`. Both are opt-in; default off. (Note the chart keys are top-level, not nested under `worker.networkPolicy` or `rayHead.networkPolicy` — a common operator override mistake that silently no-ops.)
- **Audit trail**: every install/replace/uninstall emits a `gate_package_lifecycle` audit event with `actor`, `action`, `name`, `version`, `hash_digest`, and (for replace) `prior_hash`.

## Limits and trade-offs

- A gate-package install affects the local cluster only. Federated peers must install the same package on their side if they want to bind it locally.
- The classpath-superset guarantee means rollback to an older package version is an *install* (of the older version) plus an *unbind/rebind*, not an automatic operation. Plan upgrades to be additive when possible.
- The PVC backing gate-packages-venv ships **disabled by default** (`authz.gatePackages.pvc.enabled: false` in the platform chart) — operators must explicitly opt in before any gate-package install will succeed. Once enabled, the PVC falls through to `ReadWriteOnce`, which is sufficient on single-node clusters. Multi-node clusters must override **both** `authz.gatePackages.pvc.accessModes` to `[ReadWriteMany]` AND `authz.gatePackages.pvc.storageClassName` to a RWX-Filesystem class (CephFS / NFS / similar) — overriding only one silently no-ops. See your install team's helm overrides documentation.

## Reference

- **APIs:** see [API Reference](./api-reference.md) for the exact request/response shapes.
- **Source design:** [Federation API + SDK MVP — System Design](https://github.com/kamiwaza-internal/kamiwaza-docs-engineering-internal/blob/main/docs/specifications/core/federation-api-and-sdk/design.md) §6.2 WS-M5.
- **Smoke playbook (operators):** [`m5-gate-packages-smoke.md`](https://github.com/kamiwaza-internal/kamiwaza-docs-engineering-internal/blob/main/docs/mesh-v1.0.0/demos/m5-gate-packages-smoke.md) walks the full install → discover → atomic-replace → refusal scenarios → uninstall sequence end-to-end.
