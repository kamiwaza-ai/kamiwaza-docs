# Kamiwaza Offline Installation Guide for Red Hat Enterprise Linux

## Overview

This guide covers offline installation of Kamiwaza on RHEL 9 in air-gapped environments where internet access is restricted or unavailable.

Kamiwaza deploys as a Kubernetes application on a single-node [Kind](https://kind.sigs.k8s.io/) cluster using [Podman](https://podman.io/) as the container runtime. The offline installer uses a signed Helm wrap bundle containing all container images and charts, eliminating the need for external registry access.

### What Gets Installed

- **Kind** — Single-node Kubernetes cluster (using Podman)
- **Helm + Helmfile** — Declarative Kubernetes deployment
- **Traefik** — Ingress controller with TLS termination
- **Keycloak** — Enterprise authentication (OIDC/JWT)
- **PostgreSQL** — Application database
- **Ray** — Distributed compute for model serving
- **Kamiwaza Platform** — Core scheduler, frontend, and AI services

---

## Prerequisites

- **RHEL 9** (x86_64) — fresh installation recommended
- **Root or sudo access**
- **A pre-provisioned server or EC2 instance** that already exists before install
- **64GB RAM minimum** (128GB+ recommended for production model serving)
- **200GB+ free disk space** (NVMe SSD recommended)
- **GPU** (optional) — NVIDIA with driver 550+ for GPU inference

Review the full [System Requirements](system_requirements.md) for hardware details.

---

## Required Artifacts

Before starting, obtain these files from your release build or Kamiwaza representative:

| Artifact | Description |
|----------|-------------|
| `kamiwaza-prod-*.x86_64.rpm` | Production RPM with embedded tools and bootstrap payload |
| `kamiwaza-helm.*.tar` | Helm wrap bundle chunks (container images + charts) |
| `kamiwaza-helm.sha256` | SHA256 checksum for bundle integrity verification |
| `kamiwaza-helm.asc` | GPG detached signature for bundle authenticity |
| `kamiwaza-tools-rpm.pub.gpg` | GPG public key for signature verification |

**Transfer Methods:**
- USB drive / removable media
- Secure file transfer (scp, rsync)
- S3 bucket (if the host has temporary internet access)

---

## Step 1: Set Operator Variables

Define the configuration for your installation:

```bash
export DOMAIN="YOUR_DOMAIN_HERE"           # External hostname for the install
export ADMIN_PASSWORD="replace-me"          # Initial admin password
export RELEASE_DIR="$HOME/kamiwaza-release"  # Directory containing release artifacts

export APP_TAG="release-<release-tag>"
export FRONTEND_TAG="${APP_TAG}"
export CONTAINERS_TAG="${APP_TAG}"
```

If your release uses different frontend or container tags, set them explicitly. Confirm the correct tags from the release metadata.

---

## Step 2: Stage Release Artifacts

Transfer the release artifacts to the target host and place them in `${RELEASE_DIR}`.

**Transfer Methods:**
- USB drive or removable media
- Secure file transfer (`scp`, `rsync`)
- Any internal artifact repository or file share your organization uses

```bash
mkdir -p "${RELEASE_DIR}"
cd "${RELEASE_DIR}"
# Copy or transfer the release artifacts into this directory
```

---

## Step 3: Verify Required Files

```bash
cd "${RELEASE_DIR}"

ls -1 \
  kamiwaza-prod-*.x86_64.rpm \
  kamiwaza-helm.*.tar \
  kamiwaza-helm.sha256 \
  kamiwaza-helm.asc \
  kamiwaza-tools-rpm.pub.gpg
```

All five artifact types must be present before proceeding.

---

## Step 4: Install the Production RPM

```bash
sudo dnf install -y perl
sudo rpm -Uvh --replacepkgs ./kamiwaza-prod-*.x86_64.rpm
```

This installs the Kamiwaza platform files to `/opt/kamiwaza/` including scripts, Ansible playbooks, Helm charts, and embedded prerequisite binaries.

---

## Step 5: Stage the Wrap Bundle

Copy the Helm wrap bundle and verification files to the expected location:

```bash
sudo mkdir -p /opt/kamiwaza/prereqs
sudo cp ./kamiwaza-helm.*.tar ./kamiwaza-helm.sha256 ./kamiwaza-helm.asc \
  ./kamiwaza-tools-rpm.pub.gpg /opt/kamiwaza/prereqs/
```

---

## Step 6: Bootstrap Host Prerequisites

The RPM includes an embedded prerequisite payload. Run the bootstrap script to install Podman, Ansible, kubectl, Helm, Kind, Helmfile, and the helm-dt plugin:

```bash
sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel

export HELM_PLUGINS="/usr/local/share/helm/plugins"
```

Verify the installed tools:

```bash
ansible-playbook --version | head -n1
podman --version
kubectl version --client
helm version
helmfile version
helm dt version
```

---

## Step 7: Create Site Overrides (Optional)

Most installs can skip this step. Create a site overrides file only if you need non-default settings such as security banners, consent gates, ReBAC authorization, or a license key.

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

  # Override only if this install should use a non-default template catalog stage.
  # This does not control the image registry used by the installer.
  # templates:
  #   sync:
  #     stage: "STAGE"

  scheduler:
    extraEnv:
      - name: LICENSE_KEY
        value: "your-license-key-here"
      - name: AUTH_REBAC_ENABLED
        value: "true"
      - name: AUTH_REBAC_BACKEND
        value: "postgres"
      - name: AUTH_REBAC_ALLOW_COMMUNITY_FALLBACK
        value: "true"

      # ReBAC session tracking — keep disabled unless Redis URL is configured
      # - name: AUTH_REBAC_SESSION_ENABLED
      #   value: "true"
      # - name: AUTH_REBAC_SESSION_REDIS_URL
      #   value: "rediss://user:pass@redis.example.com:6379"
EOF
```

**Notes:**
- Use `core.security`, not top-level `security`
- Do **not** set `global.domain` here — use the `--domain` flag instead
- Do **not** set `KAMIWAZA_EXTERNAL_URL`, Keycloak URLs, or JWT issuer here — the chart derives them from `--domain`
- If you enable `AUTH_REBAC_SESSION_ENABLED`, you **must** also provide `AUTH_REBAC_SESSION_REDIS_URL`

---

## Step 8: Export Offline Image Tags

Set the container image tags for the release you are installing:

```bash
export KAMIWAZA_VERSION="${APP_TAG}"
export KAMIWAZA_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_APP_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CORE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_FRONTEND_TAG="${FRONTEND_TAG}"
export KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG="${CONTAINERS_TAG}"
```

If your release uses different tags for frontend or supporting container images, set them explicitly before running the installer.

---

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

**Important:** Keep the `--wrap-bundle` glob **quoted** exactly as shown. The script needs to expand the glob itself.

The installer will:
1. Create a `kamiwaza-prod` Kind cluster using Podman
2. Start a local container registry
3. Reassemble and verify the wrap bundle chunks (SHA256 + GPG)
4. Unwrap all Helm charts and container images into the local registry
5. Deploy the full platform via `helmfile sync`

Installation typically takes 10–20 minutes depending on hardware.

---

## Step 10: Verify the Installation

```bash
# Check all pods are Running or Completed
kubectl get pods -n kamiwaza

# Retrieve the admin password
kubectl -n kamiwaza get secret kamiwaza-user-admin \
  -o jsonpath="{.data.password}" | base64 -d; echo

# Verify the domain is accessible
curl -kI "https://${DOMAIN}"
```

**Access the Web Interface:**

Open your browser and navigate to `https://<your-domain>`. Sign in with:
- **Username:** `admin`
- **Password:** The password you set via `--admin-password`

---

## File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Platform scripts | `/opt/kamiwaza/scripts/` | Install, bootstrap, and management scripts |
| Ansible playbooks | `/opt/kamiwaza/ansible/` | Deployment automation |
| Helm charts | `/opt/kamiwaza/charts/` | Kubernetes application definitions |
| Cluster values | `/opt/kamiwaza/cluster/values/` | Helm values and overrides |
| Prereq payload | `/opt/kamiwaza/prereqs/` | Embedded tools and wrap bundle |
| Install log | `/var/log/kamiwaza_install_prod.log` | Installation log |

---

## Network Ports

| Service | Port | Purpose |
|---------|------|---------|
| Traefik | 443/tcp | HTTPS ingress (primary access) |
| Traefik | 80/tcp | HTTP (redirects to HTTPS) |
| API Server | 7777 | Kamiwaza REST API (internal) |
| Frontend | 3000 | Web UI (internal, proxied by Traefik) |
| Ray Dashboard | 9001 | Ray cluster monitoring (internal) |

All external access is through the Traefik ingress on port 443.

---

## How Configuration Is Supplied

Configuration for the offline install comes from three places:

1. **`--domain`** — Sets the external domain. The chart derives `KAMIWAZA_EXTERNAL_URL`, Keycloak public URL, JWT issuer, CORS origins, and other URL-based fields automatically.

2. **`--admin-password`** — Seeds the `kamiwaza-user-admin` Kubernetes secret and the Keycloak initial admin user.

3. **Exported `KAMIWAZA_OFFLINE_*` tag vars + `/opt/kamiwaza/cluster/values/overrides.yaml`** — Image tags for the release and any site-specific settings (banners, consent, ReBAC, license key).

---

## Troubleshooting

### `no wrap chunk files matched glob`

The `--wrap-bundle` argument must be **quoted** to prevent shell expansion:

```bash
# Correct:
--wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar'

# Wrong (shell expands before the script sees it):
--wrap-bundle /opt/kamiwaza/prereqs/kamiwaza-helm.*.tar
```

### Embedded prereq payload missing

If `/opt/kamiwaza/prereqs/rpms/` is missing after RPM install, verify that you installed the correct packaged prod RPM for the offline release.

### ReBAC session startup failure

If you enable `AUTH_REBAC_SESSION_ENABLED="true"`, you must also provide `AUTH_REBAC_SESSION_REDIS_URL`. Without it, `core-scheduler` will fail startup.

### Stale unwrap marker from previous install

If reinstalling with a different bundle, clear the cached state:

```bash
sudo rm -f /tmp/kamiwaza-helm-reassembled.tar.sha256.ok
sudo rm -rf /opt/kamiwaza/wrap/
```

### Pod not starting

Check pod events and logs:

```bash
kubectl describe pod <pod-name> -n kamiwaza
kubectl logs <pod-name> -n kamiwaza
```

### Installation log

Review the full installation log:

```bash
cat /var/log/kamiwaza_install_prod.log
```

---

## Next Steps

- **[GPU Setup Guide](gpu_setup_guide.md)** — Configure NVIDIA GPU support for model inference
- **[System Requirements](system_requirements.md)** — Detailed hardware and software requirements
- **[Admin Guide](../security/admin-guide.md)** — Authentication, user management, and security configuration
- **[Uninstalling Kamiwaza](redhat_uninstall.md)** — Complete removal procedure
