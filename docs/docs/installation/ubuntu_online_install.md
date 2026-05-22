# Kamiwaza Installation Guide for Ubuntu

## Overview

This guide covers the standard installation of Kamiwaza on Ubuntu systems with internet access. It uses the Ansible-driven Kubernetes install flow (`install-prod.sh --online`) that ships with the `deploy` repository.

**For air-gapped environments without internet access**, see the [RHEL Offline Installation Guide](./redhat_offline_install.md) — an Ubuntu offline guide is in preparation. The offline installation requires additional preparation and is intended for restricted environments only.

These instructions have been validated against Kamiwaza release `0.13.1` on Ubuntu 24.04 LTS (x86_64) on Azure.

> **Note on packaging.** A self-contained `kamiwaza-prod.deb` is planned but not yet shipped for the `0.13.x` line. Until it lands, the supported online install on Ubuntu is performed from a clone of the `deploy` repository at the release tag, as described below.

> **Known issues in `release/0.13.1` (workarounds inlined below).** Seven items in the install path require explicit handling on this release. Each is annotated where it applies:
>
> 1. `kind_cluster` role checks an undefined `container_runtime` variable on Linux hosts. Workaround: pass `-e container_runtime=podman` to `install-prod.sh` (Step 4).
> 2. `install-prod.sh` does not pass `CLUSTER_NAME` to `make install` in Phase 2, so the Makefile default `kamiwaza-dev` mismatches the prod cluster `kamiwaza-prod`. Workaround: run Phase 2 manually with `CLUSTER_NAME=kamiwaza-prod` (Step 5).
> 3. The Make preflight unconditionally requires a local registry at `localhost:5001`, which only exists in offline mode. Workaround: bypass with `SKIP_PREFLIGHT=1` in Phase 2 (Step 5).
> 4. `credential_inject` silently skips without both `GITHUB_USERNAME` and `GITHUB_TOKEN`, causing pods to fail with `Unable to retrieve some image pull secrets (ghcr-creds)`. Workaround: export both (Step 3).
> 5. `make helm-package` does not recursively `helm dep update` the umbrella's subcharts. Without intervention, the packaged umbrella ships without the Traefik subchart and without the upstream DataHub stack, so `kamiwaza-datahub-bootstrap` hangs forever waiting on a `datahub-gms` pod that doesn't exist. Workaround: `helm dep update` `charts/network`, `charts/datahub`, and `charts/ca` before Phase 2 (Step 5).
> 6. `docker-credential-secretservice` (installed by the `credential_setup` role) is invoked by Helm for anonymous Docker Hub OCI pulls and fails with `Cannot autolaunch D-Bus without X11 $DISPLAY` on a headless host. Workaround: rename the binary aside before the `helm dep update` step (Step 5).
> 7. Several platform charts use Chainguard-mirrored postgres images that bitnami's chart flags as "unrecognized." Without an override, the bitnami postgresql install errors out. Workaround: set `HELMFILE_EXTRA_SET='--set global.security.allowInsecureImages=true'` for Phase 2 (Step 5). `install-prod.sh --allow-insecure-images` does the same thing but is currently labeled "[SMOKE/TEST ONLY]"; setting the env var directly is preferred until the labeling catches up.
>
> A future deploy release will fold these fixes in; remove the overrides once you're past `0.13.1`.

---

## Prerequisites

Before installing Kamiwaza, ensure you have:

- **Ubuntu 24.04 LTS** (x86_64). Validated on Azure `Standard_E8as_v5` (8 vCPU / 64 GB RAM, 300 GB OS disk). Ubuntu 22.04 LTS is expected to work but has not been re-validated for this release.
- **Root or sudo access** to the host
- **Internet connectivity** to `ghcr.io`, `quay.io`, `docker.io`, `pkgs.k8s.io`, GitHub, and the standard Ubuntu apt mirrors
- A **GitHub personal access token** with `read:packages` for `kamiwaza-internal` (`GITHUB_TOKEN`) **plus the matching `GITHUB_USERNAME`** — `credential_inject` requires both, and skips with a warning if either is missing
- If installing on **AWS EC2**, **Quay robot credentials** are also required (`QUAY_ROBOT_USERNAME` / `QUAY_ROBOT_TOKEN`)

Review the full [System Requirements](system_requirements.md) for hardware, storage, and GPU requirements.

