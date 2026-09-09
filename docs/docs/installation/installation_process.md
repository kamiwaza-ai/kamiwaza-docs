# Installing Kamiwaza

This guide covers how to install Kamiwaza on a supported host.

## Before You Begin

**Review the [System Requirements](system_requirements.md) first.** They cover supported operating systems, hardware sizing (CPU, RAM, storage), GPU support, and the network access the installer needs.

**Complete [Storage prerequisites](storage-prerequisites.md) before product
installation.** The administrator must provide and verify an RWO StorageClass;
the tenant installer does not install the storage driver. Stop if a disposable
PVC cannot retain a marker across consumer replacement.

You also need a **Kamiwaza license key**. Kamiwaza is distributed through [Keygen](https://keygen.sh/): the installer and platform images are pulled from Keygen using a Kamiwaza Prod license key. Contact your Kamiwaza representative if you do not have one.

> Kamiwaza is licensed software. There is no free "Community Edition" build, and the previous `.deb` / `.rpm` packages from `packages.kamiwaza.ai` are no longer used. If you are looking for the older packages or the Windows installer, select an earlier version from the version dropdown at the top of this site.

## Choose an Installation Method

Kamiwaza supports two installation paths. Pick the one that matches your environment:

| Method | Use when | Platforms | Guide |
|--------|----------|-----------|-------|
| **Online** | The host has outbound internet access to Keygen and your OS package repositories. This is the recommended path for most installs. | Ubuntu 22.04 / 24.04, RHEL-compatible 9.x | [Online Installation](online_install.md) |
| **Offline / air-gapped** | The host is in a restricted or air-gapped environment. You download the bundle on a connected machine, transfer it, and install without internet access on the target host. | RHEL-compatible 9.x | [Offline Installation](offline_install.md) |

Both methods install the same platform, but offline installation also requires
administrator-owned [disconnected substrate preparation](offline_install.md#step-0-prepare-the-disconnected-kubernetes-substrate)
before the product bundle can be used.

## Supported Platforms

| Platform | Online | Offline |
|----------|:------:|:-------:|
| Ubuntu 24.04 (Noble) | ✅ | — |
| Ubuntu 22.04 (Jammy) | ✅ | — |
| RHEL-compatible 9.x | ✅ | ✅ |
| macOS | — | — |

Production installation on macOS is not currently supported (ENG-10839).
Source-based developer installs on Apple Silicon continue to use managed Lima.

> All installs require a Kamiwaza Prod license key. GPU acceleration (NVIDIA CUDA, AMD ROCm, or NVIDIA vLLM) is optional, and inference images are pulled when a model is deployed. See [System Requirements](system_requirements.md) for supported host software.

## What Happens During Installation

For an online fresh host, bootstrap and product installation are separate stages:

1. Installs host prerequisites (container runtime, cluster tooling, Ansible).
2. Bootstraps a local Kubernetes cluster.
3. Pauses after `--phase1-only` so the administrator can prepare and verify storage.
4. On rerun without that flag, pulls the Kamiwaza platform images and deploys the product via Helm onto the prepared substrate.
5. Configures access at `https://<your-domain>/`.

Offline installation starts from the verified substrate; its product bundle is
not a blank-host bootstrap kit. See the chosen guide for the exact stage ordering.

You provide a domain name (`--domain`) and an initial admin password (`--admin-password`) when you run the installer.

Production installation uses native k0s on Linux, with Podman for supporting
container workflows. Installation commands do not require a Kubernetes runtime
argument.

## After Installation

Once the installer finishes, verify the platform is running and log in with the admin credentials you set. See the [Quickstart](../quickstart.md) to confirm the service is up and start using Kamiwaza.

## Uninstalling

To remove Kamiwaza from a host, see [Uninstalling Kamiwaza](uninstall.md).
