---
title: Kubernetes Tenant-Mode Inference
sidebar_label: Kubernetes Tenant-Mode Inference
description: Owner and tenant setup for classic Kubernetes resource allocation.
diataxis: how-to
audience: public
drafted_by: ai
---

# Kubernetes tenant-mode inference

:::warning Preview support
This page documents the classic Kubernetes tenant-mode inference contract for
the Kamiwaza 1.3.0 release target. It is a preview until the exact Kubernetes
version, driver, allocator, runtime image, and profile/catalog revisions have
been qualified together. Do not turn
the examples below into a support claim without target-specific evidence.
:::

Use this guide when you administer a tenant namespace on a customer-owned
Kubernetes cluster. The tenant release is namespaced and uses
owner-published profiles and catalogs; it does not inspect Nodes or install
cluster-scoped GPU infrastructure.

## Compatibility scope

The MVP qualification scope is Kubernetes 1.34 through 1.36. Qualification
for Kubernetes 1.28 through 1.33 is deferred to post-MVP follow-up (M4); the
original design range does not establish support. The classic allocation
classes are:

| Class | Kubernetes resource | Isolation statement |
| --- | --- | --- |
| CPU | `cpu` and memory requests | Kubernetes scheduler allocation |
| Whole NVIDIA GPU | `nvidia.com/gpu` | Whole-device allocation |
| Whole AMD GPU | `amd.com/gpu` | Whole-device allocation |
| NVIDIA MIG | Qualified `nvidia.com/mig-*` | Hardware partition, exact shape only |
| VRAM-plugin sharing | Owner-advertised `kamiwaza.ai/vram-gb-*` | Accounted sharing, not hard isolation |

An entry is qualified only when its owner profile, catalog, driver/device
plugin, runtime image digest, and Kubernetes version are recorded in live
evidence. DRA is a separate, additive track and is not required for this
classic path.

## Ownership boundary

The cluster owner supplies drivers, device plugins, optional VRAM sharing,
RuntimeClasses, quotas/policy, signed Compute Profiles, and immutable recipe
catalogs. The tenant supplies only namespaced Helm and serving inputs.

Kubernetes namespace-admin permissions do not grant the Kamiwaza `admin` role.
Model deployment through the API, SDK, or UI remains Kamiwaza-admin-only.

The tenant chart creates no cluster-scoped GPU resource and must not require
`nodes/get`, `nodes/list`, or `nodes/watch`. A profile or allocator failure is
reported as a failure; the platform does not silently fall back to CPU or a
weaker isolation class.

## Owner publication

Publish a new immutable catalog revision for every change. Never mutate an
existing ConfigMap name in place. Run the following commands from the
owner-provided Kubernetes setup checkout containing
`scripts/render-inference-recipe-catalog.py`. Prepare the owner-reviewed
`gpu-recipes.json`, set `TENANT_NAMESPACE` to the existing tenant namespace,
and install Python 3, `jq`, and `kubectl`. The renderer emits a JSON ConfigMap
manifest; it does not contact the cluster or sign a Compute Profile:

```bash
python3 scripts/render-inference-recipe-catalog.py \
  --catalog gpu-recipes.json \
  --namespace "$TENANT_NAMESPACE" \
  --capability gpu > gpu-catalog.json

kubectl apply --dry-run=server -f gpu-catalog.json
kubectl apply -f gpu-catalog.json
export GPU_CATALOG_CONFIGMAP="$(jq -r '.metadata.name' gpu-catalog.json)"
export GPU_CATALOG_SHA256="$(jq -r '.metadata.annotations["kamiwaza.ai/catalog-sha256"]' gpu-catalog.json)"
```

Use `--capability cpu` for a CPU catalog. Record the full catalog digest and
retain the previous revision until every consumer has rolled out and passed
qualification. Roll back by selecting the previous immutable name; clean up a
failed new revision only after confirming no workload references it.

The owner profile binds a logical request to an exact classic resource and
runtime. The following excerpts are illustrative inputs; complete each signed
profile with its binding ID, architecture, capacity, node selector, compatible
variant IDs, and digest-pinned runtime image before publication:

