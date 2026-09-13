---
title: Model Placement Overview
sidebar_label: Placement Overview
---

When you deploy a model, Kamiwaza decides where it runs: which node, which GPU (or memory pool), and how much memory to reserve for it. This is **model placement**. Placement is automatic — you deploy a model the same way on a datacenter cluster, a single-GPU workstation, or a MacBook, and Kamiwaza picks an appropriate home for it.

The goal of placement is safe GPU coexistence: running more than one model on the same hardware without them fighting over memory.

## Why GPU coexistence matters

A GPU is usually much larger than any single model you put on it. A 6 GB model deployed exclusively on an 80 GB card leaves 74 GB idle. Without placement, every deployment claims a whole GPU, so a second small model on the same card is refused even though there is plenty of room.

With placement, Kamiwaza estimates each model's memory footprint, reserves that amount on a specific GPU, and lets additional models use the remaining capacity. A model that does not fit anywhere fails fast with a structured placement error recorded on the deployment — it is never left silently pending. See [Fractional GPU Serving](./placement-fractional-serving.md) for how the budgeting works.

## Where Kamiwaza runs

Placement adapts to the way Kamiwaza is installed. You will see the active topology on each deployment's details page.

| Topology | What it looks like | Examples |
|---|---|---|
| **Managed cluster** | Kamiwaza is installed into a namespace on your existing Kubernetes cluster. Your cluster admin has already installed the NVIDIA or AMD GPU Operator, and placement respects whatever GPU sharing the admin configured (MIG partitions, time-slicing, MPS). | OpenShift, HPE Private Cloud AI, customer-installed Kubernetes |
| **Standalone cluster** | Kamiwaza owns the cluster install on hardware you point it at, including the GPU device exposure. | NVIDIA DGX Spark workstations, AMD Strix Halo workstations, edge appliances |
| **macOS** | A standalone install on Apple Silicon. The Kamiwaza control plane runs in a lightweight VM; the model processes themselves run natively on the host so they get full Metal GPU access. | MacBook and Mac Studio (M-series) |

On managed clusters, Kamiwaza never edits node labels or requires privileged access — the one-time cluster-admin steps at install are limited to a custom resource definition and a read-only role for node labels.

## Three kinds of GPU hardware

Placement treats GPUs differently depending on how their memory is built and shared. Three practical examples cover the range:

**A datacenter card with hardware partitioning.** An NVIDIA H100 with MIG (Multi-Instance GPU) enabled is carved into hardware slices, each with its own dedicated memory. Kamiwaza places one model per slice. A crash or memory spike in one slice cannot touch a model in another — the isolation is enforced by the hardware itself.

**A discrete card without partitioning.** An NVIDIA T4, L4, or an A100 with MIG disabled has one fixed pool of VRAM on the card. There is no hardware fence, so Kamiwaza shares the card by accounting: each model reserves a memory budget in GB, and models coexist as long as their combined budgets fit the card. Two 6 GB models fit comfortably on a 16 GB T4.

**A machine with unified memory.** A MacBook, an AMD Strix Halo workstation, or an NVIDIA DGX Spark has no separate VRAM at all — the CPU and GPU share one system memory pool. Kamiwaza budgets model deployments against that shared pool (leaving headroom for the operating system) and lets concurrent models share the GPU through the OS scheduler.

Kamiwaza names these three situations **hardware classes**:

| Hardware class | Example hardware | How models share |
|---|---|---|
| Hardware-isolated | H100/A100 with MIG; AMD Instinct MI300 with partitioning | One model per hardware partition |
| Software-shared | T4, L4, A100/H100 without partitioning | Per-GPU memory budgets (fractional), or whole-GPU exclusive |
| Unified memory | Apple Silicon, AMD Strix Halo, NVIDIA DGX Spark (GB10) | Budgets against the shared system memory pool |

The class is detected automatically from node labels — you never select it. [GPU Hardware Classes](./placement-hardware-classes.md) explains each class, its isolation guarantees, and the signals Kamiwaza reads.

## What you see after deployment

Every deployment's details surface where it landed and what it reserved:

- **Topology** — managed cluster or standalone cluster (macOS installs appear as standalone with the `metal_spawner` sharing class).
- **Node and GPU** — the node name and GPU index (where applicable).
- **Hardware class and sharing class** — for example `unified_memory`, or `mig_2g_20gb` for a model placed in a MIG slice.
- **Allocated capacity (GB)** — the memory budget reserved for this deployment.

See the [Placement Deployment Guide](./placement-deployment-guide.md) for reading these fields and troubleshooting placement.

## See also

- [GPU Hardware Classes](./placement-hardware-classes.md) — the class taxonomy in depth
- [Fractional GPU Serving](./placement-fractional-serving.md) — memory budgeting and multi-model-per-GPU
- [Placement Deployment Guide](./placement-deployment-guide.md) — step-by-step deployment and troubleshooting
- [Model Deployment](./deployment.md) — the general deployment lifecycle and statuses