---

## Step 1: Install Base System Packages

Install Git and Ansible. The installer expects `ansible-playbook` to be on `PATH` before it runs.

```bash
sudo apt-get update
sudo apt-get install -y git ansible
```

The Ansible `dependencies` role will install everything else Kamiwaza needs — `kubectl`, `helm`, `helmfile`, `kind`, `podman`, and supporting packages — during Step 4.

---

## Step 2: Clone the `deploy` Repository

```bash
cd ~
git clone -b release/0.13.1 https://github.com/kamiwaza-internal/deploy.git
cd deploy
```

If you do not have HTTPS access to private GitHub repositories from this host, use the SSH URL instead:

```bash
git clone -b release/0.13.1 git@github.com:kamiwaza-internal/deploy.git
```

Alternatively, embed your token in the URL for a single-shot HTTPS clone on a fresh host:

```bash
git clone -b release/0.13.1 \
  https://<github-user>:${GITHUB_TOKEN}@github.com/kamiwaza-internal/deploy.git
```

---

## Step 3: Provide Credentials

The online installer pulls Helm charts and container images from upstream registries and therefore needs registry credentials.

**IMPORTANT:** You must accept the Kamiwaza License Agreement to install Kamiwaza. By setting `KAMIWAZA_ACCEPT_LICENSE=yes` you are agreeing to the Kamiwaza License Agreement. To review the full license terms, visit https://www.kamiwaza.ai/license.

```bash
export KAMIWAZA_ACCEPT_LICENSE=yes

# Required: GitHub username + token with read:packages for kamiwaza-internal.
# BOTH must be set together; credential_inject silently skips if either is missing,
# and pods then fail with "Unable to retrieve some image pull secrets (ghcr-creds)".
export GITHUB_USERNAME="your-github-handle"
export GITHUB_TOKEN="ghp_..."

# Required only when installing on AWS EC2
export QUAY_ROBOT_USERNAME="..."
export QUAY_ROBOT_TOKEN="..."

# Optional: enterprise license key (omit for Community Edition)
export KAMIWAZA_LICENSE_KEY="YOUR_LICENSE_KEY_HERE"
```

> **Why both tokens on EC2?** The installer refuses to start on EC2 hosts without Quay credentials, because the cert-manager chart and several supporting images are pulled from `quay.io` via OCI and rate-limited for anonymous pulls.

---

## Step 4: Run Phase 1 (Ansible)

```bash
sudo -E ./scripts/install-prod.sh --online \
  --domain kamiwaza.example.com \
  --admin-password 'replace-me' \
  -y \
  -e container_runtime=podman
```

Replace `kamiwaza.example.com` with the external hostname you want the platform to serve, and `replace-me` with the initial password for the `admin` user.

