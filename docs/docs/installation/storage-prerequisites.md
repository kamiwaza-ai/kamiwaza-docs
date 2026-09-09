# Storage prerequisites

These prerequisites apply to the `develop` storage contract after removal of
bundled Rook/Ceph. Older release artifacts must use their versioned installation
instructions. Do not assume a published artifact has this contract from its
version number alone; confirm it with the release owner.

The platform administrator provides block storage before the tenant installs
Kamiwaza. The tenant installer creates application PVCs but does not install a
CSI driver, create StorageClasses, or receive cluster-scoped permissions.

## Prepare block storage

On a managed cluster, use its administrator-provided RWO StorageClass, such as
the platform's managed CSI class. On appliance or bare-metal hosts, prepare
Longhorn and its host prerequisites as part of cluster setup. Local developer
setup selects Longhorn by default; the explicitly selected local-path fallback
is node-local storage and does not provide replicated durability.

For a new host using the online installer, run `--phase1-only` to bootstrap k0s,
then prepare storage before rerunning the installer without that flag. For an
offline host, stage the storage driver's chart, images, and host packages with
the platform administrator and verify it without outbound access before product
installation. The product bundle does not supply those platform prerequisites.
For a blank disconnected host, first follow the administrator-owned
[offline Kubernetes bootstrap](offline_install.md#step-0-prepare-the-disconnected-kubernetes-substrate).

Use the administrator kubeconfig to inspect the selected class:

```bash
kubectl --kubeconfig "$ADMIN_KUBECONFIG" get storageclass
kubectl --kubeconfig "$ADMIN_KUBECONFIG" get storageclass "$STORAGE_CLASS" -o yaml
```

The administrator should configure exactly one default StorageClass for a local
cluster. A managed environment may instead require an explicitly selected class.
For Helmfile installs, set `storage.stateful.standard` in
`cluster/values/storage-overrides.yaml`; for a tenant Helm installation use the
StorageClass values supplied by the platform's substrate handoff.

Before installing, create a disposable RWO PVC and consumer pod in the designated
validation namespace. Wait for the consumer to run (a `WaitForFirstConsumer`
class does not bind an unused claim), write a marker to the mounted volume,
and read it back from a replacement consumer. Record the StorageClass, bound PV,
marker, and result; remove only that test's pod and claim afterward. Confirm the
tenant identity cannot create StorageClasses or PVs.

Size the provider for the product's rendered PVC requests plus replication and
free-space reserves. A class being present does not prove that its volumes can
be provisioned. See [System Requirements](system_requirements.md#storage-capacity).

## Object storage and previous installations

The default product object store is namespace-local SeaweedFS, backed by an RWO
PVC. An external S3-compatible service is also supported; see
[S3 workroom storage](../workroom-storage-s3.md).

In-place migration from the old packaged Ceph deployment is unsupported. Back up
and restore through a separately qualified migration plan and clean installation.
The legacy preflight blocks packaged `CephCluster` resources and names them.
Customer-managed Ceph is external storage and produces a warning instead. The
single explicit bypass, `KAMIWAZA_SKIP_LEGACY_ROOK_CEPH_CHECK=1`, is for an administrator
who has verified storage out of band; it does not migrate or delete any data.
