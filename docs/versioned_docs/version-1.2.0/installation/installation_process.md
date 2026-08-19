# Installing Kamiwaza

This guide covers how to install Kamiwaza 1.0.1 on a supported host.

## Before You Begin

**Review the [System Requirements](system_requirements.md) first.** They cover supported operating systems, hardware sizing (CPU, RAM, storage), GPU support, and the network access the installer needs.

You also need a **Kamiwaza license key**. Kamiwaza 1.0.1 is distributed through [Keygen](https://keygen.sh/): the installer and platform images are pulled from Keygen using a Kamiwaza Prod license key. Contact your Kamiwaza representative if you do not have one.

> Kamiwaza 1.0.1 is licensed software. There is no free "Community Edition" build, and the previous `.deb` / `.rpm` packages from `packages.kamiwaza.ai` are no longer used. If you are looking for the older packages or the Windows installer, select an earlier version from the version dropdown at the top of this site.

## Choose an Installation Method

Kamiwaza supports two installation paths. Pick the one that matches your environment:

| Method | Use when | Platforms | Guide |
|--------|----------|-----------|-------|
| **Online** | The host has outbound internet access to Keygen and your OS package repositories. This is the recommended path for most installs. | Ubuntu 22.04 / 24.04, RHEL-compatible 9.x, macOS | [Online Installation](online_install.md) |
| **Offline / air-gapped** | The host is in a restricted or air-gapped environment. You download the bundle on a connected machine, transfer it, and install without internet access on the target host. | RHEL-compatible 9.x | [Offline Installation](offline_install.md) |

Both methods install the same platform. The difference is only how the installer and images reach the target host.

## Supported Platforms

| Platform | Online | Offline |
|----------|:------:|:-------:|
| Ubuntu 24.04 (Noble) | ✅ | — |
| Ubuntu 22.04 (Jammy) | ✅ | — |
| RHEL-compatible 9.x | ✅ | ✅ |
| macOS | ✅ | — |

> All installs require a Kamiwaza Prod license key. GPU acceleration (NVIDIA CUDA, AMD ROCm, or NVIDIA vLLM) is optional and selected during installation — see [Online Installation](online_install.md#gpu-and-inference-images) and the [System Requirements](system_requirements.md).

## What Happens During Installation

The installer provisions a single-host Kubernetes cluster and deploys the Kamiwaza platform onto it:

1. Installs host prerequisites (container runtime, cluster tooling, Ansible).
2. Bootstraps a local Kubernetes cluster.
3. Pulls or imports the Kamiwaza platform images.
4. Deploys the platform via Helm, including the Istio service mesh and ingress gateway.
5. Configures access at `https://<your-domain>/`.

You provide a domain name (`--domain`) and an initial admin password (`--admin-password`) when you run the installer.

## Multi-Node Deployments

To run inference across a pair of nodes (for example, two NVIDIA DGX Spark systems using tensor parallelism), install Kamiwaza on the head node and follow the [Two-Node Deployment Guide](two-node-deployment.md).

## After Installation

Once the installer finishes, verify the platform is running and log in with the admin credentials you set. See the [Quickstart](../quickstart.md) to confirm the service is up and start using Kamiwaza.

## Uninstalling

To remove Kamiwaza from a host, see [Uninstalling Kamiwaza](uninstall.md).
