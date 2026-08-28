---
title: Kamiwaza on Kubernetes (1.1.0)
sidebar_label: Overview
---

# Kamiwaza on Kubernetes (1.1.0)

Kamiwaza 1.1.0 introduces a new way to install and operate the platform. Instead
of a single-host installer that provisions a cluster for you, Kamiwaza 1.1.0 runs
as a **tenant** inside a Kubernetes cluster that you (or your platform team)
already own. You prepare the cluster once, then install, upgrade, and remove
Kamiwaza with standard Helm commands.

:::note What this replaces
This section replaces the older single-host production installer
(`install-prod.sh`) narrative. If you are installing an earlier release, or you
want the self-contained host installer, select an earlier version from the
version dropdown at the top of this site and follow
[Installing Kamiwaza](../installation_process.md).
:::

## Who this is for

This guide is written for the **platform administrator and operator** who install
Kamiwaza into an existing Kubernetes cluster. You should be comfortable with
`kubectl`, Helm, and your cluster's storage, networking, and certificate model.

## The install model

The 1.1.0 model separates **platform setup** from **product install**:

1. **Prepare the Kubernetes platform.** A platform administrator makes sure the
   cluster provides everything Kamiwaza depends on — a namespace, block storage,
   service mesh and ingress, TLS, and the credentials to pull Kamiwaza's images.
   See [Prepare the Kubernetes Platform](prepare-kubernetes.md).
2. **Install Kamiwaza with Helm.** With the platform ready, installing Kamiwaza
   is a single `helm upgrade --install` command that pulls the chart and images
   from your Kamiwaza entitlement. See
   [Install Kamiwaza with Helm](helm-install.md).
3. **Operate the release.** Upgrades and removal are ordinary Helm lifecycle
   operations. See [Upgrade and Uninstall](lifecycle.md).

Kamiwaza does not ship an Ansible playbook that installs the product. Automation
may help you *prepare or validate* the cluster, but the Kamiwaza product install
itself is Helm only.

## Where the images come from

Kamiwaza's chart and container images are distributed through your Kamiwaza
**Keygen** entitlement — the same license-backed distribution channel used by the
1.0.x installers. Images are pulled from Kamiwaza's Keygen **OCI registry** using
your license. You do not need any other registry account to install Kamiwaza.

:::info License required
Kamiwaza is licensed software. Installing 1.1.0 requires a **Kamiwaza license**
with an active entitlement to the 1.1.0 chart and images. Contact your Kamiwaza
representative if you do not have one.
:::

## Tenant and Extended install modes

Kamiwaza installs from a single umbrella Helm chart in one of two modes:

| Mode | Use when | Cluster footprint |
| --- | --- | --- |
| **Tenant** (default) | You want the smallest, most contained install. Everything Kamiwaza creates lives in one namespace. | One namespace. No cluster-scoped objects. Kamiwaza does not read cluster-wide resources such as Nodes. |
| **Extended** | You need cross-node GPU features such as GPU discovery and fractional / multi-node model placement. | One namespace for Kamiwaza, plus a small set of **cluster-scoped prerequisites that the administrator provisions ahead of time**. The chart itself still creates only namespaced objects. |

Both modes install from the same chart. Start with **Tenant** unless you know you
need the Extended GPU capabilities. The difference — and the extra prerequisites
Extended requires — is covered in
[Install Kamiwaza with Helm](helm-install.md#tenant-and-extended-modes).

## What you own vs. what Kamiwaza owns

Kamiwaza's tenant install is deliberately contained. Understanding the boundary
helps you plan the platform prerequisites:

- **You (the platform) own** the cluster and everything cluster-wide: the
  namespace, storage classes, the service mesh and ingress, GPU drivers, and the
  credentials used to pull images.
- **Kamiwaza owns** only the namespaced resources it installs into your target
  namespace through the Helm release.

If a prerequisite is missing, the install is designed to fail clearly and tell
you what the platform still needs to provide, rather than silently creating
cluster-wide resources on your behalf.

## Next steps

1. [Prepare the Kubernetes Platform](prepare-kubernetes.md)
2. [Install Kamiwaza with Helm](helm-install.md)
3. [Upgrade and Uninstall](lifecycle.md)
