# Uninstalling Kamiwaza

This page describes how to remove Kamiwaza 1.0.1 from a host.

> **This is destructive.** Uninstalling removes the local Kubernetes cluster, all Kamiwaza containers and images, and platform data. Back up anything you need — models, configuration, and any data in the platform database — before you begin.

## What Gets Removed

A Kamiwaza install consists of:

- A single-host Kubernetes cluster and its container runtime, provisioned by the installer.
- The Kamiwaza platform and extensions running on that cluster.
- Install and data directories under `/opt/kamiwaza` (and `/etc/kamiwaza` for cluster certificates and config).
- On offline RHEL installs, the `kamiwaza-prod` prerequisites RPM.

## Step 1: Back Up First

Before removing anything, export or copy any data you need to keep. Once the cluster and `/opt/kamiwaza` are removed, platform data cannot be recovered.

## Step 2: Remove the Cluster and Runtime

Uninstalling Kamiwaza means tearing down the single-host cluster the installer created. The exact commands depend on the cluster runtime used for your install (for example `k0s-podman` on RHEL offline installs, or Kind on online installs). Confirm the runtime for your install before proceeding:

```bash
# Inspect the running cluster and its nodes
kubectl get nodes -o wide
kubectl get pods -A
```

Stop and remove the cluster using the tooling that matches your runtime, then confirm no Kamiwaza containers remain:

```bash
# List any remaining containers (podman shown; use your runtime's CLI)
sudo podman ps -a
```

> If you are unsure how your cluster was provisioned, or need a fully scripted teardown, contact Kamiwaza support before removing the cluster — the safe teardown path depends on the runtime and on whether you intend to reinstall on the same host.

## Step 3: Remove the Prerequisites Package (Offline RHEL Installs)

Offline RHEL installs place the prerequisites via the `kamiwaza-prod` RPM. Remove it once the cluster is torn down:

```bash
sudo dnf remove kamiwaza-prod
```

Online installs do not install a Kamiwaza package and can skip this step.

## Step 4: Remove Install Directories

Once the cluster is gone, remove the Kamiwaza directories:

```bash
sudo rm -rf /opt/kamiwaza
sudo rm -rf /etc/kamiwaza
```

> Keep these directories if you are reinstalling and want to preserve configuration.

## Step 5: Verify Removal

```bash
# Install directories removed
[ -d /opt/kamiwaza ] && echo "WARNING: /opt/kamiwaza still exists" || echo "OK: /opt/kamiwaza removed"
[ -d /etc/kamiwaza ] && echo "WARNING: /etc/kamiwaza still exists" || echo "OK: /etc/kamiwaza removed"

# No Kamiwaza containers remain (podman shown; use your runtime's CLI)
sudo podman ps -a | grep -i kamiwaza && echo "WARNING: containers remain" || echo "OK: no Kamiwaza containers"
```

To find any other Kamiwaza-related files left on the host:

```bash
sudo find / -maxdepth 6 -iname '*kamiwaza*' 2>/dev/null
```
