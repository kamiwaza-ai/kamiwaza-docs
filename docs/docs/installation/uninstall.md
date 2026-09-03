# Uninstalling Kamiwaza

This page describes how to remove Kamiwaza from a host using the supported
uninstall wrappers shipped with the deployment payload.

> **This is destructive.** Uninstalling removes the local Kubernetes cluster, all Kamiwaza containers and images, and platform data. Back up anything you need — models, configuration, and any data in the platform database — before you begin.

> **Online installs: verify the cluster is actually gone (currently required).** As of this writing, the uninstall wrapper's cleanup logic only tears down `kind`-based clusters. An [Online Installation](./online_install.md) provisions **k0s**, which the wrapper does not stop or reset — it will print `Uninstallation Complete!` after ~15 seconds while k0s, all Kamiwaza pods, and the frontend are still fully running. **Do not trust that message on an online install.** Confirm per [Step 2](#step-2-run-the-matching-uninstall-wrapper) before moving on, and use the manual k0s teardown there if the cluster is still up.

## What Gets Removed

A Kamiwaza install consists of:

- A single-host Kubernetes cluster and its container runtime, provisioned by the installer (`kind` for offline/dev installs; `k0s` for online installs).
- The Kamiwaza platform and extensions running on that cluster.
- On **offline/package installs**: install and data directories under `/opt/kamiwaza` (and `/etc/kamiwaza` for cluster certificates and config).
- On **online installs**: the extracted installer payload (default `/var/lib/kamiwaza-online-install/`, or wherever you passed `--extract-dir`), plus `/var/lib/kamiwaza`, `/var/tmp/kamiwaza`, and k0s's own state under `/etc/k0s` and `/run/k0s`. Online installs do **not** use `/opt/kamiwaza` or `/etc/kamiwaza`.
- On offline RHEL installs, the `kamiwaza-prod` prerequisites RPM.

## Step 1: Back Up First

Before removing anything, export or copy any data you need to keep. Once the cluster and its data directories are removed, platform data cannot be recovered.

## Step 2: Run the matching uninstall wrapper

Confirm whether the host is a production/package install, an online install,
or a source-based developer install. Do not mix these.

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

For an **online install**, the wrapper lives inside the extracted installer
payload rather than at a fixed path — locate it first if you didn't pass
`--extract-dir` at install time:

```bash
# Default extraction root unless --extract-dir was used at install time:
cd /var/lib/kamiwaza-online-install/kamiwaza-online-payload
sudo ./scripts/uninstall-prod.sh
```

For a source-based development install, run from the matching `deploy`
checkout:

```bash
cd /path/to/kamiwaza-stack/deploy
./scripts/uninstall-dev.sh
```

All of these are destructive and ask for a `yes`/`no` confirmation at a plain
`read` prompt — there is currently no documented non-interactive flag, so run
them at an interactive terminal (piping `yes` or similar works if you must
script it). Add `--full-cleanup` only when you also intend to remove the
retained runtime/prerequisite state. Use `--help` to inspect the exact
release's options before running it.

**On an online (k0s) install, verify the cluster is actually gone before
proceeding — do not rely on the wrapper's "Uninstallation Complete!" message:**

```bash
sudo systemctl status k0scontroller
kubectl --kubeconfig ~/.kube/config get nodes
```

If `k0scontroller` is still `active (running)` or `kubectl` still returns
nodes, the wrapper did not tear down k0s. Do it manually:

```bash
sudo k0s stop
sudo k0s reset
```

Confirm again with the same two commands — `k0scontroller` should report
"could not be found" and `kubectl` should fail to connect.