```json
{
  "profiles": [
    {
      "name": "cpu-standard",
      "capability": "cpu",
      "guarantees": [],
      "compatibleVariantIds": ["llamacpp-cpu-v1"],
      "bindings": [{
        "id": "cpu-default",
        "allocator": "cpu",
        "architecture": "amd64",
        "capacity": {"kind": "scheduler"},
        "nodeSelector": {"kubernetes.io/arch": "amd64"},
        "runtime": {
          "kind": "cpu",
          "variantId": "llamacpp-cpu-v1",
          "image": "registry.example/llamacpp@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }
      }]
    },
    {
      "name": "nvidia-whole",
      "capability": "gpu",
      "guarantees": ["whole-device"],
      "bindings": [{
        "allocator": "extended-resource",
        "resource": {"name": "nvidia.com/gpu", "quantity": 1},
        "runtime": {"kind": "cuda", "variantId": "llamacpp-cuda-v1"}
      }]
    },
    {
      "name": "amd-whole",
      "capability": "gpu",
      "guarantees": ["whole-device"],
      "bindings": [{
        "allocator": "extended-resource",
        "resource": {"name": "amd.com/gpu", "quantity": 1},
        "runtime": {"kind": "rocm", "variantId": "llamacpp-rocm-v1"}
      }]
    },
    {
      "name": "nvidia-mig-2g-10gb",
      "capability": "gpu",
      "guarantees": ["mig"],
      "bindings": [{
        "allocator": "extended-resource",
        "resource": {"name": "nvidia.com/mig-2g.10gb", "quantity": 1},
        "runtime": {"kind": "cuda", "variantId": "llamacpp-cuda-v1"}
      }]
    },
    {
      "name": "nvidia-vram-share",
      "capability": "gpu",
      "guarantees": ["accounted-share"],
      "bindings": [{
        "allocator": "vram-plugin",
        "resource": {"name": "kamiwaza.ai/vram-gb-gpu-0", "quantity": 1},
        "runtime": {"kind": "cuda", "variantId": "llamacpp-cuda-v1"}
      }]
    }
  ]
}
```

The NVIDIA, AMD, MIG, and VRAM-plugin excerpts require the same omitted signed
profile fields as the CPU example. `accounted-share` reserves a bookkeeping
bucket; it does not provide hard VRAM or compute isolation.

## Tenant Helm configuration

Point the namespaced release at the exact owner revisions and digest-pinned
runtime/profile inputs. The values are illustrative; use the chart version and
profile names qualified for your cluster:

```yaml
core:
  inferenceResources:
    enabled: true
    bundleConfigMap: kamiwaza-inference-profiles-revision
    gpuRecipeCatalogConfigMap: kamiwaza-inference-gpu-revision
    cpuRecipeCatalogConfigMap: kamiwaza-inference-cpu-revision
    # Owner-qualified staging inputs are immutable digests, not mutable tags.
    gpuRegistry: registry.example/models
    gpuStagingImage: registry.example/model-fetch@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    cpuRegistry: registry.example/models
    cpuStagingImage: registry.example/model-fetch@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    schedulingTimeoutSeconds: 300
```

For a restricted tenant, the corresponding API/SDK request names the logical
profile and capability rather than a Node or a provider-specific inventory:

```json
{
  "inferenceResources": {
    "schemaVersion": 1,
    "accelerator": {
      "capability": "gpu",
      "count": 1,
      "memory": {"minimum": "1Gi"},
      "isolation": "any-qualified",
      "profile": "nvidia-whole"
    },
    "runtime": {"selection": "automatic"}
  }
}
```

For `cpu-standard`, use the CPU request shape instead:

```json
{
  "inferenceResources": {
    "schemaVersion": 1,
    "cpu": {
      "architecture": "amd64",
      "requests": {"cpu": "2", "memory": "4Gi"}
    },
    "runtime": {"selection": "automatic"}
  }
}
```

Do not add Node names, Node selectors owned by the tenant, or cluster-scoped
resources to the tenant request.

## Verify, upgrade, and recover

Before invoking the endpoint, verify all of the following:

1. The ConfigMap annotation `kamiwaza.ai/catalog-sha256` equals the recorded
   catalog digest.
2. Scheduler and Ray components mount the selected immutable catalog revision.
   Serving Pods run the runtime image digest selected from the owner-qualified
   profile/catalog, with the qualified model-staging image where required.
3. Pod resource requests contain the expected `cpu`, `nvidia.com/gpu`,
   `amd.com/gpu`, qualified MIG, or VRAM-plugin resource.
4. The allocation verification condition is present and the serving endpoint
   is ready; readiness alone is not proof of the requested grant.
5. The tenant identity has no Node-read permission and no cluster-scoped
   objects were emitted by the tenant release.

For an upgrade, publish a new profile/catalog revision, sync the namespaced
release, wait for every consumer rollout, and repeat the digest and allocation
checks. For rollback, select the previous immutable revisions. If a create,
readiness, authorization, or deadline step fails, the platform marks the
allocation failed and removes only resources owned by that attempt; preserve
the prior known-good workload until the replacement is qualified.

## Support status

This page is a public owner reference, not evidence of qualification. A support
claim requires exact-head implementation checks and live evidence for the
declared Kubernetes/version, driver, allocator, runtime, profile, and catalog
combination. Unsupported combinations must remain explicitly unsupported.
