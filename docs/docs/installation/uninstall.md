# Uninstalling Kamiwaza

This page describes how to remove Kamiwaza 1.2.0 from a host using the
supported uninstall wrappers shipped with the deployment payload.

> **This is destructive.** Uninstalling removes the local Kubernetes cluster, all Kamiwaza containers and images, and platform data. Back up anything you need — models, configuration, and any data in the platform database — before you begin.

## What Gets Removed

A Kamiwaza install consists of:

- A single-host Kubernetes cluster and its container runtime, provisioned by the installer.
- The Kamiwaza platform and extensions running on that cluster.
- Install and data directories under `/opt/kamiwaza` (and `/etc/kamiwaza` for cluster certificates and config).
- On offline RHEL installs, the `kamiwaza-prod` prerequisites RPM.

## Step 1: Back Up First

Before removing anything, export or copy any data you need to keep. Once the cluster and `/opt/kamiwaza` are removed, platform data cannot be recovered.

## Step 2: Run the matching uninstall wrapper

Confirm whether the host is a production/package install or a source-based
developer install. Do not mix the two wrappers.

```bash
# Inspect the running cluster and its nodes
kubectl get nodes -o wide
kubectl get pods -A
```

For a production or offline-package install, use the wrapper installed by the
package payload:

```bash
sudo /opt/kamiwaza/bin/uninstall-prod.sh
```

For a source-based development install, run from the matching `deploy`
checkout:

```bash
cd /path/to/kamiwaza-stack/deploy
./scripts/uninstall-dev.sh
```

Both commands are destructive and ask for confirmation. Add `--full-cleanup`
only when you also intend to remove the retained runtime/prerequisite state.
Use `--help` to inspect the exact release's options before running it.

After the wrapper finishes, confirm that no Kamiwaza containers remain:

```bash
sudo podman ps -a
```

If `/opt/kamiwaza/bin/uninstall-prod.sh` is absent, stop and identify the
installer/package version before removing directories manually. The payload
and its uninstall playbooks must remain present until the wrapper completes.

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
