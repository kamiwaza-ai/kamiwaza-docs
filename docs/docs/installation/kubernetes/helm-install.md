---
title: Install Kamiwaza with Helm
sidebar_label: Install with Helm
---

# Install Kamiwaza with Helm

With the platform prepared and validated, installing Kamiwaza is a single Helm
command. Kamiwaza ships as one umbrella chart pulled from your Kamiwaza **Keygen
OCI** entitlement, and installs into the namespace your platform administrator
created.

Before you begin, make sure you have completed
[Prepare the Kubernetes Platform](prepare-kubernetes.md):

- The Kamiwaza namespace exists.
- Storage, mesh/ingress, and TLS are ready for that namespace.
- A namespaced image pull secret for the Keygen OCI registry exists.
- Environment validation has passed.

You will need `helm` (v3) and `kubectl` configured to reach the target cluster
with an identity permitted to install into the Kamiwaza namespace.

:::warning Do not create the namespace with Helm
Install **into the existing namespace**. Do not pass `--create-namespace` — the
namespace is a platform-owned prerequisite, and Kamiwaza is a namespace tenant.
:::

## Step 1: Authenticate Helm to the Keygen OCI registry

Kamiwaza's chart and images come from Kamiwaza's Keygen OCI registry. Log Helm in
to that registry using your Kamiwaza license entitlement:

```bash
helm registry login oci.pkg.keygen.sh
```

<!-- ASSUMPTION (for Matt): `oci.pkg.keygen.sh` is the Keygen OCI host used by the
     published 1.0.x online installer to pull product images, so it is used here
     as the working example. The exact credential the operator supplies to
     `helm registry login` for the 1.1.0 chart pull (license key as the password,
     and the username/anonymous convention) is NOT yet confirmed in the source
     docs and must be filled in before this ships. -->

:::info Your license is the only credential
Authentication uses your Kamiwaza license entitlement. You do not log in to GHCR,
Docker Hub, Quay, or any other registry to install Kamiwaza.
:::

## Step 2: Create your site values

Create a values file that describes your site. At minimum this sets your public
domain and points Kamiwaza at the image pull secret your platform administrator
created:

```yaml
# kamiwaza-values.yaml
global:
  domain: kamiwaza.example.com
  imagePullSecrets:
    - name: <kamiwaza-image-pull-secret>
```

Your platform may need a few additional values — for example, the object-storage
backend, or mesh/ingress settings specific to your provider (such as OpenShift +
GreyMatter). Your Kamiwaza representative provides an example values file for your
target platform; review it and store the final file in change control.

<!-- GAP (for Matt): the minimal customer-facing required values for a generic
     Kubernetes + Istio target beyond `global.domain` + `global.imagePullSecrets`
     are not fully enumerated in the internal source, which is written against the
     OpenShift + GreyMatter target (gslSecurity, edge gatewayType/exposedPort,
     etc.). Kept generic here and deferred provider specifics to the per-platform
     example values file. Confirm the generic-target minimal values set. -->

## Step 3: Install the release

Install (or re-install) Kamiwaza with `helm upgrade --install`:

```bash
helm upgrade --install kamiwaza \
  oci://oci.pkg.keygen.sh/<your-account-or-product>/kamiwaza \
  --version 1.1.0 \
  --namespace kamiwaza \
  --values kamiwaza-values.yaml \
  --wait \
  --wait-for-jobs \
  --timeout 30m
```

- `kamiwaza` (first argument) is the **release name**.
- The `oci://…` reference is the Kamiwaza chart in your Keygen OCI entitlement.
- `--namespace kamiwaza` is the pre-created namespace.
- `--wait --wait-for-jobs` makes Helm wait until workloads and setup jobs are
  ready before returning.

<!-- ASSUMPTION (for Matt): the OCI chart path `oci://oci.pkg.keygen.sh/<account-
     or-product>/kamiwaza` and `--version 1.1.0` follow the canonical published-
     chart shape in the internal helm-install source
     (`oci://<keygen-oci-registry-host>/<account-or-product>/kamiwaza`). The exact
     account/product path segment and the published chart version string for the
     customer 1.1.0 artifact are placeholders and must be confirmed. -->

Helm reports success once the release is installed and the platform has come up.

## Tenant and Extended modes

Kamiwaza installs in **Tenant** mode by default. Tenant mode keeps everything in
one namespace and creates no cluster-scoped objects.

Use **Extended** mode only if you need cross-node GPU features (cluster-wide GPU
discovery and fractional / multi-node model placement). Extended mode renders the
**same chart** with the extended capabilities enabled:

```bash
helm upgrade --install kamiwaza \
  oci://oci.pkg.keygen.sh/<your-account-or-product>/kamiwaza \
  --version 1.1.0 \
  --namespace kamiwaza \
  --values kamiwaza-values.yaml \
  --set mode=extended \
  --wait \
  --wait-for-jobs \
  --timeout 30m
```

<!-- ASSUMPTION (for Matt): the internal contract describes Extended as "the same
     umbrella chart rendered with mode=extended". `--set mode=extended` is written
     from that phrasing; confirm the exact values key/path the customer chart
     exposes for mode selection. -->

Extended mode requires the **cluster-scoped prerequisites** to be provisioned by
the administrator **before** you install — see
[Prepare the Kubernetes Platform](prepare-kubernetes.md#gpu-and-extended-mode).
The chart still creates only namespaced objects in both modes; Extended simply
assumes those cluster-scoped prerequisites already exist.

## Step 4: Verify the install

After Helm reports success, confirm the platform is healthy:

```bash
kubectl get pods -n kamiwaza
kubectl get pvc -n kamiwaza
```

All pods should reach `Running`/`Ready` or `Completed`, and all persistent volume
claims should be `Bound`. Then confirm the API responds through your domain:

```bash
curl -k "https://kamiwaza.example.com/api/security/public/config"
```

## Step 5: Log in

Open Kamiwaza in a browser at `https://<your-domain>/login` and sign in with the
initial administrator account.

On a fresh install, Kamiwaza seeds an initial administrator credential. Retrieve
it — without printing it into your shell history — and store it in your
organization's approved password manager. Your platform's example values and the
Kamiwaza setup guide describe how the initial administrator credential is set or
retrieved for your target.

<!-- GAP (for Matt): the customer-facing "how do I get the first admin password"
     story for the Helm flow. The internal helm-install.md seeds an `admin` user
     Secret (`kamiwaza-user-admin`) with a generated 20-char password and rotates
     via deploy's `scripts/reset-passwd.sh` — but that script lives in the private
     deploy repo and is not a customer artifact. Left deliberately high-level;
     needs a customer-safe credential-retrieval procedure before shipping. -->

:::note Certificates
If Kamiwaza is served with a self-signed certificate, your browser shows a
security warning on first visit. For production, use a certificate your clients
already trust so the connection validates without a warning.
:::

## Next step

To upgrade or remove Kamiwaza later, see
[Upgrade and Uninstall](lifecycle.md).
