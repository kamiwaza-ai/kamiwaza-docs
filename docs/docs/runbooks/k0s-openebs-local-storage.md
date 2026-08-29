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
| Volume expansion | Disabled |
| Default annotation | Current annotation is `true`; beta annotation is not `true` |
| Ready workload | One Deployment: `kamiwaza-openebs-localpv-provisioner` |
| Helper image | `docker.io/openebs/linux-utils:4.5.0` |
| Controller pod security | Non-root UID/GID 1000; `RuntimeDefault` seccomp |
| BasePath cleanup security | UID 0, non-privileged, escalation disabled; drop all capabilities, then add only `DAC_OVERRIDE` and `FOWNER` |

Only dynamic LocalPV Hostpath is enabled. LocalPV LVM, ZFS, and rawfile,
replicated Mayastor, Loki, Alloy, MinIO, analytics, quota management, snapshot
CRDs, and the umbrella pre-upgrade hook are disabled. A render of the pinned
profile contains only the provisioner ServiceAccount, StorageClass,
ClusterRole, ClusterRoleBinding, and Deployment.

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
[`e262239d`](https://github.com/kamiwaza-internal/deploy/commit/e262239d9ca2e7072b71268b681d41f7392b7397):

- [lifecycle helper](https://github.com/kamiwaza-internal/deploy/blob/e262239d9ca2e7072b71268b681d41f7392b7397/scripts/k0s-openebs-localpv.sh)
- [pinned narrow values](https://github.com/kamiwaza-ai/deploy/blob/6b36d55f861d5acd3eb3b3b558141ed4f35d5268/cluster/values/openebs-localpv-dev.yaml)
- [storage configuration](https://github.com/kamiwaza-ai/deploy/blob/6b36d55f861d5acd3eb3b3b558141ed4f35d5268/docs/storage-configuration.md)
- [contract tests](https://github.com/kamiwaza-ai/deploy/blob/6b36d55f861d5acd3eb3b3b558141ed4f35d5268/scripts/tests/test_k0s_default_storage_contracts.py)

OpenEBS publishes the corresponding [v4.5.1 release](https://github.com/openebs/openebs/releases/tag/v4.5.1).

## Install decision and order

Use the ordinary dev entry point from the deploy repository:

```bash
./scripts/install-dev.sh
```

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
4. With no explicit or existing dynamic default, install or reconcile the exact
   managed 4.5.1 release. A same-named namespace, StorageClass, or Helm release
   with missing ownership or an unexpected chart is a hard stop.
5. Mark the exact cluster-scoped resources as owned, record the runtime, create
   a marker for the exact BasePath on every node, and verify the release,
   Deployment, StorageClass fields, and sole default.
6. Only after this succeeds may Helmfile install Kamiwaza PVC consumers. The
   normal preflight verifies that an explicit class exists or a default is now
   present; later platform readiness includes bound PVCs and ready workloads.

The helper's direct interface is useful for diagnosis and focused qualification:

```bash
# Choose the runtime that actually owns this cluster.
./scripts/k0s-openebs-localpv.sh install --runtime k0s-lima
./scripts/k0s-openebs-localpv.sh verify

# Example only when a site override explicitly selects an existing class.
./scripts/k0s-openebs-localpv.sh install \
  --runtime k0s-podman \
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
```

The Helm row must report chart `openebs-4.5.1`. Exactly one persistent workload
must be present and Ready: Deployment
`kamiwaza-openebs-localpv-provisioner`. A BasePath `mark` or `clean` DaemonSet
can exist briefly while the helper is running; it must disappear afterward.
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
On Linux `k0s-podman`, scoped dev uninstall deletes each Kamiwaza-owned
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

Do not use `--full-cleanup` as storage recovery. It broadens host cleanup and
does not repair ownership or reclaim ordering.

Both install and persistent-Linux teardown use an explicit kubeconfig and
assert the `kube-system` UID read directly from the selected runtime before any
storage mutation. Ambient `KUBECONFIG` or current-context state is not a target.

For `k0s-lima`, the BasePath exists inside the explicitly selected VM. The
wrapper skips the redundant in-cluster namespace/PV drain, then its existing
target guards remove that VM. This avoids turning a namespace finalizer stall
or teardown-time image pull into a failed uninstall without leaving host data.

For Linux `k0s-podman`, where `/var/local` persists across `k0s reset`, the
implemented safe order is exact:

1. While the Kubernetes API and provisioner are still running, require the
   exact `openebs-4.5.1` release, owned namespace, owned StorageClass, and an
   exact match between requested runtime and the namespace's recorded runtime.
2. Find namespaces that actually have PVCs using the managed StorageClass,
   require each one to carry the Kamiwaza application or sandbox ownership
   label, request their deletion, then wait up to 180 seconds for each to
   disappear.
3. Wait up to 180 seconds for PVs using
   `kamiwaza-openebs-hostpath` and OpenEBS helper Pods to reach zero. The
   provisioner and its reclaim helpers are still alive here, so
   `reclaimPolicy: Delete` can remove each backing directory. Released or
   Failed managed PVs are explicitly re-submitted for deletion. Helper Pods are
   matched by the pod name, container name, and image contract in pinned
   Dynamic LocalPV 4.2.0, not by an invented label.
4. Run a root-uid, non-privileged cleanup helper on every node while the Helm
   ownership evidence still exists. It drops all Linux capabilities and adds
   back only `DAC_OVERRIDE` and `FOWNER`, which are required to traverse and
   remove arbitrary workload-owned modes such as `0700`; privilege escalation
   remains disabled. It removes only
   `/var/local/kamiwaza/openebs/localpv-hostpath`, and only when
   `.kamiwaza-managed` matches the owner, current `kube-system` cluster UID,
   release name, and exact BasePath. A missing or mismatched marker stops
   cleanup.
5. Uninstall only Helm release `kamiwaza-openebs` from namespace
   `kamiwaza-openebs`, waiting up to five minutes. Running marker cleanup first
   prevents an interruption after Helm uninstall from discarding the evidence
   needed to clean node data; cleanup is idempotent if this step must be
   retried.
6. Delete only the owned StorageClass, provisioner ClusterRole,
   ClusterRoleBinding, and namespace. Every deletion rechecks the three
   ownership signals.
7. Return to `uninstall-dev.sh`, which can now reset the selected Linux runtime.

Deleting the provisioner first is unsafe. PVC deletion would still remove API
objects, but no controller/helper would remain to execute `Delete` against the
host directories. The PVs and BasePath children could leak until manual node
cleanup, and VM teardown could hide the leak rather than prove reclamation.

Namespaces without a PVC using `kamiwaza-openebs-hostpath`, plus foreign
StorageClasses, OpenEBS releases, namespaces, PVs, paths, and backups, are not
adopted or deleted. A namespace with a managed PVC must also have the expected
Kamiwaza application or sandbox label; otherwise uninstall fails closed before
requesting any namespace deletion.
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
exits nonzero; that expected `NotFound` is the clean result.

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

# Podman-machine runtime.
podman machine ssh -- \
  sudo test ! -e /var/local/kamiwaza/openebs/localpv-hostpath
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
This recovery does not apply when any other marker field or shape differs.

### Partial install or uninstall

If the release is absent and only the empty owned namespace remains, uninstall
runs the idempotent marker-guarded cleanup before deleting that namespace. This
safely handles both an atomic install rollback and an older uninstall
interrupted after Helm removal. If an owned StorageClass or other partial state
also remains, uninstall stops and instructs you to rerun install before
uninstalling so the provisioner/reclaim path is coherent. If the release
exists, the helper will only reconcile the expected 4.5.1 chart and owned
resources. Capture state first:

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
  helper; do not remove the version pin.
- Registry or image-pull failure appears in Pod events. Check access to the
  exact OpenEBS images in the 4.5.1 chart and the pinned `linux-utils:4.5.0`
  helper. Do not enable another engine to work around a pull.
- macOS keychain/credential-helper failure belongs to host registry
  authentication, not the StorageClass contract. Fix the credential boundary
  and retry; never paste credentials into logs or Helm values.
- An atomic Helm failure should roll back the attempted release. If owned
  residue remains, follow the partial-state recovery above.

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
   cleanup succeeds before Helm uninstall. On Lima, prove the exact selected VM
   disappears without waiting on namespace finalizers and backup VMs remain.
   For both, prove reinstall is clean and target UID mismatch fails closed.
9. Land deploy code, values, tests, evidence, and this documentation update
   together through review. The next runbook must say which stable patch was
   selected and when; it must not claim an old pin is still "latest."

Release notes alone are insufficient. The gate is the rendered narrow profile
plus a real disposable provision/reclaim and uninstall/install lifecycle.
