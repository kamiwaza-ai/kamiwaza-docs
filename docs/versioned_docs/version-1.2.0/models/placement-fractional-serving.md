---
title: Fractional GPU Serving
sidebar_label: Fractional GPU Serving
---

Fractional GPU serving lets multiple models share one GPU, each with its own reserved memory budget. Instead of claiming a whole card, a deployment reserves the number of gigabytes it is estimated to need; the remaining capacity stays available for other models. This page explains when fractional serving applies, how the budgeting works, and how to read the error you get when a model does not fit.

## When fractional serving applies

Fractional serving is governed by the [hardware class](./placement-hardware-classes.md) of the GPU:

| Hardware | Fractional? | How sharing works |
|---|---|---|
| Discrete GPU without partitioning (T4, L4, A100/H100 with MIG disabled) | Yes | Per-GPU memory budgets in GB |
| Unified memory (Apple Silicon, Strix Halo, DGX Spark) | Yes | Budget against the shared system memory pool |
| MIG / hardware partitions | No | One model per partition; the partition itself is the unit of sharing |
| Any GPU with fractional placement disabled | No | Whole-GPU exclusive — one model per card |

Fractional placement is enabled by default. Installations with stricter compliance requirements can disable it at install time with the Helm value `placement.vramPluginV2.enabled=false` on the placement-operator chart, which falls back to whole-GPU exclusive placement: the first model claims the card, and a second model on the same card fails with reason `insufficient_capacity`.

## How the VRAM budget works

When you deploy a model, Kamiwaza estimates its memory footprint — weights, context/KV cache, and per-deployment overhead. (The SDK exposes this same estimator as `client.serving.estimate_model_vram()` if you want to preview a deployment request's footprint.)

The estimate becomes a reservation against a specific GPU. Each GPU on a node exposes its capacity as a per-device resource named `kamiwaza.ai/vram-gb-gpu-<i>` (where `<i>` is the GPU index), measured in GB. Kubernetes enforces these budgets when the model is scheduled, so an over-budget model is refused **before** anything starts — it is never left half-running or silently pending.

Details worth knowing:

- **One budget per physical GPU.** A node with four cards exposes four independent budgets (`...-gpu-0` through `...-gpu-3`); each model lands on exactly one card's budget.
- **Unified-memory machines expose a single budget** (`kamiwaza.ai/vram-gb-gpu-0`) sized to the shared memory pool, since the CPU and GPU draw from the same pool.
- **Unified-memory machines hold back an 8 GiB operating-system reserve** from the shared pool before the budget is advertised, so deployments cannot starve the host. Discrete-GPU budgets are sized to the card's detected VRAM.

On a standalone cluster you can see the advertised budgets directly:

```bash
kubectl get node <node-name> -o jsonpath='{.status.allocatable}' | tr ',' '\n' | grep vram-gb-gpu
```

## Example: packing models on one GPU

A 16 GB NVIDIA T4 with two 6 GB models:

1. Deploy model A (estimated 6 GB). It reserves 6 GB on `gpu-0`. Remaining budget ≈ 10 GB.
2. Deploy model B (estimated 6 GB). It fits the remaining budget and lands on the same card. Both deployments reach `DEPLOYED` and serve traffic concurrently.
3. Deploy model C (estimated 6 GB). The remaining budget (≈ 4 GB) is too small. The deployment fails fast with the structured no-fit reason `insufficient_capacity` — no pending pod, no partial deployment.

On a node with mixed cards (say, an 8 GB and a 24 GB GPU), placement picks a card whose remaining budget fits the request, so a 10 GB model goes to the 24 GB card even if the 8 GB card is idle.

## Models larger than one GPU

A model whose footprint exceeds any single GPU can be deployed with tensor parallelism across multiple GPUs **on one node**: the request reserves a per-shard budget on each of N cards. If no node has N GPUs with enough free capacity, the request is rejected with `insufficient_gpu_count`. Multi-node parallelism is not supported in this release.

## What a NoFit error means

The deploy API is asynchronous: it accepts the request and returns the deployment ID immediately. When no eligible GPU (or set of GPUs) can satisfy the request, the deployment then fails fast — before any pod is created — instead of sitting pending. The deployment shows status `FAILED` with `last_error_code` set to `NoFitError` and the no-fit reason recorded in `last_error_message`. (When deploying through the SDK with the default `wait=True`, this surfaces as a `DeploymentFailedError`; see the [Placement Deployment Guide](./placement-deployment-guide.md#deploy-a-model-with-the-sdk).)

The reason tells you why the model did not fit:

| Reason | Meaning | Common causes and what to do |
|---|---|---|
| `insufficient_capacity` | No single GPU (or partition) has enough free budget for the request | The model is too large for the hardware, or other deployments hold the budget. Choose a smaller or more quantized variant, reduce context length, or stop an unused deployment. |
| `insufficient_system_memory` | Unified-memory budget exhausted | The shared memory pool is fully reserved. Stop another deployment or pick a smaller model. |
| `insufficient_gpu_count` | A tensor-parallel request needs N GPUs but no node has N free | Lower the tensor-parallel size or free GPUs on a multi-GPU node. |
| `vendor_mismatch` | The selected engine requires a GPU vendor the cluster does not have | For example, an engine that requires CUDA on an AMD-only cluster. Pick a model/engine variant that matches your hardware. |
| `accel_version_unmet` | No node satisfies the engine's minimum accelerator version (for example, a required CUDA version) | Upgrade GPU drivers, or choose an engine/model variant built for your driver generation. |
| `sharing_not_configured` | A managed cluster has no GPU sharing configured and the model cannot fit as whole-GPU | Ask your cluster admin to enable a sharing strategy, or free a GPU. |

## Limits to know

Fractional budgets are **reservations, not real-time meters**:

- Budgets track what Kamiwaza deployments have reserved. Memory used by non-Kamiwaza processes on the same GPU or host is not tracked, so a model that fit at scheduling time can still hit an out-of-memory error at load time if something else consumed the memory — surfaced on the deployment as error code `OOM` (see [troubleshooting](./placement-deployment-guide.md#troubleshooting)).
- The serving engines self-limit to their allocation (for example, vLLM's GPU memory utilization setting), but enforcement is cooperative on shared cards.
- Models sharing a GPU share compute and fault domains: there is no performance or crash isolation between them. If you need hard isolation, use hardware partitioning ([hardware-isolated class](./placement-hardware-classes.md#hardware-isolated)).

## See also

- [Model Placement Overview](./placement-overview.md) — why coexistence matters
- [GPU Hardware Classes](./placement-hardware-classes.md) — which hardware gets which primitive
- [Placement Deployment Guide](./placement-deployment-guide.md) — deploying multi-model setups step by step
- [Model Deployment Troubleshooting](./troubleshooting.md) — general deployment issues
