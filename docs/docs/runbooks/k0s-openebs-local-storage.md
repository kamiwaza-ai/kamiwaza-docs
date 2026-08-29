---
id: k0s-openebs-local-storage
title: Local k0s OpenEBS storage lifecycle
sidebar_label: Local k0s OpenEBS storage lifecycle
---

# Local k0s OpenEBS storage lifecycle

This runbook is for Kamiwaza engineers developing or running UAT on the modern
local `k0s-lima` and `k0s-podman` runtimes. It describes the dev installer's
managed OpenEBS LocalPV Hostpath prerequisite: how it is selected, installed,
verified, reclaimed, removed, troubleshot, and upgraded.

:::caution Local and disposable by design
This is not production or highly available storage. A volume exists on one k0s
node and has no replica. Its data dies with that node or with the Lima/Podman VM
teardown. Do not use this class for production, backups, disaster recovery, or
data that must survive recreation of the local runtime.
:::

## Why this storage shape

Kamiwaza's databases and other stateful services request Kubernetes PVCs. A
fresh local k0s cluster needs a dynamic RWO filesystem provisioner before those
claims can bind. OpenEBS LocalPV Hostpath gives that development-only bootstrap
a small, deterministic shape without discovering disks or enabling a
replicated storage engine.

An arbitrary bundled CSI driver would create a second infrastructure ownership
model and could carry cloud-disk, topology, encryption, or reclaim assumptions
that do not belong in a local installer. The bootstrap therefore yields to an
explicitly configured StorageClass or an existing usable dynamic default. On a
fresh cluster with neither, it installs only LocalPV Hostpath.

SeaweedFS solves a different problem. It remains an appropriate explicit
secondary class/service for file, object, or shared-storage features, but it is
not the bootstrap default for database PVCs. SeaweedFS itself needs backing
storage; asking it to provide the default that its own PVC depends on would not
solve first-volume provisioning. Do not conflate the default RWO database lane
with an optional shared/object lane.

## Canonical managed contract

