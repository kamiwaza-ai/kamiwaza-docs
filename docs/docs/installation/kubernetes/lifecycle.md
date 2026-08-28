---
title: Upgrade and Uninstall
sidebar_label: Upgrade and Uninstall
---

# Upgrade and Uninstall

Once Kamiwaza is installed as a Helm release, day-two operations are ordinary
Helm lifecycle commands. This page covers upgrading to a newer chart version and
removing Kamiwaza cleanly.

## Upgrade

Kamiwaza upgrades in place with the same `helm upgrade --install` command you used
to install, pointing at the new chart version and reusing your site values:

```bash
helm registry login oci.pkg.keygen.sh

helm upgrade --install kamiwaza \
  oci://oci.pkg.keygen.sh/<your-account-or-product>/kamiwaza \
  --version <new-version> \
  --namespace kamiwaza \
  --values kamiwaza-values.yaml \
  --wait \
  --wait-for-jobs \
  --timeout 30m
```

What to expect:

- Helm applies the new chart to the existing release in place.
- Data held in persistent volume claims is preserved across the upgrade.
- Existing platform credentials (such as the administrator account) are kept;
  they are not regenerated on upgrade.

:::tip Keep your values under change control
Always upgrade with the same reviewed values file you installed with, updated
only as a release's notes direct. Review each release's notes for version-specific
upgrade steps before upgrading a production environment.
:::

:::warning Database and major-version upgrades
Some releases include database schema changes or other one-time migration steps.
Before upgrading a production environment across such a release, follow that
release's upgrade runbook — including any required backup and pre-checks — rather
than running a plain `helm upgrade`.
:::

## Uninstall

Removing Kamiwaza is a Helm uninstall of the release. Because Kamiwaza is a
namespace tenant, uninstalling removes only Kamiwaza's namespaced resources and
leaves the platform-owned prerequisites — the namespace itself, storage classes,
mesh and ingress, GPU drivers, and image pull credentials — in place.

:::warning This removes Kamiwaza data
Uninstalling removes Kamiwaza's workloads and the storage it created in the
namespace. Back up anything you need to keep before you begin.
:::

### Step 1: Remove installed extensions first

Kamiwaza can create additional workloads at runtime (for example, extensions and
apps you deploy through the platform). These are created dynamically and are
**not** part of the Helm release, so remove them through Kamiwaza **while the
platform is still running** — before you uninstall the Helm release. Kamiwaza
provides a cleanup step for this with your release; run it and confirm it succeeds
before continuing.

<!-- GAP (for Matt): the internal flow uses a deploy-repo utility
     (`scripts/cleanup-direct-extensions.py`) to delete direct/dynamic extensions
     through the Kamiwaza API before `helm uninstall`, because those pods aren't in
     the Helm manifest. That script is a private deploy artifact, not a customer
     deliverable. Described here as "Kamiwaza provides a cleanup step" — the
     customer-facing tool/command for this needs to be named before shipping. -->

### Step 2: Uninstall the Helm release

```bash
helm uninstall kamiwaza \
  --namespace kamiwaza \
  --wait \
  --timeout 15m
```

### Step 3: Confirm removal

Confirm no Kamiwaza workloads remain in the namespace:

```bash
kubectl get all -n kamiwaza
```

A clean uninstall leaves no Kamiwaza deployments, pods, jobs, or persistent
volume claims behind. The namespace and the platform prerequisites remain — they
are owned by the platform, not by the Kamiwaza release, and are ready to receive a
future install.

## Next step

To reinstall or move to a newer version, return to
[Install Kamiwaza with Helm](helm-install.md).
