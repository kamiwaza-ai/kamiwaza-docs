# RHEL9 Offline Production Install

This guide covers a fresh Kamiwaza production install on a RHEL9 host using the
packaged prod RPM, offline wrap bundle, and `install-prod.sh`.

It is for administrators who are installing from **offline release artifacts**
you already have (for example from your delivery package, secure file transfer, or
your organization’s object storage). It does not describe how release packages
are produced or built.

## Scope

This guide assumes:

- a fresh RHEL9 host
- you have the complete offline artifact set for your release
- you are installing from the packaged offline artifacts, not from live internet repos
- `install-prod.sh` is the entrypoint

> **Note:** The RHEL offline install flow now includes `dnsmasq` alignment and natively supports App Garden extension traffic routing out-of-the-box (per the 0.12.1 release).

> **Network admin coordination:** End users on separate workstations need `<domain>` (and feature subdomains such as `docs.<domain>`) configured in your corporate DNS, plus a TLS certificate their browsers trust. See [Network Prerequisites](../network_prerequisites.md) for the checklist your network and security admins need.

## Inputs You Need

Before you start, decide these values:

- `DOMAIN`: external hostname for the install, for example `kamiwaza.example.com`
- `ADMIN_PASSWORD`: initial admin password
- release artifact location:
  - local directory, or
  - `s3://<bucket>/<prefix>/`
- offline image tags:
  - app/core/init-users tag
  - frontend tag
  - chainguard base/containers tag

For many releases, all three tag groups use the same value. Do not assume that;
confirm the correct values from your release documentation or delivery manifest.

Historical site config blocks often include many values that are now derived
from `--domain`, carried by chart defaults, or no longer used in the packaged
Kubernetes install path. This guide only carries forward the fields that still
need administrator input.

## Required Artifacts

You need these files from the offline release:

- `kamiwaza-prod-*.x86_64.rpm`
- `kamiwaza-helm.*.tar`
- `kamiwaza-helm.sha256`
- `kamiwaza-helm.asc`
- `kamiwaza-tools-rpm.pub.gpg`

## Host Prerequisites

You need:

- `sudo` access on the RHEL9 host
- `aws` CLI only if you are pulling artifacts from S3

The packaged prereq payload now includes the supported RHEL9 bootstrap path.
Use `/opt/kamiwaza/scripts/bootstrap-prereqs.sh --embedded-root /opt/kamiwaza/prereqs`
after the prod RPM and wrap assets are staged.

## Step 1: Set Operator Variables

Fill in the variables for your release:

```bash
DOMAIN="kamiwaza.example.com"
ADMIN_PASSWORD="replace-me"
RELEASE_DIR="$HOME/kamiwaza-offline-release"

APP_TAG="replace-with-your-release-tag"
FRONTEND_TAG="${APP_TAG}"
CONTAINERS_TAG="${APP_TAG}"
```

If your release uses different frontend or container tags, set them explicitly.
If your artifacts are already staged locally, set `RELEASE_DIR` to that path.

## Step 2: Retrieve Release Artifacts

If the release artifacts are already on disk, skip to Step 3.

Example: copy from an S3 bucket and prefix where your organization staged the
release (replace bucket, prefix, and credentials with your environment):

```bash
BUCKET="your-artifact-bucket"
PREFIX="path/to/kamiwaza-offline/<release>/"

mkdir -p "${RELEASE_DIR}"
cd "${RELEASE_DIR}"
aws s3 cp --recursive "s3://${BUCKET}/${PREFIX}/" .
```

## Step 3: Verify the Required Files Are Present

```bash
cd "${RELEASE_DIR}"

ls -1 \
  kamiwaza-prod-*.x86_64.rpm \
  kamiwaza-helm.*.tar \
  kamiwaza-helm.sha256 \
  kamiwaza-helm.asc \
  kamiwaza-tools-rpm.pub.gpg
```

## Step 4: Install the Prod RPM

```bash
sudo dnf install -y perl
sudo rpm -Uvh --replacepkgs ./kamiwaza-prod-*.x86_64.rpm
```

## Step 5: Stage the Wrap Bundle Files

```bash
sudo mkdir -p /opt/kamiwaza/prereqs
sudo cp ./kamiwaza-helm.*.tar ./kamiwaza-helm.sha256 ./kamiwaza-helm.asc \
  ./kamiwaza-tools-rpm.pub.gpg /opt/kamiwaza/prereqs/
```

## Step 6: Install Host Prerequisites

```bash
sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel

export HELM_PLUGINS="/usr/local/share/helm/plugins"
```

Sanity check the required tools:

```bash
ansible-playbook --version | head -n1
podman --version
kubectl version --client
helm version
helmfile version
helm dt version
```

## Step 7: Create the Optional Site Overrides File

Most installs can skip this step. Create the file only if you need non-default
settings such as security banners, consent, ReBAC, or a non-prod template
catalog stage.

Use this administrator-facing path:

```bash
/opt/kamiwaza/cluster/values/overrides.yaml
```

Example:

```bash
sudo tee /opt/kamiwaza/cluster/values/overrides.yaml > /dev/null <<'EOF'
core:
  security:
    consent:
      enabled: true
    banner:
      enabled: true
      topText: "UNCLASSIFIED//TEST SYSTEM"
      topColor: "#00A651"
      bottomText: "UNCLASSIFIED//TEST SYSTEM"
      bottomColor: "#00A651"

  # Override only if this install should use the staging template catalog.
  # This is the template catalog stage, not the container image registry.
  # templates:
  #   sync:
  #     stage: "STAGE"

  scheduler:
    extraEnv:
      # Keep only the env vars that still need explicit administrator input.
      # Most historical URL/auth fields are now chart-derived from --domain.
      - name: LICENSE_KEY
        value: "replace-with-license-key"
      - name: AUTH_REBAC_ENABLED
        value: "true"
      - name: AUTH_REBAC_BACKEND
        value: "postgres"
      - name: AUTH_REBAC_ALLOW_COMMUNITY_FALLBACK
        value: "true"

      # ReBAC session tracking is optional. Only enable it if you also provide
      # AUTH_REBAC_SESSION_REDIS_URL.
      # - name: AUTH_REBAC_SESSION_ENABLED
      #   value: "true"
      # - name: AUTH_REBAC_SESSION_ALLOW_INSECURE
      #   value: "true"
      # - name: AUTH_REBAC_SESSION_REDIS_URL
      #   value: "rediss://user:pass@redis.example.com:6379"
EOF
```

Notes:

- Use `core.security`, not top-level `security`.
- There is no `stage registry` site override in this install path.
  `core.templates.sync.stage` changes the template catalog only. Image registry
  selection comes from the install mode and release assets: offline installs use
  the local `host.docker.internal:5001` registry, while online installs pull
  from the configured upstream registries.
- Do not set `global.domain` here. Use `--domain`.
- Do not set the admin password here. Use `--admin-password`.
- Do not set `KAMIWAZA_EXTERNAL_URL`, Keycloak URLs, or JWT issuer here. The
  chart derives those from `--domain`.
- Do not set `AUTH_GATEWAY_*`, `AUTH_CALLBACK_URL`, `KAMIWAZA_ORIGIN`,
  `KAMIWAZA_CORS_ORIGINS`, `KAMIWAZA_KEYCLOAK_HOST`, or
  `network.traefik.logs.general.level` here for this install path.
- Do not set `KAMIWAZA_MILVUS_ENABLED` unless you are intentionally overriding
  the chart/Python defaults. The current production path already enables Milvus.
- If you set `AUTH_REBAC_SESSION_ENABLED="true"`, you must also provide
  `AUTH_REBAC_SESSION_REDIS_URL`.

## Step 8: Export Offline Image Tags

Set the tags for the release you are installing:

```bash
export KAMIWAZA_VERSION="${APP_TAG}"
export KAMIWAZA_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_APP_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CORE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_FRONTEND_TAG="${FRONTEND_TAG}"
export KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG="${CONTAINERS_TAG}"
```

These exported vars cover the current offline app/frontend/container tag paths
for the packaged release flow.

## Step 9: Run the Offline Install

```bash
sudo -E /opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --skip-prereq-bootstrap \
  --domain "${DOMAIN}" \
  --admin-password "${ADMIN_PASSWORD}" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  -e helm_timeout=12m \
  -y
```

Keep the `--wrap-bundle` glob quoted exactly as shown.

## Step 10: Verify the Install

```bash
kubectl get pods -n kamiwaza

kubectl -n kamiwaza get secret kamiwaza-user-admin \
  -o jsonpath="{.data.password}" | base64 -d; echo

curl -kI "https://${DOMAIN}"
```

What this confirms:

- the Kamiwaza namespace came up
- the admin password secret was created
- the external hostname is reachable

## How Configuration Is Supplied

For this install path, configuration comes from three places:

1. `--domain`

   This sets the external domain and the domain-derived URLs used by the chart.

2. `--admin-password`

   This seeds the `kamiwaza-user-admin` secret and the initial admin user setup.

3. the exported `KAMIWAZA_OFFLINE_*` tag vars plus
   `/opt/kamiwaza/cluster/values/overrides.yaml`

   Keep the exported `KAMIWAZA_OFFLINE_FRONTEND_TAG` and
   `KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG` values when a release uses split
   frontend/container tags. Use the values file only for site-specific
   non-default settings.

If you are tempted to set direct Keycloak URLs, JWT issuer, CORS origins, or
other external URL fields by hand, stop and check whether `--domain` already
covers them. For this packaged path, it usually does.

## Troubleshooting

### `aws: command not found`

Install AWS CLI or skip the S3 download step and stage the release artifacts
locally.

### `no wrap chunk files matched glob`

Keep the `--wrap-bundle` argument quoted:

```bash
--wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar'
```

### ReBAC session startup failure

If you enable `AUTH_REBAC_SESSION_ENABLED="true"`, you must also provide
`AUTH_REBAC_SESSION_REDIS_URL`.

### Embedded prereq payload missing

If `/opt/kamiwaza/prereqs/rpms/` is missing after RPM install, verify that you
installed the correct packaged prod RPM for the offline release.
