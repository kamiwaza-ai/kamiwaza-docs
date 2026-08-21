# Offline Installation

The offline installer is for **air-gapped or restricted RHEL 9 environments** with no outbound internet access on the target host. You download the Kamiwaza bundle on a connected machine, transfer it to the target host, and install without pulling anything from the internet during installation.

**Supported host:** RHEL-compatible 9.x (x86_64).

> This is an advanced, operator-driven path. If your host has internet access, use the simpler [Online Installation](online_install.md) instead.

## Prerequisites

- A **Kamiwaza Prod license key**, used to download the bundle artifacts from Keygen.
- A RHEL-compatible 9.x host (x86_64) that meets the [System Requirements](system_requirements.md).
- **Free disk space, on the right filesystems.** The offline flow stages large artifacts and provisions cluster storage under `/`, `/tmp`, and `/var/lib`. Confirm each path has room on the **volume that actually backs it** — on hosts with LVM or separate partitions (most cloud RHEL images ship this way), a large total disk does **not** help if `/var` is a small separate volume. Recommended free space:
  - **`/var/lib` ≥ 350 GB**, assuming `KAMIWAZA_ROOK_OSD_IMAGE_SIZE=80G` is set in [Step 5](#step-5-install-kamiwaza). Without that export the OSD image defaults to 700 GB and you need **1.1 TB** instead. The OSD image is preallocated at install time and also holds all stateful data, so size it for the data you expect to keep, not just to complete the install.
  - **`/tmp` ≥ 25 GB** — bundle extraction and install scratch space.
  - **`/` ≥ 50 GB** — the downloaded bundle and its recombined tarballs under `/opt/kamiwaza/prereqs` (~25 GB), plus installed tooling under `/opt` and `/usr/local`.

  A small default `/tmp` or `/var` is the most common cause of install failure. It surfaces in one of three ways, none of which mentions disk space directly: the preflight aborts at `storage_host_prep` with an `fs-virtual-block free space` error; an image import fails with `no space left on device`; or the helmfile sync fails roughly ten minutes in with `Progress deadline exceeded` on the `cert-manager` deployments and `FailedScheduling: 1 node(s) had untolerated taint(s)` on their pods — that last one is the kubelet disk-pressure taint, not a cert-manager fault. Grow the backing LV or partition (or mount adequate storage at `/var/lib`) **before** you begin.
- A machine with internet access to download the bundle, and a way to transfer files to the target host.

Confirm which filesystem actually backs each path before you transfer anything — a
large total disk tells you nothing if `/var` is a separate logical volume:

```bash
df -hT / /tmp /var/tmp /var/lib /opt
findmnt -T /var/lib
lsblk -f
```

The host's static hostname must be **55 characters or fewer**. Longer names
overflow the certificate subject fields the cluster generates:

```bash
hostnamectl --static | tr -d '\n' | wc -c
```

Throughout this guide, replace the placeholders:

- `<license-key>` — your Kamiwaza Prod license key.
- `<domain>` — the base domain to serve Kamiwaza from (for example `kamiwaza.example.com`).
- `<admin-password>` — the initial admin password.

## Step 1: Download the Bundle Artifacts

The 1.2.0 offline bundle is published to Keygen as a set of split, checksummed artifacts. You download them (on a connected machine or on the host if it has temporary access), verify the checksums, and recombine the split parts.

`RELEASE` must name the bundle exactly as it is published on Keygen. At the time of
writing the published 1.2.0 bundle is `1.2.0-rc.3`; once a plain `1.2.0` bundle is
published, use that instead. Check the artifact listing for your release rather than
assuming — a `RELEASE` value that does not exist fails at the first download.

The extension-bundle filename is likewise release-specific. The value below matches the published 1.2.0 bundle. If you are installing a different build, take the filename from the artifact listing for that release.

```bash
export KEYGEN_TOKEN="<license-key>"
export RELEASE="1.2.0-rc.3"
export EXT_BUNDLE="kamiwaza-extensions-bundle-20260821-023257.tar.gz"
export BASE="https://raw.pkg.keygen.sh/kamiwaza/kamiwaza-prod/@bundles/${RELEASE}"

sudo install -d -m 0755 -o "$USER" -g "$USER" /opt/kamiwaza/prereqs
cd /opt/kamiwaza/prereqs

for file in \
  release_origination.md \
  kamiwaza-tools-rpm.pub.gpg \
  kamiwaza-helm.sha256 \
  kamiwaza-helm.asc \
  kamiwaza-helm.00.tar.part-000 \
  kamiwaza-helm.00.tar.part-000.sha256 \
  kamiwaza-helm.00.tar.part-001 \
  kamiwaza-helm.00.tar.part-001.sha256 \
  kamiwaza-helm.00.tar.part-002 \
  kamiwaza-helm.00.tar.part-002.sha256 \
  kamiwaza-helm.00.tar.parts.json \
  kamiwaza-prod-1.2.0-1.el9.x86_64.rpm \
  "${EXT_BUNDLE}.sha256" \
  "${EXT_BUNDLE}.part-000" \
  "${EXT_BUNDLE}.part-000.sha256" \
  "${EXT_BUNDLE}.part-001" \
  "${EXT_BUNDLE}.part-001.sha256" \
  "${EXT_BUNDLE}.part-002" \
  "${EXT_BUNDLE}.part-002.sha256" \
  "${EXT_BUNDLE}.part-003" \
  "${EXT_BUNDLE}.part-003.sha256" \
  "${EXT_BUNDLE}.part-004" \
  "${EXT_BUNDLE}.part-004.sha256" \
  "${EXT_BUNDLE}.parts.json"
do
  # Always attempt a resume: curl --continue-at - fetches a fresh file or
  # resumes a partial one, so rerunning the block after an interruption
  # repairs truncated downloads instead of skipping them.
  curl -fL --retry 5 --retry-delay 10 --retry-all-errors --continue-at - \
    -H "Authorization: License ${KEYGEN_TOKEN}" \
    -o "$file" \
    "${BASE}/${file}"
done

# Verify part checksums
for checksum in \
  kamiwaza-helm.00.tar.part-*.sha256 \
  "${EXT_BUNDLE}".part-*.sha256
do
  sha256sum -c "${checksum}"
done

# Recombine split parts and verify the full-artifact checksums
cat kamiwaza-helm.00.tar.part-{000..002} > kamiwaza-helm.00.tar
cat "${EXT_BUNDLE}".part-{000..004} > "${EXT_BUNDLE}"
ln -sf kamiwaza-helm.00.tar kamiwaza-helm.tar
sha256sum -c kamiwaza-helm.sha256
sha256sum -c "${EXT_BUNDLE}.sha256"
```

The `release_origination.md` artifact records the build provenance and the app, containers, and frontend image tags for this bundle. It does not enumerate the dependency image versions used in `KAMIWAZA_IMAGE_OVERRIDES` below.

> If a download stalls, rerun the block — `curl --continue-at -` resumes partial files. If you downloaded on a separate connected machine, transfer the entire `/opt/kamiwaza/prereqs` directory to the same path on the target host before continuing.

## Step 2: Install Prerequisites

Install the prerequisites RPM and run the bootstrap script, which installs the container runtime, cluster tooling, and Ansible from the embedded artifacts:

```bash
cd /opt/kamiwaza/prereqs

sudo rpm -Uvh --replacepkgs ./kamiwaza-prod-*.x86_64.rpm

sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel

# Put the bundled tools on sudo's PATH. Later steps call `sudo kubectl`, and the
# bootstrap's own verification cannot see them either, so re-run it afterwards —
# the second run reports "Bootstrap complete".
for tool in helm helmfile k0s kind kubectl; do
  if [[ -x "/usr/local/bin/${tool}" ]]; then
    sudo ln -sfn "/usr/local/bin/${tool}" "/usr/bin/${tool}"
  fi
done

sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel
```

The first bootstrap run commonly exits nonzero on RHEL 9 with `ERROR: required
bundled command missing after install: helm`, even though every tool installed
correctly: the bootstrap installs into `/usr/local/bin`, which sudo's
`secure_path` omits, so its own verification cannot see them. The symlink loop
and second run in the block above resolve it.

Verify the tools are present:

```bash
export HELM_PLUGINS="/usr/local/share/helm/plugins"

checks=(
  "ansible::ansible-playbook --version | head -n1"
  "podman::podman --version"
  "kubectl::kubectl version --client"
  "helm::helm version --short"
  "helmfile::helmfile --version"
  "helm dt::helm dt version"
)

for check in "${checks[@]}"; do
  label="${check%%::*}"; command="${check#*::}"
  if output="$(bash -o pipefail -c "${command}" 2>&1)"; then
    result=GOOD
  else
    result=BAD
  fi
  output="$(printf '%s' "${output}" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
  printf '[%-4s] %s: %s\n' "${result}" "${label}" "${output:-no output}"
done
```

Every tool above ships in the bundle, so a failure here means the bootstrap did
not complete rather than that something is missing from the host. Re-run the
bootstrap and re-verify before considering other sources.

On a host that still has repository access you can install a missing tool
directly, but this reaches the OS package repositories and is not available on
an air-gapped host:

```bash
sudo dnf install -y ansible-core podman kubectl
```

## Step 3: Create the Overrides File

Create the cluster overrides file with your domain. This is also where you add optional deployment customizations.

```bash
sudo install -d -m 0755 /opt/kamiwaza/cluster/values
sudo tee /opt/kamiwaza/cluster/values/overrides.yaml > /dev/null <<'EOF'
global:
  domain: <domain>
EOF
```

> Advanced deployments (for example, external S3-backed workroom storage or a classification banner) add further keys under `global:` and `core:` in this file. Those are optional and not required for a standard install.

## Step 4: Pre-Extract the Extension Bundle

Stage the extension bundle before installing the platform:

```bash
cd /opt/kamiwaza/prereqs

EXT_BUNDLE="${EXT_BUNDLE:-$(ls -1 kamiwaza-extensions-bundle-*.tar.gz | tail -1)}"
rm -rf /tmp/kamiwaza-ext-extract
mkdir -p /tmp/kamiwaza-ext-extract
tar -xzf "$EXT_BUNDLE" -C /tmp/kamiwaza-ext-extract

sudo /tmp/kamiwaza-ext-extract/kamiwaza-extensions-bundle-*/scripts/install-extensions-bundle.sh \
  --bundle "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" \
  --sha256-file "/opt/kamiwaza/prereqs/${EXT_BUNDLE}.sha256" \
  --extract-dir /var/lib/kajiya-reports/extensions-bundle-preinstall \
  --skip-images \
  --skip-catalog

# The /tmp copy only supplies the helper script. The install itself runs from
# the --extract-dir copy, so reclaim the scratch space before installing.
rm -rf /tmp/kamiwaza-ext-extract
```

This stages the bundle under `/var/lib/kajiya-reports/extensions-bundle-preinstall`
(about 24 GB); [Step 6](#step-6-finish-extension-installation) installs from
there.

## Step 5: Install Kamiwaza

> **Upgrading a 1.0.0 production database to 1.2.0?** Stop here and follow the
> [Core database upgrade runbook](../runbooks/core-database-upgrade-1.2.md)
> before invoking `install-prod.sh`. The runbook requires the exact 1.2.0
> candidate and its `release_origination.md`; the fresh-install values below
> are not upgrade inputs.

Set the image tags for the bundle and run the offline installer. The values below match the published 1.2.0 build. If you are installing a different build, obtain its image override map from the publisher — `release_origination.md` records the app, containers, and frontend tags only.

Both `KAMIWAZA_IMAGE_TAG` and `KAMIWAZA_IMAGE_OVERRIDES` are required, and they correct each other:

- `KAMIWAZA_IMAGE_TAG` moves the platform images to the release tag. Without it, `extension-operator` and `placement-operator` request `develop` and stay in `ImagePullBackOff`.
- `postgres` and `keycloak` are excluded from that bulk tag and would otherwise fall back to chart pins the bundle does not contain.
- `etcd` is moved *by* the bulk tag and must be pinned back to the version in the bundle.

Omitting the bulk tag, or any one of the three overrides, leaves a workload requesting a tag the local registry does not have.

> **Installing over SSM, or any connection that can drop?** The install runs for
> roughly 15-20 minutes in the foreground, and losing the session loses the
> controlling process. Run the whole Step 5 block inside a detached terminal
> multiplexer, so the exported values below stay in the same shell as the
> installer and the run survives a disconnect:
>
> ```bash
> tmux new -s kamiwaza-install     # or: screen -S kamiwaza-install
> ```
>
> Export the block below and run `install-prod.sh` inside that session; reattach
> after a drop with `tmux attach -t kamiwaza-install`. Judge the result from the
> installer's exit status and the final Ansible recap (`failed=0`,
> `unreachable=0`), not from log activity — a quiet log is not a finished
> install.

> **Keep `KAMIWAZA_ROOK_OSD_IMAGE_SIZE=80G`** in the block below unless you have sized `/var/lib` for the 700 GB default — it is what brings the requirement down to the 350 GB floor in [Prerequisites](#prerequisites). This env var and the online guide's `-e storage_host_prep_virtual_block_size` extra-var are the same setting expressed two ways; the offline path sets it via the environment, the online path via an installer argument.

```bash
export DOMAIN="<domain>"
export ADMIN_PASSWORD="<admin-password>"

export APP_TAG="release-1.2.0"
export FRONTEND_TAG="${APP_TAG}"
export CONTAINERS_TAG="release-1.2.0"
export EXTENSION_OPERATOR_TAG="release-1.2.0"

export KAMIWAZA_VERSION="${APP_TAG}"
export KAMIWAZA_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_K8S_RUNTIME="k0s-podman"
export KAMIWAZA_ROOK_OSD_IMAGE_SIZE=80G
export KAMIWAZA_RESOURCE_PROFILE=small
export HELMFILE_EXTRA_SET="--set global.security.allowInsecureImages=true"

export KAMIWAZA_OFFLINE_APP_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CORE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_FRONTEND_TAG="${FRONTEND_TAG}"
export KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG="${CONTAINERS_TAG}"
export KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG="${CONTAINERS_TAG}"

export KAMIWAZA_IMAGE_OVERRIDES="postgres=v18.4,keycloak=${CONTAINERS_TAG},etcd=v3.6.10"

sudo -E /opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --domain "${DOMAIN}" \
  --admin-password "${ADMIN_PASSWORD}" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  -e helm_timeout=12m \
  -y
```

## Step 6: Finish Extension Installation

Make sure `${DOMAIN}` resolves from the install host, then install the extensions from the pre-staged bundle:

```bash
export DOMAIN="<domain>"
export ADMIN_PASSWORD="<admin-password>"

# Add a hosts-file entry if the domain does not already resolve locally
if ! curl -ksS "https://${DOMAIN}/api/health" >/dev/null; then
  NODE_IP="$(sudo kubectl get nodes -o wide --no-headers | awk 'NR==1 {print $6}')"
  echo "${NODE_IP:-127.0.0.1} ${DOMAIN}" | sudo tee -a /etc/hosts
fi

BUNDLE_ROOT="$(sudo find /var/lib/kajiya-reports/extensions-bundle-preinstall \
  -maxdepth 1 -type d -name 'kamiwaza-extensions-bundle-*' | sort | tail -1)"

test -n "${BUNDLE_ROOT}" || { echo "No pre-extracted extension bundle found"; exit 1; }

printf '%s\n' "${ADMIN_PASSWORD}" | sudo "${BUNDLE_ROOT}/scripts/install-extensions-bundle.sh" \
  --bundle-root "${BUNDLE_ROOT}" \
  --container-cli podman \
  --sudo-mode always \
  --api-url "https://${DOMAIN}/api" \
  --username admin \
  --password-stdin
```

## Step 7: Verify the Installation

```bash
sudo kubectl get pods -A
sudo kubectl get kamiwazaextensions -A
```

All pods should be `Running`, `Ready`, or `Completed`. On a fresh install `kubectl get kamiwazaextensions -A` reports `No resources found` — the extension templates are cataloged but none is deployed until you launch one, so this is expected. Then log in at `https://<domain>/login` with `admin` and the password you set. The installer serves the site with a self-signed certificate by default, so your browser will show a security warning on first access — continue past it to reach the login page.

## Troubleshooting

- **Output appears stalled during `bootstrap-prereqs.sh` or `install-prod.sh`.** The `dnf`/`rpm` output can appear to hang while these scripts run. This is not a prompt waiting for input; if output appears stalled, press Enter several times until it resumes.
- **Disk pressure or staging failures.** Confirm `/`, `/tmp`, and `/var/lib` each have enough free space before installing (see [Prerequisites](#prerequisites)).

## Next Steps

- [Quickstart](../quickstart.md) — confirm the service is running and take your first steps.
- [Uninstalling Kamiwaza](uninstall.md).
