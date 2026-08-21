# Uninstalling Kamiwaza

This page describes how to remove Kamiwaza 1.0.2 from a host.

> **This is destructive.** Uninstalling removes the local Kubernetes cluster, all Kamiwaza containers and images, and platform data. Back up anything you need — models, configuration, and any data in the platform database — before you begin.

## What Gets Removed

A Kamiwaza install consists of:

- A single-host Kubernetes cluster and its container runtime, provisioned by the installer.
- The Kamiwaza platform and extensions running on that cluster.
- Install and data directories under `/opt/kamiwaza` (and `/etc/kamiwaza` for cluster certificates and config).
- On offline RHEL installs, the `kamiwaza-prod` prerequisites RPM.

## Step 1: Back Up First

Before removing anything, export or copy any data you need to keep. Once the cluster and `/opt/kamiwaza` are removed, platform data cannot be recovered.

## Step 2: Remove the cluster and runtime

All supported single-host installs use k0s. The installer records whether k0s runs inside Lima on macOS or directly on Linux, and the matching uninstall wrapper uses that record. Do not delete the cluster with raw `k0s`, Lima, or Podman commands.

For an installation created from a `deploy` checkout, run the wrapper from the same checkout:

```bash
./scripts/uninstall-dev.sh
```

For an offline RHEL installation, run the packaged production wrapper:

```bash
sudo /opt/kamiwaza/scripts/uninstall-prod.sh
```

For an online installation, use the uninstall wrapper from the matching extracted installer payload. The `--keep-extract` installer option preserves that payload. Contact Kamiwaza support if the matching payload is no longer available; using a wrapper from a different release can apply the wrong cleanup contract.

The standard wrappers remove Kamiwaza-owned runtime resources while preserving unrelated Podman resources. Review the wrapper's `--help` output before using its full-cleanup option, which also removes shared tooling and Podman state.

## Step 3: Remove the prerequisites package (offline RHEL installs)

Offline RHEL installs place the prerequisites via the `kamiwaza-prod` RPM. Remove it once the cluster is torn down:

```bash
sudo dnf remove kamiwaza-prod
```

Online installs do not install a Kamiwaza package and can skip this step.

## Step 4: Remove install directories

Once the cluster is gone, remove the Kamiwaza directories:

```bash
sudo rm -rf /opt/kamiwaza
sudo rm -rf /etc/kamiwaza
```

> Keep these directories if you are reinstalling and want to preserve configuration.

## Step 5: Verify removal

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
