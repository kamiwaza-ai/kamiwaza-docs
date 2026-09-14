---
title: GPU Hardware Classes
sidebar_label: Hardware Classes
---

Kamiwaza model placement specializes its behavior by **hardware class** — a classification of how a GPU's memory is built and how it can be shared. The class determines which placement primitive Kamiwaza uses, how many models can share a device, and what isolation you can expect between them.

If you have not read it yet, start with the [Model Placement Overview](./placement-overview.md), which introduces the three classes through practical examples.

## The class table

| Class | Members | Placement primitive | Isolation |
|---|---|---|---|
| **Hardware-isolated** | NVIDIA MIG-capable cards (A100, H100, B100) with MIG enabled; AMD Instinct MI300+ with partitioning enabled | One model per hardware partition (for example, a MIG slice requested as `nvidia.com/mig-2g.20gb`) | Hardware: dedicated memory and fault isolation per partition |
| **Software-shared** | Discrete-memory GPUs without hardware partitioning: T4, L4, A100/H100 with MIG disabled, and similar; also covers admin-configured time-slicing or MPS on managed clusters | Fractional per-GPU memory budgets in GB, or the cluster's configured sharing strategy, or whole-GPU exclusive | Software: memory budgets are enforced when the model is scheduled; co-located models share compute and faults |
| **Unified memory** | Apple Silicon (M-series), AMD Strix Halo, NVIDIA DGX Spark (GB10 Grace-Blackwell) | Budget against the aggregate system memory pool | Process-level only: concurrent models share the GPU through the OS scheduler |

In deployment details these appear as the `hardware_class` values `hardware_isolated`, `software_shared`, and `unified_memory`.

## Hardware-isolated

When a cluster admin enables MIG on an NVIDIA card (or partitioning on an AMD Instinct accelerator), the card is divided into fixed partitions, each with its own memory and fault domain. Kamiwaza picks a partition profile that fits the model's estimated footprint and requests it — for example, a 2g.20gb MIG slice for a model estimated under 20 GB.

What to expect:

- **One model per partition.** Each deployment gets a whole slice to itself. Kamiwaza does not pack multiple models into one slice.
- **True isolation.** A crash, memory leak, or GPU fault in one partition does not affect models in other partitions.
- **Capacity is the partition size**, not the whole card. A model that needs more than the largest configured partition will not fit — the deployment fails with a structured no-fit error (see [What a NoFit error means](./placement-fractional-serving.md#what-a-nofit-error-means)).
- The sharing class on deployment details names the partition, for example `mig_2g_20gb`.

## Software-shared

A discrete GPU without hardware partitioning has one VRAM pool and no hardware fences. Kamiwaza shares it by accounting:

- **Fractional memory budgets.** Each deployment reserves an estimated footprint in GB on a specific GPU. Models coexist on a card as long as their combined budgets fit. This is the default on standalone clusters and is described in detail in [Fractional GPU Serving](./placement-fractional-serving.md).
- **Cluster-configured sharing.** On a managed cluster where the admin has configured time-slicing or MPS through the GPU Operator, Kamiwaza requests the shared resource the cluster advertises and the configured strategy governs sharing.
- **Whole-GPU exclusive.** When neither of the above applies (or fractional placement is disabled), a deployment claims the entire GPU and no other model can join it.

What to expect:

- Memory budgets are checked **when the model is scheduled** — a model that would overflow the card is refused up front.
- The serving engines self-limit to their allocation (for example, vLLM's GPU memory utilization setting), but there is **no compute or fault isolation** between models sharing a card: a misbehaving workload can slow or destabilize its neighbors.
- On a managed cluster with a GPU Operator installed but **no sharing strategy configured**, Kamiwaza places whole-GPU and attaches a `SharingNotConfigured` notice to the deployment so you know density is limited to one model per GPU until the admin enables sharing.

## Unified memory

Apple Silicon, AMD Strix Halo, and NVIDIA DGX Spark machines have a single memory pool shared by the CPU and GPU. There is no separate VRAM to slice, so unified-memory placement is its own algorithm, not a one-slot variant of discrete-GPU placement:

- Deployments are budgeted against the **aggregate system memory**, with headroom held back for the operating system and other processes.
- Concurrent models share the GPU through the OS scheduler — there is no partitioning of compute.
- On macOS, the model processes run **natively on the host** (not inside the cluster) so they get full Metal GPU access; the sharing class for these deployments is `metal_spawner`.
- Memory exhaustion on these machines includes everything else the host is doing. If the system is busy, a model that fit on paper can still run out of memory at load time — see [Limits to know](./placement-fractional-serving.md#limits-to-know).

## How Kamiwaza detects the class

Detection is automatic, driven by node labels — you never set the class yourself.

- **Managed clusters:** Kamiwaza reads the labels your GPU Operator already publishes, such as `nvidia.com/gpu.product` and `nvidia.com/mig.capable` (NVIDIA) or `amd.com/gpu.cu-count` and `dcm.amd.com/gpu-config-profile` (AMD). Kamiwaza never adds or edits node labels on a managed cluster.
- **Standalone clusters:** the Kamiwaza installer publishes its own labels during hardware detection, including:

| Label | Meaning |
|---|---|
| `kamiwaza.ai/gpu-memory-class` | `unified` or `discrete` — the unified-memory signal |
| `kamiwaza.ai/gpu-memory-mb` | Detected GPU (or shared-pool) memory. The value is in MiB, despite the label name |
| `kamiwaza.ai/gpu-vendor` | GPU vendor |

On a standalone cluster you can inspect the labels directly:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.labels}' | tr ',' '\n' | grep gpu
```

If a node's GPU labels are incomplete, the deployment surfaces a `PartialDiscovery` notice naming the missing labels, and placement proceeds with conservative assumptions (for example, sharing is treated as not configured). A node whose capacity labels are missing cannot be budgeted, so it will not win placement until those labels are present.

## See also

- [Model Placement Overview](./placement-overview.md) — the classes introduced by example
- [Fractional GPU Serving](./placement-fractional-serving.md) — how software-shared and unified-memory budgeting works
- [Placement Deployment Guide](./placement-deployment-guide.md) — deploying and troubleshooting
