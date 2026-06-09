---
title: Placement Deployment Guide
sidebar_label: Placement Deployment Guide
---

Placement is automatic — deploying a model with placement is the same deploy flow you already use. This guide shows how to deploy multiple models onto shared GPUs, read where each deployment landed, and troubleshoot placement problems.

For background on how placement decides, read the [Model Placement Overview](./placement-overview.md) and [Fractional GPU Serving](./placement-fractional-serving.md).

## Before you start

- A model downloaded and ready to deploy. See [Downloading Models](./downloading-models.md).
- A rough sense of the model's memory footprint versus your hardware. The UI shows VRAM guidance per variant; the SDK exposes `estimate_model_vram`.
- On a managed cluster: the NVIDIA or AMD GPU Operator installed by your cluster admin. If no sharing strategy is configured, deployments still work but density is limited to one model per GPU (see [SharingNotConfigured](#a-sharingnotconfigured-notice-appears) below).

## Deploy a model in the UI

1. Navigate to the **Models** page and select the model.
2. Click **Deploy**. In Novice Mode, Kamiwaza picks a platform-appropriate variant with sensible defaults; in Advanced Mode you can select the engine and parameters yourself. See the [GUI Walkthrough](./gui-walkthrough.md).
3. Kamiwaza estimates the model's footprint, picks a GPU (or memory pool) with enough free budget, and starts the deployment. No placement input is required.
4. Watch the status move through `DEPLOYING` and `INITIALIZING` to `DEPLOYED`. The statuses are described in [Model Deployment](./deployment.md#deployment-lifecycle-statuses).

To run a second model on the same hardware, just deploy it the same way. If the combined budgets fit, both models run side by side; if not, the second deploy is rejected immediately with a [NoFit error](./placement-fractional-serving.md#what-a-nofit-error-means).

## Deploy a model with the SDK

```python
from kamiwaza_sdk import KamiwazaClient

client = KamiwazaClient(base_url="https://<your-host>/api")

# Deploy by model ID (a model already in your catalog) or by Hugging Face repo ID.
# Placement is automatic; the default model configuration is used unless you
# pass m_config_id or other deployment parameters.
deployment_id = client.serving.deploy_model(model_id=model_id)

status = client.serving.get_deployment_status(deployment_id)
```

A request that cannot be placed fails synchronously with HTTP 409 and the structured no-fit envelope — catch it and read the `reason` field rather than polling for a deployment that will never start.

## Monitor placement

Open a deployment's details to see where it landed:

| Field | Meaning |
|---|---|
| `topology` | `managed_cluster` or `standalone_cluster` (macOS installs show the standalone topology with the `metal_spawner` sharing class) |
| `node_name` | The node the model was placed on |
| `gpu_index`, `gpu_vendor` | Which GPU on the node, and its vendor |
| `hardware_class` | `hardware_isolated`, `software_shared`, or `unified_memory` — see [GPU Hardware Classes](./placement-hardware-classes.md) |
| `sharing_class` | How the device is shared, for example `mig_2g_20gb`, `whole_gpu`, `unified_memory`, `metal_spawner` |
| `allocated_capacity_mb` | The memory budget reserved for this deployment |

## Verify

1. Confirm each deployment shows `DEPLOYED` in the UI.
2. Send a short test prompt to each deployment's endpoint (shown in the UI).
3. If you deployed multiple models to one GPU, confirm both respond — they are serving concurrently from the same card.

## Troubleshooting

### The deploy request is rejected immediately (HTTP 409)

This is placement telling you the model does not fit anywhere, before anything starts. Read the `reason` field in the response — the [NoFit reference table](./placement-fractional-serving.md#what-a-nofit-error-means) lists every reason with common causes and fixes. The quick version:

- `insufficient_capacity` / `insufficient_system_memory` — pick a smaller or more quantized variant, reduce context length, or stop an unused deployment to free budget.
- `vendor_mismatch` / `accel_version_unmet` — the engine does not match your hardware or driver generation; pick a matching variant.
- `insufficient_gpu_count` — lower the tensor-parallel size or free GPUs on a multi-GPU node.
- `sharing_not_configured` — ask your cluster admin to enable GPU sharing; the error includes a runbook link.

### A SharingNotConfigured notice appears

On a managed cluster where the GPU Operator is installed but no sharing strategy is configured, deployments succeed as whole-GPU and carry a `SharingNotConfigured` notice. This is informational: density is limited to one model per GPU until your cluster admin enables a sharing strategy (such as time-slicing or MIG). The notice clears on its own once sharing is configured.

### The deployment reaches ERROR or FAILED after placement

Placement succeeded, but the model failed at runtime. The deployment record carries three fields that tell you what happened:

- **`last_error_code`** — a short classifier such as `OOM`, `CUDA_ERROR`, `MODEL_LOADING_FAILURE`, `CONTAINER_EXITED`, or `STARTUP_TIMEOUT`. The full code list with actions is in [Model Deployment](./deployment.md#error-codes-and-what-to-do).
- **`last_error_message`** — the explanation behind the code: the actual error text captured from the engine or runtime (for example, the CUDA out-of-memory message, or the reason the model files failed to load). Read this first — it usually names the exact resource or file involved, which tells you whether to resize, re-download, or check logs.
- **`last_error_at`** — when the error was recorded, so you can tell a stale error from a current one.

A note on `OOM` after a successful placement: budgets are reservations, not real-time meters. If something outside Kamiwaza consumed GPU or host memory after scheduling, the engine can still run out at load time — see [Limits to know](./placement-fractional-serving.md#limits-to-know). Free memory on the host or reduce the model's footprint, then retry.

### The deployment sits in INITIALIZING

Normal for a short period: routing is up but the model is still loading. Large models on unified-memory machines can take a while on first load. If it persists well beyond the expected load time, check `last_error_code` for `STARTUP_TIMEOUT` and see the general [troubleshooting guide](./troubleshooting.md).

### Checking capacity on a standalone cluster

On a standalone cluster you can inspect what placement sees:

```bash
# GPU labels detected on a node
kubectl get node <node-name> -o jsonpath='{.metadata.labels}' | tr ',' '\n' | grep gpu

# Per-GPU memory budgets advertised on a node (MB)
kubectl get node <node-name> -o jsonpath='{.status.allocatable}' | tr ',' '\n' | grep vram-mb-gpu
```

If a node shows no `kamiwaza.ai/gpu-*` labels, hardware detection has not labeled it and it will not receive placements.

## See also

- [Model Placement Overview](./placement-overview.md)
- [GPU Hardware Classes](./placement-hardware-classes.md)
- [Fractional GPU Serving](./placement-fractional-serving.md)
- [Model Deployment](./deployment.md) — lifecycle statuses and error codes
- [Model Deployment Troubleshooting](./troubleshooting.md) — general issues