The implementation pins the official OpenEBS umbrella chart and app at
`4.5.1`. That was the latest stable OpenEBS patch selected and validated when
the implementation landed. The pin is intentional: floating `latest` would let
an upstream values change, dependency change, or newly enabled umbrella
component alter the local cluster without a deploy review. A newer upstream
release is only the start of an upgrade review; it is not permission to change
the pin automatically. See [Upgrade the pin](#upgrade-the-pin).

| Field | Managed value |
| --- | --- |
| Chart source | Official `openebs` umbrella chart from `https://openebs.github.io/openebs` |
| Chart/app version | `4.5.1` |
| Helm release | `kamiwaza-openebs` |
| Namespace | `kamiwaza-openebs` |
| StorageClass | `kamiwaza-openebs-hostpath` |
| Provisioner | `openebs.io/local` |
| Node BasePath | `/var/local/kamiwaza/openebs/localpv-hostpath` |
| Reclaim policy | `Delete` |
| Volume binding | `WaitForFirstConsumer` |
| Allowed topology | Controller node labeled `kamiwaza.ai/local-dev-storage=true` |
| Volume expansion | Disabled |
| Default annotation | Current annotation is `true`; beta annotation is not `true` |
| Ready workload | One Deployment: `kamiwaza-openebs-localpv-provisioner` |
| Helper image | `docker.io/openebs/linux-utils:4.5.0` |
| Controller security | Non-root UID/GID 1000; `RuntimeDefault` seccomp; escalation disabled; drop `ALL` capabilities; read-only root with an isolated writable `/tmp` `emptyDir` |
| BasePath cleanup security | UID 0, non-privileged, escalation disabled; drop all capabilities, then add only `DAC_OVERRIDE` and `FOWNER` |
| Helm failure policy | Helm 4.1+ `--rollback-on-failure`, 10-minute default timeout |
| Consumer/reclaim cleanup budget | 600 seconds by default |

Only dynamic LocalPV Hostpath is enabled. The pinned chart renders the
ServiceAccount, ClusterRole, ClusterRoleBinding, and provisioner Deployment;
the lifecycle helper renders the fifth object, the constrained StorageClass,
because the chart can express `NodeAffinityLabels` but not Kubernetes
`allowedTopologies`. LocalPV LVM, ZFS, and rawfile,
replicated Mayastor, Loki, Alloy, MinIO, analytics, quota management, snapshot
CRDs, and the umbrella pre-upgrade hook are disabled. A render of the pinned
profile plus the helper-owned class contains no other resources.

Managed resources have all three ownership signals:

```text
label      kamiwaza.ai/managed=true
label      kamiwaza.ai/component=local-dev-storage
annotation kamiwaza.ai/owner=k0s-openebs-localpv
```

The namespace additionally records the selected runtime in
`kamiwaza.ai/runtime`. Helm uses a private temporary cache, config, data, and
repository state for this operation; it does not add the OpenEBS repository to
the engineer's normal Helm state.

The source of truth is the deploy implementation at commit
[`1a878cc6`](https://github.com/kamiwaza-internal/deploy/commit/1a878cc66040a2fce9da1a43860936f39ad3c499):

- [lifecycle helper](https://github.com/kamiwaza-internal/deploy/blob/1a878cc66040a2fce9da1a43860936f39ad3c499/scripts/k0s-openebs-localpv.sh)
- [pinned narrow values](https://github.com/kamiwaza-internal/deploy/blob/1a878cc66040a2fce9da1a43860936f39ad3c499/cluster/values/openebs-localpv-dev.yaml)
- [storage configuration](https://github.com/kamiwaza-internal/deploy/blob/1a878cc66040a2fce9da1a43860936f39ad3c499/docs/storage-configuration.md)
- [contract tests](https://github.com/kamiwaza-internal/deploy/blob/1a878cc66040a2fce9da1a43860936f39ad3c499/scripts/tests/test_k0s_default_storage_contracts.py)

OpenEBS publishes the corresponding [v4.5.1 release](https://github.com/openebs/openebs/releases/tag/v4.5.1).

## Install decision and order

Use the ordinary dev entry point from the deploy repository:

```bash
./scripts/install-dev.sh
```

For an explicitly offline developer run, select that mode at the entry point:

```bash
DEPLOYMENT_MODE=offline ./scripts/install-dev.sh
```

The wrapper accepts only `online` or `offline` and passes the selected value to
both Ansible and the runtime storage helper. This selects the complete developer
installer's offline lane, not a storage-only mode. Prepare the normal offline
bundle, charts, images, and other prerequisites for the whole install. Do not
describe a disconnected host as offline without setting the mode; online
bootstrap is allowed to contact the pinned chart repository.

Do not install the umbrella chart by hand during a normal dev install. Both k0s
runtime installers wait for the cluster and `kube-system` workloads to become
Ready, then run the local-storage helper before any PVC-bearing Kamiwaza
release. `install-dev.sh` then runs the default-StorageClass preflight before
entering its platform deployment phase.

The decision order is:

1. If `storage.stateful.standard` resolves to a nonempty explicit class, that
   class wins. It must exist or installation stops. An already managed class is
   demoted from default, but the helper does not delete it during this decision.
2. Otherwise inspect all current and beta default annotations. If one or more
   foreign defaults exist, each must name a dynamic provisioner (not empty and
   not `kubernetes.io/no-provisioner`). Those defaults win and OpenEBS is not
   installed.
3. A managed and foreign class both marked default is ambiguous and stops the
   install. A static foreign default also stops rather than adding a second
   default.
4. With no explicit or existing dynamic default, an offline local install may
   reuse an existing, healthy, exactly pinned managed release after verifying
   its release identity and ownership metadata. This path does not access the
   chart repository. If that release does not already exist, installation stops
   before creating the managed namespace because a new managed bootstrap needs
   `openebs.github.io` and the pinned images. In that case, provide an existing
   dynamic default or explicitly configure `storage.stateful.standard`.
5. For an online managed bootstrap, reject unowned name collisions, ensure the
   managed namespace, then create the exact BasePath marker on every node
   **before** Helm exposes the default StorageClass. This closes Kubernetes'
   retroactive default assignment race for pre-existing Pending PVCs.
6. Install or reconcile the exact managed 4.5.1 release using Helm 4.1+
   rollback-on-failure semantics. Dynamic LocalPV 4.5.1 declares but does not
   render its controller `securityContext`; the lifecycle helper therefore
   patches and verifies the container controls in the table after every Helm
   reconciliation. The controller keeps its ServiceAccount token to watch
   PVC/PV objects and gets a writable `emptyDir` only at `/tmp` for process
   logs. Upstream 4.5.1 does not expose resource requests/limits for its
   dynamically generated privileged init/cleanup/quota Pods, so those short-
   lived helpers are a documented dev-only BestEffort exception; the
   long-running controller remains resource-bounded. Mark the cluster-scoped resources as owned, record the runtime, and
   verify the release, Deployment, StorageClass fields, and sole default. The timeout defaults to 10 minutes; set
   `KAMIWAZA_OPENEBS_TIMEOUT` to a valid Helm duration only when a slower
   connected environment requires it.
7. Only after this succeeds may Helmfile install Kamiwaza PVC consumers. The
   post-bootstrap preflight is strict: an unreachable Kubernetes API is a
   failure rather than an indeterminate pass. Later platform readiness includes
   bound PVCs and ready workloads.

The helper's direct interface is useful for diagnosis and focused qualification:

```bash
# Choose the runtime that actually owns this cluster.
KUBECONFIG_PATH="${HOME}/.kube/config"
CLUSTER_UID="$(kubectl --kubeconfig "${KUBECONFIG_PATH}" \
  get namespace kube-system -o jsonpath='{.metadata.uid}')"
./scripts/k0s-openebs-localpv.sh install \
  --runtime k0s-lima \
  --kubeconfig "${KUBECONFIG_PATH}" \
  --expected-cluster-uid "${CLUSTER_UID}"
./scripts/k0s-openebs-localpv.sh verify \
  --runtime k0s-lima \
  --kubeconfig "${KUBECONFIG_PATH}" \
  --expected-cluster-uid "${CLUSTER_UID}"

# Example only when a site override explicitly selects an existing class.
./scripts/k0s-openebs-localpv.sh install \
  --runtime k0s-podman \
  --kubeconfig "${KUBECONFIG_PATH}" \
  --expected-cluster-uid "${CLUSTER_UID}" \
  --configured-storage-class operator-class
```

Do not pass a class merely to bypass bootstrap. The explicit-class path proves
existence, while the operator still owns suitability, access mode, topology,
capacity, and reclaim behavior.

## Verify an installed cluster

Run these against the intended local kube context. They disclose no Secret
values.

### Release, workload, and component profile

```bash
./scripts/k0s-openebs-localpv.sh verify

helm list -n kamiwaza-openebs \
  --filter '^kamiwaza-openebs$' \
  -o json

kubectl -n kamiwaza-openebs get deployment,daemonset,statefulset
kubectl -n kamiwaza-openebs rollout status \
  deployment/kamiwaza-openebs-localpv-provisioner \
  --timeout=180s

kubectl -n kamiwaza-openebs get deployment \
  kamiwaza-openebs-localpv-provisioner \
  -o jsonpath='{.spec.template.spec.containers[0].securityContext}{"\n"}{.spec.template.spec.containers[0].volumeMounts}{"\n"}{.spec.template.spec.volumes}{"\n"}'
```

The Helm row must report chart `openebs-4.5.1`. Exactly one persistent workload
must be present and Ready: Deployment
`kamiwaza-openebs-localpv-provisioner`. A BasePath `mark` or `clean` DaemonSet
can exist briefly while the helper is running; it must disappear afterward.
The controller container must run as non-root UID/GID 1000, disable privilege
escalation, drop `ALL` capabilities, and use a read-only root filesystem. Its
only writable mount is the `controller-tmp` `emptyDir` at `/tmp`.
Mayastor, LVM, ZFS, rawfile, Loki, Alloy, NATS, MinIO, and snapshot-controller
workloads are unintended in this namespace.

### StorageClass contract

```bash
kubectl get storageclass kamiwaza-openebs-hostpath \
  -o jsonpath='{.provisioner}{"\n"}{.reclaimPolicy}{"\n"}{.volumeBindingMode}{"\n"}{.allowVolumeExpansion}{"\n"}{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}{"\n"}{.metadata.annotations.storageclass\.beta\.kubernetes\.io/is-default-class}{"\n"}{.metadata.annotations.cas\.openebs\.io/config}{"\n"}'

kubectl get storageclass \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}{"\t"}{.metadata.annotations.storageclass\.beta\.kubernetes\.io/is-default-class}{"\n"}{end}'
```

Confirm `openebs.io/local`, `Delete`, `WaitForFirstConsumer`, expansion empty or
`false`, only the current default annotation set to `true`, and the BasePath in
the table above. The default listing must not contain a second default.

### Kamiwaza claims

```bash
kubectl get pvc -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,STATUS:.status.phase,CLASS:.spec.storageClassName,VOLUME:.spec.volumeName'

kubectl get pv \
  -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,CLASS:.spec.storageClassName,CLAIM:.spec.claimRef.namespace/.spec.claimRef.name,NODE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]'
```

All intended platform claims must be `Bound`. A claim using the managed class
remains `Pending` until Kubernetes schedules its first consumer because the
class uses `WaitForFirstConsumer`.

### Disposable provision, write, and reclaim probe

Run this only on a disposable local cluster. It creates an isolated namespace,
1Gi claim, and BusyBox Pod; then it removes them and proves the PV was reclaimed.

```bash
export PROBE_NS="kamiwaza-storage-probe-$(date +%s)"
kubectl create namespace "${PROBE_NS}"

kubectl -n "${PROBE_NS}" apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: localpv-probe
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: kamiwaza-openebs-hostpath
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: localpv-probe
spec:
  restartPolicy: Never
  containers:
    - name: probe
      image: docker.io/library/busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: localpv-probe
EOF

kubectl -n "${PROBE_NS}" wait --for=condition=Ready pod/localpv-probe --timeout=180s
kubectl -n "${PROBE_NS}" exec localpv-probe -- sh -c \
  'printf "openebs-localpv-ok\n" > /data/probe && grep -Fx openebs-localpv-ok /data/probe'
export PROBE_PV="$(kubectl -n "${PROBE_NS}" get pvc localpv-probe -o jsonpath='{.spec.volumeName}')"
test -n "${PROBE_PV}"
kubectl delete namespace "${PROBE_NS}" --wait=true --timeout=180s
kubectl wait --for=delete "pv/${PROBE_PV}" --timeout=180s
unset PROBE_NS PROBE_PV
```

If a command fails, stop and diagnose before deleting additional PVCs or
changing the provisioner.

## Safe uninstall

:::danger This deletes local application data
On Linux and legacy macOS `k0s-podman`, scoped dev uninstall deletes each Kamiwaza-owned
application or sandbox namespace that currently has a PVC backed by
`kamiwaza-openebs-hostpath`; product namespaces without a managed PVC are left
alone. On `k0s-lima`, deleting the selected VM destroys all data inside that VM
without waiting on Kubernetes namespace finalizers. Export or back up anything
you need before continuing. This runbook does not make LocalPV data durable.
:::

Use the normal wrapper, with the runtime marker and kube context pointing to the
cluster you intend to destroy:

```bash
./scripts/uninstall-dev.sh
```

Do not substitute a direct
`ansible-playbook playbooks/uninstall/dev.yml` invocation, including
`--tags cluster`, for the wrapper. On persistent `k0s-podman`, the Ansible role
refuses before `k0s stop` or `k0s reset` whenever the exact OpenEBS namespace,
StorageClass, BasePath marker, or crash-recovery receipt exists or cannot be
proved absent. The wrapper must complete the target-UID-pinned storage drain
first.

Do not use `--full-cleanup` as storage recovery. It broadens host cleanup and
does not repair ownership or reclaim ordering.

Install, verify, and persistent-runtime teardown flatten the explicitly
supplied kubeconfig into a mode-`0600`, single-context private snapshot, then
assert the `kube-system` UID read directly from the selected runtime before any
storage mutation. Every subsequent kubectl and Helm call uses that immutable
snapshot; external `exec` and `auth-provider` credential plugins are rejected.
Linux teardown generates its private source kubeconfig from the
resolved absolute k0s binary; it never enumerates ambient contexts or invokes
their credential plugins. Ambient `KUBECONFIG` or current-context state is not
a target. Both the direct runtime UID lookup and the private-kubeconfig check
retry five times by default, with a 10-second request timeout and two seconds
between attempts. Sudo denial is reported separately from an API/identity
failure. On macOS `k0s-podman`, a host `k0s` binary is unrelated and is never
used: the wrapper starts the selected Podman machine when necessary, reads its
cluster UID and admin kubeconfig through `podman machine ssh`, normalizes only
that exact VM-internal API endpoint to the installer's existing
`localhost:6443` forward, and runs the same managed-resource drain against that
VM-owned cluster. Any unexpected kubeconfig endpoint fails closed.

Every k0s installer labels its exact controller/runtime node
`kamiwaza.ai/local-dev-storage=true`. The managed StorageClass uses that label
as its only node-affinity identity, and the BasePath mark/clean helper uses the
same nodeSelector. Joined compute workers cannot receive installer-owned
LocalPV data or an empty managed BasePath. A workload that genuinely needs
persistent storage on another node must use an operator-provided StorageClass;
do not copy the installer label onto that worker.

For `k0s-lima`, including opt-in `bridged-worker`, the managed BasePath therefore
exists only inside the explicitly selected VM. The wrapper skips the redundant
in-cluster namespace/PV drain, then its existing target guards remove that VM.
This avoids turning a namespace finalizer stall or teardown-time image pull into
a failed uninstall without leaving data on joined workers. The wrapper and the
Ansible role both fail closed if Lima inventory cannot be read. A failed initial
`limactl delete` reaps only helpers rooted in the exact selected instance
directory and retries once; a remaining failure aborts. An uninstall cannot
report success while the VM-local release or BasePath may still exist.

For `k0s-podman`, where `/var/local` persists across `k0s reset` on native
Linux or inside the Podman VM, the
implemented safe order is exact:

1. While the Kubernetes API and provisioner are still running, require the
   exact `openebs-4.5.1` release, owned namespace, owned StorageClass, and an
   exact match between requested runtime and the namespace's recorded runtime.
2. Find namespaces that actually have PVCs using the managed StorageClass and
   require more than the Kamiwaza application or sandbox label: each namespace
   must carry matching Helm ownership for a live, deployed, allowlisted first-
   party namespace chart and must not set `helm.sh/resource-policy: keep`.
   Enumerate and cleanly uninstall every Helm release in those owned consumer
   namespaces, recheck the exact owner metadata and Kubernetes UID, then issue
   a UID-preconditioned namespace DELETE. Wait up to 600 seconds for each
   namespace to disappear. A shared, foreign, relabeled, kept, or concurrently
   replaced namespace fails closed. A routine finalizer stall
   preserves the cluster and reports non-destructive recovery guidance; it is
   not a reason to use forced data-loss recovery.
3. Wait up to 600 seconds for PVs using
   `kamiwaza-openebs-hostpath` and OpenEBS helper Pods to reach zero. The
   provisioner and its reclaim helpers are still alive here, so
   `reclaimPolicy: Delete` can remove each backing directory. Released or
   Failed managed PVs are explicitly re-submitted for deletion. Helper Pods are
   matched by the pod name, container name, and the exact image read from the
   owned controller Deployment. The helper accepts only the pinned
   `openebs/linux-utils:4.5.0` repository/tag with any registry prefix; an
   unexpected or missing value fails closed.
4. Run a root-uid, non-privileged cleanup helper on every node while the Helm
   ownership evidence still exists. It drops all Linux capabilities and adds
   back only `DAC_OVERRIDE` and `FOWNER`, which are required to traverse and
   remove arbitrary workload-owned modes such as `0700`; privilege escalation
   remains disabled. It validates only
   `/var/local/kamiwaza/openebs/localpv-hostpath`, and only when
   `.kamiwaza-managed` has exactly four ordered lines matching the owner,
   nonempty cluster UID, release name, and exact BasePath. The UID may name the
   immediately previous cluster after a reset because the explicit kubeconfig
   and current target UID were already asserted before the DaemonSet ran. A
   missing, malformed, or otherwise mismatched marker stops cleanup. After
   validation, it hard-links that marker to a fixed external ownership receipt,
   atomically renames the BasePath to `.deleting`, and recursively removes the
   tombstone. If the BasePath is a dedicated or bind-mounted filesystem, the
   helper detects that topology, creates an exact same-filesystem
   `.kamiwaza-delete-in-place` receipt, deletes children in place, removes the
   ownership marker last, and leaves only the operator-owned empty mountpoint.
   `HostToContainer` mount propagation makes nested host mounts visible to the
   helper. If the helper is killed at any point, the next install or uninstall
   validates the surviving marker or receipt and resumes safely, including an
   in-path receipt left after a dedicated mount was later unmounted. A foreign,
   symlinked, malformed, or ambiguous tombstone still fails closed.
5. Uninstall only Helm release `kamiwaza-openebs` from namespace
   `kamiwaza-openebs`, waiting up to 10 minutes by default. Running marker cleanup first
   prevents an interruption after Helm uninstall from discarding the evidence
   needed to clean node data; cleanup is idempotent if this step must be
   retried.
6. Delete only the owned StorageClass, provisioner ClusterRole,
   ClusterRoleBinding, and namespace. Every deletion rechecks the three
   ownership signals.
7. Return to `uninstall-dev.sh`, which can now reset the selected runtime.

If target kubeconfig/UID binding or any managed-storage cleanup step fails,
`uninstall-dev.sh` stops before Ansible resets the Linux runtime. This preserves
the cluster that owns the path and prevents a later install from treating an
old UID as permission to reclaim data that cleanup deliberately refused. Fix
the reported sudo, API, ownership, namespace, PV, helper, or marker failure and
rerun normal uninstall; do not reset k0s manually.

Native Linux storage teardown requires current sudo authorization. Before a
batch or non-interactive invocation, run `sudo -v` in an interactive shell.
If authorization expires or is denied, both normal and forced cleanup stop
before runtime reset; the force flag never bypasses sudo or ownership checks.
Reauthorize and rerun the same uninstall command.

`KAMIWAZA_OPENEBS_CLEANUP_TIMEOUT_SECONDS` must be a positive integer and
controls consumer-namespace and PV/helper waits plus BasePath-helper rollout
and readiness (default `600`). A marker or deletion guard failure emits a
`REFUSING managed BasePath ...` diagnostic in the helper logs before the
lifecycle stops. Increase the budget only when a healthy
cluster is making slow, observable teardown progress. `KAMIWAZA_OPENEBS_TIMEOUT`
separately controls Helm operations (default `10m`). A timeout is a reason to
inspect and retry the preserved cluster, not to force data loss.

If a consumer namespace is stuck `Terminating`, inspect its remaining objects,
conditions, and finalizers while the owning cluster is still running:

```bash
kubectl get namespace <namespace> -o yaml
kubectl get all,pvc -n <namespace>
kubectl get events -n <namespace> --sort-by=.lastTimestamp
```

Resolve the responsible controller or finalizer through its normal teardown
path, then rerun `uninstall-dev.sh`. Do not remove finalizers by hand and do not
use the force flag for a routine finalizer stall.

For an irrecoverably broken **Linux or macOS `k0s-podman`** cluster, the only
supported override is deliberately explicit and destructive:

```bash
./scripts/uninstall-dev.sh \
  --force-local-runtime-delete-with-storage-data-loss
```

The wrapper first attempts normal cleanup. Only after that fails does this flag
stop k0s, revalidate the exact marker or crash-recovery receipt before and after
the stop, and remove the fixed
`/var/local/kamiwaza/openebs/localpv-hostpath`, and continue its crash-safe
deletion. On macOS the wrapper streams that same fixed-path helper into the
selected Podman VM; it never targets the Darwin host filesystem. It does not accept a configurable path and refuses missing,
symlinked, malformed, foreign, or ambiguous ownership state. Every PVC backed
by the managed class is permanently lost. Do not use this flag on a recoverable
cluster or to bypass an ownership refusal you have not investigated. It is
rejected for Lima. The one markerless exception is an exact empty,
non-symlink BasePath: it contains no data and represents a safe interrupted
create, so install may claim it and forced host cleanup may remove it only
after stopping k0s. A dedicated BasePath mount remains mounted but must be
empty and contain neither ownership marker nor deletion receipt after cleanup.
A standard uninstall that first proves the selected runtime is already absent
or reset invokes this same fixed-path, marker-guarded recovery automatically;
that reset-state path does not relax ownership. A nonempty unowned path always fails closed. `make clean`
uses the same marker-guarded host action before native-Linux k0s reset; a
refusal aborts that reset.

`make clean` is not an ownership bypass. If it refuses a nonempty unowned or
malformed BasePath, preserve the host and inspect the exact fixed path first:

```bash
sudo ls -la /var/local/kamiwaza/openebs/localpv-hostpath
sudo find /var/local/kamiwaza/openebs/localpv-hostpath \
  -mindepth 1 -maxdepth 2 -print
```

Determine which cluster or operator owns the contents. Do not fabricate a
marker or reset k0s while the origin is unclear. Only after the operator proves
that exact path is disposable may they run:

```bash
sudo rm -rf -- /var/local/kamiwaza/openebs/localpv-hostpath
make clean
```

That manual data-loss decision is deliberately outside automated cleanup; the
refusal preserves the runtime and evidence needed to make it.

Deleting the provisioner first is unsafe. PVC deletion would still remove API
objects, but no controller/helper would remain to execute `Delete` against the
host directories. The PVs and BasePath children could leak until manual node
cleanup, and VM teardown could hide the leak rather than prove reclamation.

Namespaces without a PVC using `kamiwaza-openebs-hostpath`, plus foreign
StorageClasses, OpenEBS releases, namespaces, PVs, paths, and backups, are not
adopted or deleted. A namespace with a managed PVC must also have the expected
Kamiwaza application or sandbox label, matching Helm ownership for an
allowlisted deployed first-party namespace chart, no keep policy, and stable
UID/metadata; otherwise uninstall fails closed before requesting any namespace
deletion. The managed OpenEBS namespace is never adopted from labels alone.
An unrelated Pod is not counted as a managed reclaim helper merely because its
name has a similar prefix. The wrapper's separate model state export is best
effort; it is not the same as a verified storage backup.

### Zero-residue check

On Linux, when the helper has completed but before a runtime is manually reset,
verify the Kubernetes objects are absent:

```bash
helm list -A --filter '^kamiwaza-openebs$'
kubectl get namespace kamiwaza-openebs
kubectl get storageclass kamiwaza-openebs-hostpath
kubectl get clusterrole,clusterrolebinding \
  -l 'kamiwaza.ai/component=local-dev-storage'
kubectl get pv \
  -o custom-columns='NAME:.metadata.name,CLASS:.spec.storageClassName,STATUS:.status.phase' \
  | grep -F kamiwaza-openebs-hostpath
```

Every lookup/listing must show no managed release or resource, and the
PV filter must return no rows. `kubectl get` for a named absent resource
exits nonzero; that expected `NotFound` is the clean result. The normal Linux
uninstall also runs the host-state validator, whose sixth assertion requires
the `.deleting` tombstone and both deletion receipts to be absent, including
broken symlinks. The BasePath itself must be absent unless it is a verified
operator-owned mountpoint; that retained mountpoint must be empty and unmarked.

On Lima, verify the selected VM is absent after the wrapper completes rather
than querying the Kubernetes API that VM owned:

```bash
limactl list -q | grep -Fx 'kamiwaza-k0s' && echo 'unexpected VM residue'
```

If you ran the storage helper directly and deliberately kept the node alive,
check its exact path before proceeding:

```bash
# Default Lima VM only when invoking the helper directly and keeping the VM.
limactl shell kamiwaza-k0s -- \
  sudo test ! -e /var/local/kamiwaza/openebs/localpv-hostpath

# Native Linux k0s-podman. Absence is normal; an intentionally mounted
# BasePath may remain only when it is empty and unmarked.
if sudo test -e /var/local/kamiwaza/openebs/localpv-hostpath; then
  sudo find /var/local/kamiwaza/openebs/localpv-hostpath \
    -mindepth 1 -maxdepth 1 -print -quit
fi

# Podman-machine runtime.
podman machine ssh -- "sudo sh -c '
  if [ -e /var/local/kamiwaza/openebs/localpv-hostpath ]; then
    find /var/local/kamiwaza/openebs/localpv-hostpath \
      -mindepth 1 -maxdepth 1 -print -quit
  fi
'"
```

Do not search for and remove other `openebs`, `/var/local`, or PV directories.
If the exact path remains, preserve the cluster and inspect the helper failure.

## Troubleshooting and recovery boundaries

### No default StorageClass

This is the expected trigger on a fresh local k0s cluster. The helper should
install the managed class. If it does not, inspect its command output, the
release, and namespace events rather than creating a StorageClass manually:

```bash
helm status kamiwaza-openebs -n kamiwaza-openebs
kubectl -n kamiwaza-openebs get events --sort-by=.lastTimestamp
kubectl -n kamiwaza-openebs describe deployment kamiwaza-openebs-localpv-provisioner
kubectl -n kamiwaza-openebs logs deployment/kamiwaza-openebs-localpv-provisioner
```

### Explicit or foreign StorageClass wins

An explicit configured class always wins if it exists, even when it is not
default. A foreign dynamic default also wins. This is intentional, not a
failed OpenEBS install. Verify that the selected class can satisfy the actual
RWO claims. If the class was selected accidentally, correct the site values or
default annotation and rerun the normal installer; do not delete foreign
classes.

The helper stops on these ambiguous or unsafe states:

- the explicit class does not exist;
- a foreign default has no dynamic provisioner or uses
  `kubernetes.io/no-provisioner`;
- managed and foreign classes are both default;
- the managed name exists without the expected ownership metadata;
- the managed Helm release exists with a chart other than `openebs-4.5.1`.

Resolve ownership or configuration at its source. Do not relabel a foreign
resource to force adoption.

### PVC remains Pending

First determine whether it has a consumer. `WaitForFirstConsumer` deliberately
keeps an unused PVC Pending.

```bash
kubectl get pvc -A -o wide
kubectl describe pvc -n <namespace> <claim>
kubectl get pods -n <namespace> -o wide
kubectl describe pod -n <namespace> <consumer-pod>
kubectl -n kamiwaza-openebs logs deployment/kamiwaza-openebs-localpv-provisioner
kubectl get events -A --sort-by=.lastTimestamp
```

Check scheduling/topology, requested class, node readiness, provisioner image
pulls, and capacity/filesystem errors. Do not toggle binding mode or expansion
on the live class as a shortcut.

### Marker or cluster-UID mismatch

The BasePath marker contains four exact, ordered lines: owner, cluster UID,
release, and BasePath. A malformed marker or an owner, release, or BasePath
mismatch means the helper cannot prove the directory belongs to this
integration, so it must not delete it. Preserve the node and helper logs.
Confirm the kube context, `kube-system` UID, recorded runtime, release identity,
and ownership labels. Do not fabricate a marker or recursively delete the path.

`k0s reset` can legitimately give the same preserved node disk a new
`kube-system` UID. During the next normal install, an otherwise exact four-line
Kamiwaza marker with only an old cluster UID is reclaimable: the helper removes
the now-unreachable old PV children and rewrites the marker for the new cluster.
If a reinstall then rolls back before rewriting that UID, normal uninstall may
also remove the same exact owned path after it proves the explicitly targeted
replacement cluster. This recovery does not apply when the UID is empty or any
other marker field or shape differs.

### Partial install or uninstall

If the release is absent and only the empty owned namespace remains, uninstall
runs the idempotent marker-guarded cleanup before deleting that namespace. This
safely handles both a rollback-on-failure install and an older uninstall
interrupted after Helm removal. If an owned StorageClass or other partial state
also remains, uninstall stops and instructs you to rerun install before
uninstalling so the provisioner/reclaim path is coherent. If the release
exists, the helper will only reconcile the expected 4.5.1 chart and owned
resources. If Helm 4.1+ is unavailable, an already-clean target with no managed
Kubernetes evidence is a successful no-op. Any remaining managed namespace,
class, RBAC, or Helm release evidence stops and requires supported Helm so
release ownership can be verified before mutation. Capture state first:

```bash
helm list -A --all
kubectl get namespace kamiwaza-openebs --show-labels
kubectl get storageclass kamiwaza-openebs-hostpath -o yaml
kubectl get pv,pvc -A
kubectl -n kamiwaza-openebs get all
kubectl -n kamiwaza-openebs get events --sort-by=.lastTimestamp
```

The StorageClass output contains no Secret data, but review collected YAML
before sharing it. Avoid `kubectl get secret`, `helm get values --all`, or broad
support bundles unless the recipient and redaction path are approved.

### Chart, registry, keychain, or image failure

Treat the failing boundary separately:

- Chart repository/index/TLS failure happens before Kubernetes resources are
  ready. Test access to `https://openebs.github.io/openebs` and rerun the normal
  helper; do not remove the version pin. Offline local k0s runs must use an
  existing dynamic default or an explicit `storage.stateful.standard` instead
  of attempting this online bootstrap.
- Registry or image-pull failure appears in Pod events. Check access to the
  exact OpenEBS images in the 4.5.1 chart and the pinned `linux-utils:4.5.0`
  helper. Do not enable another engine to work around a pull.
- macOS keychain/credential-helper failure belongs to host registry
  authentication, not the StorageClass contract. Fix the credential boundary
  and retry; never paste credentials into logs or Helm values.
- Helm 4.1+ rollback-on-failure should remove the attempted release. The helper's
  timeout defaults to 10 minutes; `KAMIWAZA_OPENEBS_TIMEOUT` may be set to a
  longer valid Helm duration for an unusually slow connected environment. If
  owned residue remains, follow the partial-state recovery above.

Implementation tests live in
`scripts/tests/test_k0s_default_storage_contracts.py`, with installer wiring
assertions also in `scripts/tests/test_deploy_script_contracts.py`. Runtime
output comes from `scripts/install-dev.sh`, the selected k0s installer, and
`scripts/uninstall-dev.sh`; preserve the corresponding UAT/install logs when a
failure is not reproducible with the focused helper.

Do not use `--full-cleanup`, delete PVCs casually, remove finalizers, hand-edit
PVs, recreate ownership labels, or recursively delete host paths as recovery.
Those actions destroy evidence or bypass the provisioner ordering that makes
reclaim safe.

## Upgrade the pin

An OpenEBS upgrade is a deploy implementation change followed by disposable
runtime qualification. Do not edit only this runbook and do not float the chart
version.

1. Inspect the official stable OpenEBS release, umbrella `Chart.yaml`, complete
   default values, dependency versions, rendered manifests, and declared image
   list. Review release notes from 4.5.1 through the candidate patch.
2. Diff candidate defaults against
   `cluster/values/openebs-localpv-dev.yaml`. Prove the override keys still take
   effect. In particular, do not accidentally enable LVM, ZFS, rawfile,
   Mayastor, Loki, Alloy, MinIO, NATS, snapshot CRDs/controllers, analytics,
   quota handling, node deployment, or pre-upgrade hooks.
3. Update the exact chart/app pin and any deliberately pinned helper image in
   `scripts/k0s-openebs-localpv.sh`. Update the narrow values only for reviewed
   schema changes; preserve release, namespace, class, provisioner, BasePath,
   reclaim, binding, expansion, ownership, and private-Helm-state contracts
   unless a separate design explicitly changes them.
4. Update the focused contract tests and any installer/uninstaller wiring tests
   that encode the exact version, resources, and order.
5. Run at least:

   ```bash
   python3 -m pytest -q scripts/tests/test_k0s_default_storage_contracts.py
   python3 -m pytest -q scripts/tests/test_deploy_script_contracts.py
   ```

   Also run the repository's normal shell/static checks for every changed
   script and values file.
6. Render the candidate profile and inspect every object and image. The expected
   steady-state workload count remains one Ready provisioner Deployment unless
   an approved design says otherwise.
7. On fresh disposable `k0s-lima` and `k0s-podman` clusters, run the provision,
   write, and reclaim probe above. Verify real Kamiwaza PVCs bind and platform
   workloads become Ready.
8. Run a fresh uninstall/install KZUAT cycle on each supported local runtime.
   On Linux, prove only managed-PVC consumer namespaces drain, orphaned PV
   deletion is retried, helper counts reach zero, and marker-guarded BasePath
   cleanup succeeds before Helm uninstall. On default Lima `vznat`, prove the
   exact selected VM disappears without waiting on namespace finalizers and
   backup VMs remain. With a joined worker in `bridged-worker` mode, prove the
   managed class cannot provision there and the BasePath helper never creates
   the fixed path on that worker. For both, prove reinstall is clean and target
   UID mismatch fails closed.
9. Land deploy code, values, tests, evidence, and this documentation update
   together through review. The next runbook must say which stable patch was
   selected and when; it must not claim an old pin is still "latest."

Release notes alone are insufficient. The gate is the rendered narrow profile
plus a real disposable provision/reclaim and uninstall/install lifecycle.