> **Why `-e container_runtime=podman`?** This works around the [first known issue](#overview) in `release/0.13.1`: the `kind_cluster` role's runc check references an undefined variable.

The installer runs in two phases:

1. **Ansible phase** (Step 4) — installs prerequisites (`kubectl`, `helm`, `helmfile`, `kind`, `podman`), configures Podman, creates a Kind cluster named `kamiwaza-prod`, and seeds GHCR / Quay / Docker Hub pull credentials.
2. **Make phase** (Step 5) — packages the Helm charts, applies CRDs, and runs `make install` with `HELMFILE_ENV=release` to deploy the platform from upstream registries.

`install-prod.sh` will attempt to run both phases. On `release/0.13.1`, Phase 2 fails its preflight (see Step 5) — that's expected and is fixed by the manual rerun in the next step.

**Monitoring Installation Progress:**

In a second terminal, you can follow the installer log:

```bash
sudo tail -f /var/log/kamiwaza_install_prod.log
```

---

## Step 5: Run Phase 2 (Make) with overrides

Because `install-prod.sh` does not pass `CLUSTER_NAME` to make and the Make preflight assumes a local registry, the bundled Phase 2 will fail on `release/0.13.1` with errors like:

```
PREFLIGHT ERROR: Kind cluster 'kamiwaza-dev' does not exist.
PREFLIGHT ERROR: Local registry at localhost:5001 is not reachable.
```

Before rerunning Phase 2, apply three one-time fixes for the `release/0.13.1`-specific bugs (see Overview items 5, 6, 7):

```bash
# (a) Disable the keyring-based credential helper that breaks anonymous OCI pulls
# on a headless host. credential_inject already seeded containerd creds in Step 4,
# so the cluster itself is unaffected.
sudo mv /usr/local/bin/docker-credential-secretservice \
       /usr/local/bin/docker-credential-secretservice.disabled

# (b) Build subchart deps that `make helm-package` skips. Without these the
# umbrella ships without the Traefik subchart and the DataHub stack.
cd ~/deploy
sudo helm dep update charts/network
sudo helm dep update charts/datahub
sudo helm dep update charts/ca
```

Then rerun Phase 2 with the prod cluster name, preflight bypass, and the bitnami insecure-images override:

```bash
sudo -E HELMFILE_ENV=release \
  CLUSTER_NAME=kamiwaza-prod \
  SKIP_PREFLIGHT=1 \
  HELMFILE_EXTRA_SET='--set global.security.allowInsecureImages=true' \
  make -C ~/deploy install
```

- `HELMFILE_ENV=release` selects the production values file.
- `CLUSTER_NAME=kamiwaza-prod` matches the cluster created in Step 4.
- `SKIP_PREFLIGHT=1` bypasses the online-incompatible local-registry check.
- `HELMFILE_EXTRA_SET=--set global.security.allowInsecureImages=true` lets the bitnami postgresql chart accept the platform's Chainguard-mirrored postgres images.

Expect Phase 2 to take roughly 10–20 minutes on a clean install — DataHub bootstrap is the slowest segment.

To watch the Kubernetes deployment as it comes up (from another terminal):

```bash
sudo kubectl --context kind-kamiwaza-prod get pods -n kamiwaza -w
```

> **kubectl note.** The Kind cluster runs rootful under Podman on Linux. The kubeconfig is written to `~/.kube/config` (in your user's home), but is owned by root and not readable by your user. Either run `kubectl` as `sudo KUBECONFIG=$HOME/.kube/config kubectl ...`, or `sudo chown $(id -u):$(id -g) ~/.kube/config` once to make it readable directly.

---

## Step 6: Verify Kamiwaza Is Running

When Phase 2 returns successfully, all pods in the `kamiwaza` namespace should be `Running` or `Completed`:

```bash
sudo kubectl --context kind-kamiwaza-prod get pods -n kamiwaza
sudo kubectl --context kind-kamiwaza-prod get deployments -n kamiwaza
```

Once everything is healthy, open the web interface:

```
https://kamiwaza.example.com
```

Sign in as `admin` using the password you passed to `--admin-password`.

> **DNS:** `--domain` only configures the chart and ingress. You are responsible for pointing `kamiwaza.example.com` (and any required subdomains) at this host in your DNS. For a local-only smoke test, you can map the hostname to the host's IP in `/etc/hosts` on the client machine.

---

## Step 7: Create Additional Users

Use `kubectl exec` against the `core-scheduler` pod to add users:

```bash
sudo kubectl --context kind-kamiwaza-prod exec -n kamiwaza deploy/core-scheduler -- \
  kz-user add alice --email alice@example.com --roles admin --random --safe
```

**Note:** Passwords are displayed once and must be saved immediately. For bulk user creation and full documentation, see the [Security Admin Guide](../security/admin-guide#221-using-kz-user-cli-tool).

---

## File and Cluster Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Install root (repo mode) | `~/deploy/` | Helmfile, charts, scripts |
| Ansible artifacts | `~/deploy/ansible/` | Playbooks, roles, vars |
| Install log | `/var/log/kamiwaza_install_prod.log` | Phase 1 + 2 install output |
| Kind cluster | `kind-kamiwaza-prod` | Kubernetes cluster |
| Application namespace | `kamiwaza` | All platform workloads |
| Helm release | `kamiwaza` (namespace `kamiwaza`) | Umbrella chart release |

When the `kamiwaza-prod.deb` is published, the install root will move to `/opt/kamiwaza/` and the Ansible / scripts will be served from `/opt/kamiwaza/ansible` and `/opt/kamiwaza/bin`.

---

## Network Ports

The default install routes external traffic through Traefik and exposes the following on the host:

| Service | Port | Purpose |
|---------|------|---------|
| Web UI / API | 443 | HTTPS ingress (Traefik) |
| HTTP redirect | 80 | Redirects to 443 |
| Traefik dashboard | 8080 | Optional, internal use |

`kubectl`, registry, and intra-cluster traffic stay on the host's loopback interface via Kind's port mappings — no extra ports need to be opened to operate the cluster from the host itself.

---

## Next Steps

- **[GPU Setup Guide](gpu_setup_guide.md)** — Configure NVIDIA or AMD GPU support
- **[System Requirements](system_requirements.md)** — Review detailed hardware and software requirements
- **[RHEL Online Installation](redhat_online_install.md)** — Same release, RHEL 9 host

---

## Troubleshooting

### Phase 1 aborts with `'container_runtime' is undefined`

Symptom (from `/var/log/kamiwaza_install_prod.log`):

```
TASK [kind_cluster : Verify runc is available for Linux Podman Kind containers] ***
fatal: [localhost]: FAILED! => {"msg": "'container_runtime' is undefined"}
```

This is the `release/0.13.1` bug fixed by the `-e container_runtime=podman` override in Step 4. If you ran `install-prod.sh` without it, add the flag and re-run.

### Phase 2 preflight fails with `Kind cluster 'kamiwaza-dev' does not exist`

This is the `release/0.13.1` Phase 2 bug. Phase 1 created `kamiwaza-prod`, but the Makefile preflight defaults to the dev cluster name. Run Phase 2 manually as shown in Step 5.

### Phase 2 preflight fails with `Local registry at localhost:5001 is not reachable`

Same root cause as above — the Make preflight is offline-mode-only on `release/0.13.1`. `SKIP_PREFLIGHT=1` in Step 5 bypasses it.

### Installer aborts with "online mode requires GITHUB_TOKEN"

Export `GITHUB_TOKEN` (or `KAJIYA_GITHUB_TOKEN`) before running the installer and re-invoke with `sudo -E` so the variable is preserved across the `sudo` boundary.

### Installer aborts with "online mode on EC2 requires Quay robot credentials"

Set both `QUAY_ROBOT_USERNAME` and `QUAY_ROBOT_TOKEN` (or pass `--quay-robot-username` / `--quay-robot-token`) and re-run with `sudo -E`. Both values must be present together.

### Pods stuck in `ImagePullBackOff` for `ghcr.io/kamiwaza-internal/*`

The GHCR pull secret was not seeded. Two common causes:

**1. `credential_inject` was skipped** (events show `Unable to retrieve some image pull secrets (ghcr-creds)`). This happens when only one of `GITHUB_USERNAME` / `GITHUB_TOKEN` was set. The Ansible log will contain:

```
TASK [credential_inject : Fail when only one GHCR credential value is provided]
fatal: [localhost]: FAILED! => "Both GHCR username and token are required together."
```

Re-run only the credential-inject phase, with both vars exported, then redo Phase 2:

```bash
export GITHUB_USERNAME="your-github-handle"
export GITHUB_TOKEN="ghp_..."

cd ~/deploy/ansible
sudo -E ansible-playbook playbooks/install/prod.yml --tags credential-inject \
  -e container_runtime=podman

cd ~/deploy
sudo -E HELMFILE_ENV=release \
  CLUSTER_NAME=kamiwaza-prod \
  SKIP_PREFLIGHT=1 \
  make install
```

**2. Token lacks `read:packages` for `kamiwaza-internal`.** Verify with `gh auth status` or curl `https://ghcr.io/v2/kamiwaza-internal/<image>/manifests/<tag>` with a basic-auth header. Regenerate the token with the right scope and rerun the steps above.

### Installation Logs

If installation fails, the full installer log is at:

```bash
sudo tail -200 /var/log/kamiwaza_install_prod.log
```

Phase 2 (Make) output is on stdout when run manually; capture it with `tee` if you want a file copy.

For Kubernetes-level diagnostics:

```bash
sudo kubectl --context kind-kamiwaza-prod get events -n kamiwaza --sort-by=.metadata.creationTimestamp | tail -40
sudo kubectl --context kind-kamiwaza-prod describe pod -n kamiwaza <failing-pod>
```

### Resetting the Install

To wipe the cluster and start over:

```bash
sudo -E ./scripts/uninstall-prod.sh
```

Add `--full-cleanup` to also remove Podman and bundled tooling.

### Restart Kamiwaza

To restart the platform without reinstalling:

```bash
sudo kubectl --context kind-kamiwaza-prod rollout restart deployment -n kamiwaza
```