> **If you plan to reinstall on this host, do not stop here.** A manual `k0s reset`
> tears down the Kubernetes control plane but does **not** touch Rook-Ceph's on-disk
> OSD data (see the [Step 4](#step-4-remove-install-directories) warning below) or
> guarantee the CNI plugin re-initializes cleanly on the next install. Continue to
> Step 4 and remove the online-install directories — including `/var/lib/kamiwaza` —
> before reinstalling, even if you intend to "reuse" the host.

After the wrapper (and, on online installs, the manual k0s teardown if
needed) finishes, confirm that no Kamiwaza containers remain:

```bash
sudo podman ps -a
```

If neither `/opt/kamiwaza/bin/uninstall-prod.sh` nor the online payload's
`scripts/uninstall-prod.sh` can be found, stop and identify the
installer/package version before removing directories manually. The payload
and its uninstall playbooks must remain present until the wrapper completes.

## Step 3: Remove the Prerequisites Package (Offline RHEL Installs)

Offline RHEL installs place the prerequisites via the `kamiwaza-prod` RPM. Remove it once the cluster is torn down:

```bash
sudo dnf remove kamiwaza-prod
```

Online installs do not install a Kamiwaza package and can skip this step.

## Step 4: Remove Install Directories

Once the cluster is gone, remove the Kamiwaza directories.

Offline/package installs:

```bash
sudo rm -rf /opt/kamiwaza
sudo rm -rf /etc/kamiwaza
```

Online installs:

```bash
sudo rm -rf /var/lib/kamiwaza-online-install   # or your --extract-dir path
sudo rm -rf /var/lib/kamiwaza
sudo rm -rf /var/tmp/kamiwaza
sudo rm -rf /etc/k0s
```

> **Do not skip `/var/lib/kamiwaza` if you are reinstalling on the same host.**
> `/var/lib/kamiwaza/storage/osd/` holds Rook-Ceph's OSD backing image (a loop-mounted
> sparse file). A `k0s reset` does not wipe it. Reinstalling with that directory kept
> hands the fresh install a stale, orphaned Ceph OSD — the resulting cluster comes up
> with RBD-backed volumes mounted **read-only**, which crash-loops every stateful
> component that depends on one (`core-etcd-*`, `core-postgres-0`, `keycloak-postgres-0`,
> `keycloak`, model-serving pods with PVCs, etc.) with errors like
> `cannot access data directory: open /data/.touch: read-only file system`. If you
> genuinely need to preserve state across reinstalls, back it up and restore it
> explicitly — do not rely on leaving the directory in place. `/etc/k0s` and
> `/var/lib/kamiwaza-online-install` are safer to leave if you want to reuse the
> extracted payload, but when in doubt, remove all four and start clean.

## Step 5: Verify Removal

Offline/package installs:

```bash
[ -d /opt/kamiwaza ] && echo "WARNING: /opt/kamiwaza still exists" || echo "OK: /opt/kamiwaza removed"
[ -d /etc/kamiwaza ] && echo "WARNING: /etc/kamiwaza still exists" || echo "OK: /etc/kamiwaza removed"
```

Online installs:

```bash
sudo systemctl status k0scontroller 2>&1 | grep -q "could not be found" \
  && echo "OK: k0s removed" || echo "WARNING: k0s still present"
[ -d /var/lib/kamiwaza-online-install ] && echo "WARNING: payload dir still exists" || echo "OK: payload dir removed"
```

Either install type:

```bash
# No Kamiwaza containers remain (podman shown; use your runtime's CLI)
sudo podman ps -a | grep -i kamiwaza && echo "WARNING: containers remain" || echo "OK: no Kamiwaza containers"
```

To find any other Kamiwaza-related files left on the host:

```bash
sudo find / -maxdepth 6 -iname '*kamiwaza*' 2>/dev/null
```

## Troubleshooting a Reinstall: Node Stuck `NotReady`

If you reinstall on a host where k0s was previously stopped and reset (Step 2's manual
teardown), the node can occasionally come up `NotReady` with kubelet reporting
`container runtime network not ready: NetworkReady=false ... cni plugin not
initialized`. This happens when kube-router's CNI config
(`/etc/cni/net.d/10-kuberouter.conflist`) and the `kube-bridge` interface don't get
re-created on the fresh k0s bootstrap. Confirm with:

```bash
kubectl get nodes
ip addr show kube-bridge   # "Device does not exist" confirms the symptom
```

Force kube-router to re-run its init containers:

```bash
kubectl -n kube-system delete pod -l k8s-app=kube-router \
  || kubectl -n kube-system get pods -o name | grep -i router | xargs -r kubectl -n kube-system delete
```

The node should report `Ready` within about a minute once the new pod's init
containers rewrite the CNI config.
