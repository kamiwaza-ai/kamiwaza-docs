---
title: Prepare the Kubernetes Platform
sidebar_label: Prepare the Platform
---

# Prepare the Kubernetes Platform

Before you install Kamiwaza, a platform administrator prepares the target cluster
so that it satisfies everything the Kamiwaza tenant release depends on. This page
describes the prerequisites in customer terms. The Kamiwaza chart does **not**
create or repair these platform-owned resources — if one is missing, validation
and install are designed to fail with a clear message rather than provisioning
cluster-wide resources for you.

:::note Setup approach
Kamiwaza publishes a **Kubernetes setup** guide and supporting playbooks that
walk a platform team through preparing a cluster (for example, a single-node
bare-metal host, or a managed OpenShift cluster). Use that material to *prepare
and validate* the platform. The steps below are the contract those playbooks
satisfy — the checklist your cluster must meet before the Helm install. Ask your
Kamiwaza representative for the setup guide that matches your target platform.
:::

## Prerequisite checklist

| Area | What the platform must provide |
| --- | --- |
| **Namespace** | A pre-created namespace for Kamiwaza (for example, `kamiwaza`). Kamiwaza installs into this namespace and does **not** create it. |
| **Block storage** | A default or named block `StorageClass` that can satisfy read-write-once (RWO) persistent volume claims. |
| **Object storage** | Either an external S3-compatible / blob endpoint, or the in-namespace object store that Kamiwaza can enable through Helm values. Object storage backs workrooms, the skills library, and other object-backed features. |
| **Service mesh and ingress** | A service mesh and ingress gateway (for example Istio, or GreyMatter on OpenShift) with a route surface for the namespace, and one external entry point published for the Kamiwaza domain. |
| **TLS** | An edge certificate for the Kamiwaza domain — either one you bring, or one the platform manages. |
| **Image pull credentials** | A namespaced image pull secret for Kamiwaza's image registry (your Keygen OCI entitlement). See [Image pull entitlement](#image-pull-entitlement). |
| **GPU (optional)** | If you will serve models on GPUs, the GPU operator / device plugin and the GPU resource names the cluster exposes. Extended mode adds further cluster-scoped prerequisites — see [GPU and Extended mode](#gpu-and-extended-mode). |
| **DNS** | A DNS name for Kamiwaza that resolves to your ingress entry point. |

## Image pull entitlement

Kamiwaza's images are distributed through your **Keygen** entitlement and pulled
from Kamiwaza's Keygen **OCI registry**. Create a namespaced image pull secret in
the Kamiwaza namespace so that every Kamiwaza workload can pull its images using
your license, without any cluster-wide registry credentials.

You will reference this secret from your Helm values at install time. The
[Install Kamiwaza with Helm](helm-install.md) page shows where it plugs in.

:::info No other registry accounts
The customer install path uses **only** your Kamiwaza license and its Keygen OCI
entitlement. You do not need — and should not configure — any other container
registry account to install Kamiwaza.
:::

<!-- GAP (for Matt): the exact Keygen OCI registry host + the credential the
     platform admin puts into the pull secret (license key as the password, and
     what username, if any) for a raw docker/helm login against Keygen OCI in the
     1.1.0 chart flow are not yet confirmed here. The published 1.0.x online
     installer pulls product images from `oci.pkg.keygen.sh` using the Keygen
     license, so that host is used as the working example on the Helm page and
     marked as an assumption. Confirm the host + credential convention before
     this ships. -->

## Validate before you install

Kamiwaza provides an environment validation step so you can confirm the platform
meets the contract *before* you run Helm. Run it against your prepared cluster and
resolve any reported gaps first. A clean validation result means the namespace,
storage, mesh/ingress, image pull, and permission boundaries are ready to receive
the Kamiwaza release.

:::tip
Record the validation result with your change-management process. Only install
into a cluster that has passed validation for your target platform.
:::

## GPU and Extended mode

Two levels of GPU support map to the two install modes:

- **Tenant mode (default)** runs entirely within one namespace and does not
  inspect cluster-wide resources such as Nodes. Single-node GPU inference works
  in this mode when the platform exposes GPU resources to the namespace.
- **Extended mode** enables cross-node GPU features — GPU discovery across the
  cluster and fractional / multi-node model placement. Because these features
  need cluster-wide information, an administrator must **provision a small set of
  cluster-scoped prerequisites ahead of time** (for example, read access to Node
  labels for GPU discovery, and, optionally, a placement add-on for
  fractional-GPU serving). Even in Extended mode, the Kamiwaza chart itself
  creates only namespaced objects; the cluster-scoped grants are prepared
  separately by the platform admin.

If you plan to use Extended mode, provision these cluster-scoped prerequisites as
part of platform preparation. See
[Install Kamiwaza with Helm](helm-install.md#tenant-and-extended-modes) for how
the mode is selected at install time.

## What the platform keeps

Platform-owned resources are **not** touched by installing, upgrading, or
uninstalling Kamiwaza. The namespace, storage classes, mesh and ingress, GPU
drivers, and image pull credentials remain in place across the Kamiwaza release
lifecycle. This lets a namespace tenant install and remove Kamiwaza cleanly
without disturbing the surrounding cluster.

## Next step

Once the platform meets this contract and validation passes, continue to
[Install Kamiwaza with Helm](helm-install.md).
