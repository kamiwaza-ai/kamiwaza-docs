---
title: Offline Installation Runbook
sidebar_label: Offline Installation Runbook
---

# Offline Installation Runbook

:::note Who this is for
This is the provenance-driven runbook for a **specific, immutable** release or
Kajiya run (ENG-10370). It records the exact bundle, verifies every artifact
against its recorded hashes, and drives the install through a durable launcher
so a dropped shell cannot orphan it.

Most installs should follow the shorter
[Offline Installation](offline_install.md) guide instead. Use this page when you
need artifact-level provenance, are installing over SSM or another managed
shell, or are running the internal release-parity gate. Section 9 is performed
by Kamiwaza release engineers and is not a customer installation requirement.
:::

This guide installs Kamiwaza on a standalone RHEL 9 x86_64 host from a
previously published offline bundle. The target does not pull product images
during the install. Whether the **host bootstrap** can also run without any
network access depends on the selected bundle: do not call an installation
fully air-gapped unless that exact build was tested with disconnected RHEL
package sources.

> This is an advanced, operator-driven path. If the target has normal internet
> access, use [Online Installation](online_install.md). This page describes the
> standalone `k0s-podman` topology; an EKS recipe is not an alternative source
> of truth for this installation.

An offline deployment has three separate completion levels:

1. **Core installed:** the platform is healthy and login works.
2. **Bundle installed:** bundled extension images are loaded and the live
   catalog is imported.
3. **Release parity (publisher qualification):** one bundled extension is
   deployed, verified, and removed through the supported catalog/API path, plus
   any additional gates recorded by the selected release run.

Do not report level 2 or 3 after only pre-staging the extension catalog.
Level 3 requires the private, hash-recorded Kajiya gate inputs from the selected
run and is performed by Kamiwaza release engineers; it is not a customer
installation requirement. A customer handoff without those internal inputs can
complete and report levels 1 and 2.

## Before you begin

You need:

- A supported RHEL-compatible 9.x x86_64 host that meets the
  [System Requirements](system_requirements.md).
- A host name no longer than 54 characters.
- A Kamiwaza license and access to one **immutable** release or Kajiya run.
- A connected staging machine if the target cannot download the artifacts.
- Root access on the target. For a remote private host, Session Manager (SSM)
  or an equivalent managed shell is preferred over SSH.
- Bash 4.4 or newer plus GNU `coreutils`, `findutils`, `curl`, `jq`, `gpg`, and
  `tar` on every machine that runs the snippets. They use GNU options and do not
  run in stock macOS Bash; use a trusted Linux staging host or container when
  the connected workstation is a Mac. If the target has no reachable RHEL
  repositories, those tools and all OS packages required by the selected
  prerequisite bootstrap must already be available through a trusted local
  repository or the verified handoff.

### Check the actual filesystems

The bundle, extracted extensions, container images, and installer scratch can
live on different filesystems. A large virtual disk is not proof that
`/var/lib` or `/tmp` has room; cloud RHEL images commonly put `/var` on a small
logical volume.

Before transfer, calculate the compressed bundle total, the extracted
extension size, installer scratch, image-store growth, and operational
headroom. Then check the backing filesystems:

```bash
df -hT / /tmp /var/tmp /var/lib /opt
findmnt -T /tmp
findmnt -T /var/tmp
findmnt -T /var/lib
findmnt -T /opt
lsblk -f
```

There is no release-independent free-space floor for this path. The verified
staging copy, `/opt/kamiwaza/prereqs` copy, logical-wrap scratch space under
`/var/tmp`, extracted extension tree, image store, and configured OSD can
coexist. Calculate their peak sizes from the selected handoff and budget each
copy on its actual backing filesystem. Grow the correct PV/LV/filesystem before
installation and run `df` again afterward.

Also confirm that no package manager, previous installer, Kubernetes bootstrap,
or local-registry import is running. Understand any existing `/opt/kamiwaza`,
`/var/lib/k0s`, Podman, or cluster state before rerunning an installer.

Verify the host before transferring large artifacts:

```bash
(
set -euo pipefail
test "$(uname -m)" = x86_64
grep -E 'release 9([. ]|$)' /etc/redhat-release
test "$(hostnamectl --static | wc -c)" -le 55
((BASH_VERSINFO[0] > 4 ||
  (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 4)))
for command_name in \
  awk curl find findmnt gpg jq lsblk rpm sha256sum sort stat sudo systemctl \
  systemd-run tar; do
  command -v "${command_name}" >/dev/null
done
)
```

If the host is reached through SSM, validate all four access paths before the
install window: the instance is `Online`, a harmless Run Command succeeds, an
interactive Session Manager shell opens, and local port forwarding starts.
Resolve any configured Session Manager RunAs user mismatch first; do not enable
SSH as an ad hoc fallback.

```bash
aws ssm describe-instance-information \
  --filters Key=InstanceIds,Values=<instance-id> \
  --region <region> --profile <profile>

COMMAND_ID="$(aws ssm send-command \
  --instance-ids <instance-id> \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["id","true"]' \
  --query 'Command.CommandId' --output text \
  --region <region> --profile <profile>)"
aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" --instance-id <instance-id> \
  --region <region> --profile <profile>
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" --instance-id <instance-id> \
  --query '{Status:Status,ResponseCode:ResponseCode}' \
  --region <region> --profile <profile>

aws ssm start-session \
  --target <instance-id> \
  --region <region> --profile <profile>

aws ssm start-session \
  --target <instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["443"],"localPortNumber":["8443"]}' \
  --region <region> --profile <profile>
```

## 1. Select and record the exact bundle

Never copy artifact names, tags, or image overrides from another release. Start
with the Keygen release or exact Kajiya workflow run selected for this install
and record:

- release/run identifier, attempt, source prefix, and publication inventory;
- immutable Kajiya, Deploy, Core, Containers, and extension source commits;
- every object name and SHA-256, plus sizes where the publisher exposes them;
- runtime, resource profile, OSD size, and compatibility flags;
- every product tag and the complete `KAMIWAZA_IMAGE_OVERRIDES` map;
- extension helper names and hashes; and
- the release's required verification gates.

Download `release_origination.md` first. Its `## Artifacts` section is the
authoritative hash list for source artifacts and its repository section records
provenance. It is **not** by itself the full launcher contract: settings such as
the complete image-override map can come from the exact Kajiya run. If the
publisher cannot supply both provenance and the complete install contract, stop
instead of guessing from a previous release.

Modern bundle roles normally include:

- `release_origination.md`;
- one `kamiwaza-prod-*.el9.x86_64.rpm`;
- one or more `kamiwaza-helm.<number>.tar` wrap chunks;
- `kamiwaza-helm.sha256`, `kamiwaza-helm.asc`, and the signing public key;
- optionally, one extension bundle plus its `.sha256`; and
- for files split by the distribution service, `.part-NNN` files, per-part
  sidecars, and a `.parts.json` assembly manifest.

The number and names are release-specific. The publisher must supply a complete
post-distribution `artifacts.tsv` with tab-separated filename and SHA-256
columns, including any generated part manifests, parts, and part sidecars. The
customer-reachable `release_origination.md` authenticates source-artifact
hashes, but does not enumerate every distribution-added object or provide a
byte count for every artifact. If the publisher does not supply the complete
post-distribution inventory, stop. Keep it with the installation record.

## 2. Download, transfer, and verify artifacts

On the connected staging machine, use the selected package URL and the exact
inventory. The example below is deliberately parameterized; `<release>` is the
immutable selected release or run tag, not a version copied from this page.

```bash
export RELEASE="<release>"
export PACKAGE_KEY="<exact-package-key-from-the-selected-release>"
export BASE="https://raw.pkg.keygen.sh/kamiwaza/kamiwaza-prod/@${PACKAGE_KEY}/${RELEASE}"
export ARTIFACT_DIR="${PWD}/kamiwaza-offline-${RELEASE}"
export INVENTORY_SOURCE="<secure-path-to-artifacts.tsv>"

(
set -euo pipefail
[[ "${RELEASE}" =~ ^[A-Za-z0-9._-]+$ ]]
[[ "${INVENTORY_SOURCE}" != *'<'* ]]
test -f "${INVENTORY_SOURCE}"

read -rsp 'Kamiwaza license token: ' KEYGEN_TOKEN; printf '\n'

AUTH_HEADER="$(mktemp)"
chmod 0600 "${AUTH_HEADER}"
trap 'rm -f "${AUTH_HEADER}"' EXIT
printf 'Authorization: License %s\n' "${KEYGEN_TOKEN}" >"${AUTH_HEADER}"
unset KEYGEN_TOKEN

install -d -m 0755 "${ARTIFACT_DIR}"
cp "${INVENTORY_SOURCE}" "${ARTIFACT_DIR}/artifacts.tsv"
cd "${ARTIFACT_DIR}"

artifact_count=0
while IFS=$'\t' read -r file expected_sha extra || [[ -n "${file}" ]]; do
  [[ -n "${file}" && "${file}" != \#* ]] || continue
  [[ -z "${extra:-}" ]]
  [[ "${file}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
  [[ "${expected_sha}" =~ ^[0-9a-fA-F]{64}$ ]]
  ((artifact_count += 1))

  if [[ -f "${file}" ]] &&
     printf '%s  %s\n' "${expected_sha}" "${file}" | sha256sum -c - >/dev/null; then
    printf 'already verified: %s\n' "${file}"
    continue
  fi
  rm -f "${file}"

  if [[ -f "${file}.partial" ]] &&
     printf '%s  %s\n' "${expected_sha}" "${file}.partial" | sha256sum -c - >/dev/null; then
    mv "${file}.partial" "${file}"
    continue
  fi

  curl_rc=0
  curl -fL --retry 5 --retry-delay 10 --retry-all-errors --continue-at - \
    --header "@${AUTH_HEADER}" \
    -o "${file}.partial" \
    "${BASE}/${file}" || curl_rc=$?
  if ((curl_rc != 0)); then
    # A rejected/invalid range cannot become resumable without discarding it.
    # Preserve partial bytes for ordinary transport timeouts.
    case "${curl_rc}" in
      22|33|36) rm -f "${file}.partial" ;;
    esac
    exit "${curl_rc}"
  fi

  if ! printf '%s  %s\n' "${expected_sha}" "${file}.partial" | sha256sum -c -; then
    rm -f "${file}.partial"
    printf 'download verification failed: %s\n' "${file}" >&2
    exit 1
  fi
  mv "${file}.partial" "${file}"
done < artifacts.tsv
((artifact_count > 0)) || {
  printf 'artifacts.tsv contained no artifact records\n' >&2
  exit 1
}
)
```

Do not put license tokens in command logs, shell history, or the installation
record. A cloud-to-cloud relay may be faster than a local upload, but use a
managed identity or short-lived prefix-scoped credential and verify again on
the final target. S3 ETags are not SHA-256 integrity checks.

### Reassemble distribution parts

Each `.parts.json` records the original filename/hash and the ordered part
inventory. Reassemble from that manifest instead of hardcoding part counts:

Skip this block when the inventory contains no `.parts.json` files.

```bash
(
set -euo pipefail
cd "${ARTIFACT_DIR:?export ARTIFACT_DIR first}"
shopt -s nullglob
manifests=( *.parts.json )
((${#manifests[@]} > 0)) || {
  printf 'no part manifests found\n' >&2
  exit 1
}

for manifest in "${manifests[@]}"; do
  output="$(jq -er '.source.filename' "${manifest}")"
  expected_size="$(jq -er '.source.size' "${manifest}")"
  expected_sha="$(jq -er '.source.sha256' "${manifest}")"
  [[ "${output}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
  [[ "${expected_size}" =~ ^[0-9]+$ ]]
  [[ "${expected_sha}" =~ ^[0-9a-fA-F]{64}$ ]]
  jq -e '.parts | type == "array" and length > 0' "${manifest}" >/dev/null

  : > "${output}.assembling"
  part_count=0
  while IFS=$'\t' read -r part part_sha; do
    [[ "${part}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
    [[ "${part_sha}" =~ ^[0-9a-fA-F]{64}$ ]]
    printf '%s  %s\n' "${part_sha}" "${part}" | sha256sum -c -
    cat "${part}" >> "${output}.assembling"
    ((part_count += 1))
  done < <(jq -r '.parts[] | [.filename, .sha256] | @tsv' "${manifest}")

  ((part_count > 0))
  test "$(stat -c %s "${output}.assembling")" = "${expected_size}"
  printf '%s  %s\n' "${expected_sha}" "${output}.assembling" | sha256sum -c -
  mv "${output}.assembling" "${output}"
done
)
```

### Verify source artifacts and the logical wrap

Verify every artifact recorded in `release_origination.md`:

```bash
(
set -euo pipefail
cd "${ARTIFACT_DIR:?export ARTIFACT_DIR first}"
artifact_count=0
while read -r file expected; do
  test -f "${file}"
  printf '%s  %s\n' "${expected}" "${file}" | sha256sum -c -
  ((artifact_count += 1))
done < <(
  awk '
    $0 == "## Artifacts" { in_artifacts=1; next }
    in_artifacts && /^## / { exit }
    in_artifacts && /^- / {
      name=$2; sub(/:$/, "", name); print name, $3
    }
  ' release_origination.md
)
((artifact_count > 0)) || {
  printf 'release_origination.md contained no artifact records\n' >&2
  exit 1
}
)
```

`kamiwaza-helm.sha256` names the **logical concatenated wrap**, which might not
exist as a physical file. Hash the bytewise concatenation of all numbered wrap
chunks in natural numeric order. Creating a similarly named symlink does not
verify this contract.

```bash
(
set -euo pipefail
cd "${ARTIFACT_DIR:?export ARTIFACT_DIR first}"
mapfile -d '' WRAP_CHUNKS < <(
  find . -maxdepth 1 -type f -regextype posix-extended \
    -regex './kamiwaza-helm\.[0-9]+\.tar' -print0 | sort -z -V
)
((${#WRAP_CHUNKS[@]} > 0))

expected="$(awk 'NR==1 {print $1}' kamiwaza-helm.sha256)"
actual="$(cat "${WRAP_CHUNKS[@]}" | sha256sum | awk '{print $1}')"
test "${actual}" = "${expected}"
printf 'logical wrap checksum: OK (%s chunks)\n' "${#WRAP_CHUNKS[@]}"
)
```

Verify the detached signature over the checksum file. Confirm the signer
fingerprint through an independent trusted channel; a key delivered in the same
directory proves bundle consistency, not independently anchored provenance.

```bash
(
set -euo pipefail
cd "${ARTIFACT_DIR:?export ARTIFACT_DIR first}"
export GNUPGHOME="$(mktemp -d)"
chmod 0700 "${GNUPGHOME}"
trap 'rm -rf "${GNUPGHOME}"' EXIT
gpg --batch --import ./kamiwaza-tools-rpm.pub.gpg
gpg --batch --verify ./kamiwaza-helm.asc ./kamiwaza-helm.sha256
gpg --batch --with-colons --fingerprint
)
```

Transfer the entire verified directory to
`/var/tmp/kamiwaza-offline/<release-or-run>` on the target, then repeat the
hash, logical-wrap, and signature checks there. Perform the rest of this guide
only from that final target copy.

## 3. Install and verify embedded prerequisites

Move the verified artifacts into the fixed prerequisite path, install the exact
RPM, and run its packaged bootstrap noninteractively:

```bash
export ARTIFACT_DIR="/var/tmp/kamiwaza-offline/<release-or-run>"

(
set -euo pipefail

mapfile -t RPM_FILES < <(
  find "${ARTIFACT_DIR}" -maxdepth 1 -type f \
    -name 'kamiwaza-prod-*.el9.x86_64.rpm' -print
)
mapfile -t WRAP_FILES < <(
  find "${ARTIFACT_DIR}" -maxdepth 1 -type f -regextype posix-extended \
    -regex '.*/kamiwaza-helm\.[0-9]+\.tar' -print | sort -V
)
test "${#RPM_FILES[@]}" -eq 1
((${#WRAP_FILES[@]} > 0))

sudo install -d -m 0755 /opt/kamiwaza/prereqs
existing_bundle_file="$({
  sudo find /opt/kamiwaza/prereqs -maxdepth 1 -type f \
    \( -name 'kamiwaza-prod-*.el9.x86_64.rpm' \
       -o -name 'kamiwaza-helm.*.tar' \
       -o -name 'kamiwaza-helm.sha256' \
       -o -name 'kamiwaza-helm.asc' \
       -o -name 'kamiwaza-tools-rpm.pub.gpg' \
       -o -name '*.parts.json' \
       -o -name 'artifacts.tsv' \) \
    -print -quit
})"
if [[ -n "${existing_bundle_file}" ]]; then
  printf 'existing staged bundle artifact: %s\n' "${existing_bundle_file}" >&2
  printf 'verify and archive or remove the complete staged set before retrying, even for the same release\n' >&2
  exit 1
fi

sudo install -o root -g root -m 0600 "${ARTIFACT_DIR}/artifacts.tsv" \
  /opt/kamiwaza/prereqs/artifacts.tsv

declare -A INVENTORY=()
while IFS=$'\t' read -r file expected_sha extra || [[ -n "${file}" ]]; do
  [[ -n "${file}" && "${file}" != \#* ]] || continue
  [[ -z "${extra:-}" ]]
  [[ "${file}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
  [[ "${expected_sha}" =~ ^[0-9a-fA-F]{64}$ ]]
  [[ ! -v "INVENTORY[${file}]" ]]
  INVENTORY["${file}"]="${expected_sha}"
done < <(sudo cat /opt/kamiwaza/prereqs/artifacts.tsv)
((${#INVENTORY[@]} > 0))

# A split source is reconstructed locally and therefore is not itself a row in
# the post-distribution inventory. Root-stage each authenticated manifest and
# add its source hash to the accepted source map.
declare -A SOURCE_INVENTORY=()
shopt -s nullglob
PART_MANIFESTS=("${ARTIFACT_DIR}"/*.parts.json)
for manifest in "${PART_MANIFESTS[@]}"; do
  manifest_name="$(basename "${manifest}")"
  [[ -v "INVENTORY[${manifest_name}]" ]]
  sudo cp "${manifest}" /opt/kamiwaza/prereqs/
  printf '%s  %s\n' "${INVENTORY[${manifest_name}]}" \
    "/opt/kamiwaza/prereqs/${manifest_name}" | sudo sha256sum -c -
  source_name="$(sudo jq -er '.source.filename' \
    "/opt/kamiwaza/prereqs/${manifest_name}")"
  source_sha="$(sudo jq -er '.source.sha256' \
    "/opt/kamiwaza/prereqs/${manifest_name}")"
  [[ "${source_name}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
  [[ "${source_sha}" =~ ^[0-9a-fA-F]{64}$ ]]
  [[ ! -v "SOURCE_INVENTORY[${source_name}]" ]]
  SOURCE_INVENTORY["${source_name}"]="${source_sha}"
done

sudo cp "${RPM_FILES[@]}" \
  "${WRAP_FILES[@]}" \
  "${ARTIFACT_DIR}"/kamiwaza-helm.sha256 \
  "${ARTIFACT_DIR}"/kamiwaza-helm.asc \
  "${ARTIFACT_DIR}"/kamiwaza-tools-rpm.pub.gpg \
  /opt/kamiwaza/prereqs/

STAGED_FILES=(
  "${RPM_FILES[@]}"
  "${WRAP_FILES[@]}"
  "${ARTIFACT_DIR}/kamiwaza-helm.sha256"
  "${ARTIFACT_DIR}/kamiwaza-helm.asc"
  "${ARTIFACT_DIR}/kamiwaza-tools-rpm.pub.gpg"
)
for source in "${STAGED_FILES[@]}"; do
  name="$(basename "${source}")"
  if [[ -v "INVENTORY[${name}]" ]]; then
    expected_sha="${INVENTORY[${name}]}"
  else
    [[ -v "SOURCE_INVENTORY[${name}]" ]]
    expected_sha="${SOURCE_INVENTORY[${name}]}"
  fi
  printf '%s  %s\n' "${expected_sha}" \
    "/opt/kamiwaza/prereqs/${name}" | sudo sha256sum -c -
done

RPM_NAME="$(basename "${RPM_FILES[0]}")"
sudo rpm -Uvh --replacepkgs "/opt/kamiwaza/prereqs/${RPM_NAME}"
sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --yes \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel
)
```

The release/1.2.0 RPM overlay accepts `--yes` for noninteractive bootstrap.
Do not pipe repeated `yes` or press Enter to drive a long unattended install.

The install runs as root, so verify tools using root's actual environment:

```bash
(
set -euo pipefail
sudo env \
  HOME=/root \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HELM_PLUGINS=/usr/local/share/helm/plugins \
  bash -euo pipefail -c '
    ansible-playbook --version | head -n1
    podman --version
    kubectl version --client
    helm version --short
    helmfile --version
    helm dt version
  '
)
```

Do not repair a missing embedded tool by silently installing an arbitrary
internet version. Reconcile the selected RPM/bootstrap contract first.

## 4. Pre-stage the extension bundle (optional)

Skip this section when the selected bundle has no extension archive. Pre-stage
loads the bundled catalog files and writes offline catalog values needed by the
core install. It does **not** load all images or import the live catalog.

Copy the verified extension archive and sidecar into `/opt/kamiwaza/prereqs`.
Derive and validate its single top-level directory, then record the exact final
bundle root. Do not rediscover it later with `find | head`; stale extractions
can coexist after a retry.

```bash
export RUN_ID="<release-or-run>"
export EXT_BUNDLE="<exact-extension-filename-from-inventory>"
export EXTRACT_DIR="/var/lib/kajiya-reports/extensions-${RUN_ID}"
export ROOT_RECORD="/var/lib/kajiya-reports/offline-install/${RUN_ID}/bundle-root"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${EXT_BUNDLE}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
HELPER_DIR="$(sudo mktemp -d -p /var/tmp \
  "kamiwaza-extension-helper-${RUN_ID}.XXXXXX")"
trap 'sudo rm -rf -- "${HELPER_DIR}"' EXIT

sudo cp "${ARTIFACT_DIR}/${EXT_BUNDLE}" \
  "${ARTIFACT_DIR}/${EXT_BUNDLE}.sha256" \
  /opt/kamiwaza/prereqs/

for name in "${EXT_BUNDLE}" "${EXT_BUNDLE}.sha256"; do
  mapfile -t expected_rows < <(
    sudo awk -F '\t' -v name="${name}" '$1 == name {print $2}' \
      /opt/kamiwaza/prereqs/artifacts.tsv
  )
  if ((${#expected_rows[@]} == 0)); then
    mapfile -t root_manifests < <(
      sudo find /opt/kamiwaza/prereqs -maxdepth 1 -type f \
        -name '*.parts.json' -print
    )
    for manifest in "${root_manifests[@]}"; do
      if [[ "$(sudo jq -er '.source.filename' "${manifest}")" = "${name}" ]]; then
        expected_rows+=("$(sudo jq -er '.source.sha256' "${manifest}")")
      fi
    done
  fi
  test "${#expected_rows[@]}" -eq 1
  [[ "${expected_rows[0]}" =~ ^[0-9a-fA-F]{64}$ ]]
  printf '%s  %s\n' "${expected_rows[0]}" \
    "/opt/kamiwaza/prereqs/${name}" | sudo sha256sum -c -
done

mapfile -t BUNDLE_TOP_LEVELS < <(
  sudo tar -tzf "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" |
    awk -F/ 'NF {print $1}' | sort -u
)
test "${#BUNDLE_TOP_LEVELS[@]}" -eq 1
export BUNDLE_DIR_NAME="${BUNDLE_TOP_LEVELS[0]}"
[[ "${BUNDLE_DIR_NAME}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]

sudo tar -xzf "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" -C "${HELPER_DIR}" -- \
  "${BUNDLE_DIR_NAME}/scripts/install-extensions-bundle.sh"
sudo test -x \
  "${HELPER_DIR}/${BUNDLE_DIR_NAME}/scripts/install-extensions-bundle.sh"
sudo bash "${HELPER_DIR}/${BUNDLE_DIR_NAME}/scripts/install-extensions-bundle.sh" \
  --bundle "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" \
  --sha256-file "/opt/kamiwaza/prereqs/${EXT_BUNDLE}.sha256" \
  --extract-dir "${EXTRACT_DIR}" \
  --skip-images \
  --skip-catalog

export BUNDLE_ROOT="${EXTRACT_DIR}/${BUNDLE_DIR_NAME}"
sudo test -x "${BUNDLE_ROOT}/scripts/install-extensions-bundle.sh"
sudo install -d -m 0700 "$(dirname "${ROOT_RECORD}")"
printf '%s\n' "${BUNDLE_ROOT}" | sudo tee "${ROOT_RECORD}" >/dev/null
sudo chmod 0600 "${ROOT_RECORD}"
)
```

When helpers are supplied separately from the archive, use only the exact
Kajiya commit recorded by the selected run and verify each helper SHA-256 before
execution.

## 5. Prepare a durable core launcher

The selected immutable run must supply a complete, non-secret install contract.
Record it as JSON so values containing spaces cannot become shell syntax. Fill
every value from the selected run, including the complete infrastructure and
inference image map:

```json
{
  "KAMIWAZA_VERSION": "<exact>",
  "KAMIWAZA_IMAGE_TAG": "<exact>",
  "KAMIWAZA_K8S_RUNTIME": "k0s-podman",
  "KAMIWAZA_RESOURCE_PROFILE": "<exact>",
  "HELMFILE_EXTRA_SET": "<exact, including spaces>",
  "KAMIWAZA_OFFLINE_APP_IMAGE_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_CURL_SHELL_IMAGE_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_CORE_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_DATAHUB_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_FRONTEND_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG": "<exact>",
  "KAMIWAZA_IMAGE_OVERRIDES": "<exact comma-separated map>"
}
```

Validate that the document contains only the expected string keys, then install
it root-owned:

```bash
(
set -euo pipefail
CONTRACT_SOURCE='<secure-path-to-kamiwaza-install-contract.json>'
[[ "${CONTRACT_SOURCE}" != *'<'* ]]
test -f "${CONTRACT_SOURCE}"
if ! jq -e '
  type == "object" and
  (keys | sort) == ([
    "HELMFILE_EXTRA_SET",
    "KAMIWAZA_IMAGE_OVERRIDES",
    "KAMIWAZA_IMAGE_TAG",
    "KAMIWAZA_K8S_RUNTIME",
    "KAMIWAZA_OFFLINE_APP_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG",
    "KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CORE_TAG",
    "KAMIWAZA_OFFLINE_CURL_SHELL_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_DATAHUB_TAG",
    "KAMIWAZA_OFFLINE_FRONTEND_TAG",
    "KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG",
    "KAMIWAZA_RESOURCE_PROFILE",
    "KAMIWAZA_VERSION"
  ] | sort) and
  all(.[]; type == "string") and
  all(.[]; (contains("<") or contains(">")) | not) and
  .KAMIWAZA_K8S_RUNTIME == "k0s-podman" and
  (. as $contract | all([
    "KAMIWAZA_IMAGE_OVERRIDES",
    "KAMIWAZA_IMAGE_TAG",
    "KAMIWAZA_K8S_RUNTIME",
    "KAMIWAZA_OFFLINE_APP_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG",
    "KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CORE_TAG",
    "KAMIWAZA_OFFLINE_CURL_SHELL_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_DATAHUB_TAG",
    "KAMIWAZA_OFFLINE_FRONTEND_TAG",
    "KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG",
    "KAMIWAZA_RESOURCE_PROFILE",
    "KAMIWAZA_VERSION"
  ][]; ($contract[.] | length > 0)))
' "${CONTRACT_SOURCE}" >/dev/null; then
  printf 'install contract has missing, extra, empty, placeholder, or topology-invalid values\n' >&2
  exit 1
fi
sudo install -o root -g root -m 0600 \
  "${CONTRACT_SOURCE}" /run/kamiwaza-install-contract.json
)
```

Use the exact release contract even when several values happen to share a tag.
Do not synthesize missing values from the release number.
`KAMIWAZA_K8S_RUNTIME` must be `k0s-podman` for this guide. If the selected
contract names another runtime, stop and use that runtime's runbook.
`KAMIWAZA_OFFLINE_EXTRA_IMAGES` is a Kajiya wrap-build input, not an installer
environment variable; record it in build provenance when it is nonempty, but do
not add it to this runtime contract.

> **Upgrading a 1.0.0 production database to 1.2.0?** Stop here and follow the
> [Core database upgrade runbook](../runbooks/core-database-upgrade-1.2.md)
> before invoking `install-prod.sh`. It requires the exact 1.2.0 candidate, a
> pre-mutation backup, schema gates, stop rules, and recovery evidence.

### Password handling

The packaged release/1.2.0 RPM passes unknown arguments through to Ansible. The
launcher below writes `admin_password` to a root-only, attempt-bound JSON
extra-vars file under `/run` and passes only that file's path. The password is
not placed in the installer or child-process arguments or environment. Root can
still read the temporary file while the phase is running; the launcher's exit
trap removes it.

Read the password without echoing it and create a transient root-only file:

```bash
(
set -euo pipefail
read -rsp 'Initial Kamiwaza admin password: ' ADMIN_PASSWORD; printf '\n'
sudo install -o root -g root -m 0600 /dev/null /run/kamiwaza-admin-password
printf '%s' "${ADMIN_PASSWORD}" | sudo tee /run/kamiwaza-admin-password >/dev/null
unset ADMIN_PASSWORD
)
```

Create `/run/kamiwaza-offline-install.sh` as root with a quoted heredoc so the
interactive shell cannot expand the script body:

```bash
(
set -euo pipefail
sudo install -o root -g root -m 0700 /dev/null \
  /run/kamiwaza-offline-install.sh
sudo tee /run/kamiwaza-offline-install.sh >/dev/null <<'KAMIWAZA_INSTALL'
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf
unset NAMESPACE

CONTRACT=/run/kamiwaza-install-contract.json
PASSWORD_FILE=/run/kamiwaza-admin-password
DOMAIN='<domain>'
RUN_ID="${1:?pass the recorded run ID}"
ATTEMPT_ID="${2:?pass the recorded attempt number}"
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${ATTEMPT_ID}" =~ ^[0-9]+$ ]]
STATUS_ROOT="/var/lib/kajiya-reports/offline-install/${RUN_ID}/core-attempts"
ATTEMPT_DIR="${STATUS_ROOT}/attempt${ATTEMPT_ID}"
STATUS_FILE="${ATTEMPT_DIR}/result.rc"
ADMIN_VARS_FILE="/run/kamiwaza-admin-extra-vars-${RUN_ID}-attempt${ATTEMPT_ID}.json"

test -d "${ATTEMPT_DIR}"
test ! -e "${STATUS_FILE}"
test ! -e "${ADMIN_VARS_FILE}"
umask 077
cat /proc/sys/kernel/random/boot_id >"${ATTEMPT_DIR}/boot-id"
exec >"${ATTEMPT_DIR}/console.log" 2>&1

finish() {
  rc=$?
  trap - EXIT
  rm -f "${PASSWORD_FILE}" "${ADMIN_VARS_FILE}"
  status_tmp="$(mktemp "${STATUS_FILE}.tmp.XXXXXX")"
  printf '%s\n' "${rc}" >"${status_tmp}"
  chmod 0600 "${status_tmp}"
  mv -f "${status_tmp}" "${STATUS_FILE}"
  exit "${rc}"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

[[ -n "${DOMAIN}" && "${DOMAIN}" != *'<'* ]]
test -s "${CONTRACT}"
test -s "${PASSWORD_FILE}"
test -f /opt/kamiwaza/prereqs/kamiwaza-helm.sha256
test -f /opt/kamiwaza/prereqs/kamiwaza-helm.asc
test -f /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg

CONTRACT_KEYS=(
  KAMIWAZA_VERSION
  KAMIWAZA_IMAGE_TAG
  KAMIWAZA_K8S_RUNTIME
  KAMIWAZA_RESOURCE_PROFILE
  HELMFILE_EXTRA_SET
  KAMIWAZA_OFFLINE_APP_IMAGE_TAG
  KAMIWAZA_OFFLINE_CURL_SHELL_IMAGE_TAG
  KAMIWAZA_OFFLINE_CORE_TAG
  KAMIWAZA_OFFLINE_DATAHUB_TAG
  KAMIWAZA_OFFLINE_FRONTEND_TAG
  KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG
  KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG
  KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG
  KAMIWAZA_IMAGE_OVERRIDES
)
for name in "${CONTRACT_KEYS[@]}"; do
  value="$(jq -er --arg name "${name}" '.[$name] | strings' "${CONTRACT}")"
  printf -v "${name}" '%s' "${value}"
  export "${name}"
done
unset value

jq -Rs '{admin_password: .}' <"${PASSWORD_FILE}" >"${ADMIN_VARS_FILE}"
test -s "${ADMIN_VARS_FILE}"
rm -f "${PASSWORD_FILE}"
/opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --skip-prereq-bootstrap \
  --domain "${DOMAIN}" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  --extra-vars "@${ADMIN_VARS_FILE}" \
  -y
KAMIWAZA_INSTALL
)
```

Replace `<domain>` with `sudoedit /run/kamiwaza-offline-install.sh`, then
validate and protect the launcher:

```bash
(
set -euo pipefail
sudo bash -n /run/kamiwaza-offline-install.sh
sudo chmod 0700 /run/kamiwaza-offline-install.sh
)
```

## 6. Launch through SSM without tying the install to the shell

An SSM interactive shell can time out while a healthy installation is still
running. Launch each attempt as a distinct transient systemd unit:

```bash
export RUN_ID="<release-or-run>"
export ATTEMPT=1
export CORE_UNIT="kamiwaza-offline-install-${RUN_ID}-attempt${ATTEMPT}.service"
export CORE_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/core-attempts/attempt${ATTEMPT}"
export CORE_STATUS="${CORE_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${ATTEMPT}" =~ ^[0-9]+$ ]]
sudo install -d -o root -g root -m 0700 "$(dirname "${CORE_ATTEMPT_DIR}")"
sudo mkdir -m 0700 "${CORE_ATTEMPT_DIR}"
sudo systemd-run \
  --no-block \
  --service-type=oneshot \
  --remain-after-exit \
  --unit="${CORE_UNIT%.service}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-install.sh "${RUN_ID}" "${ATTEMPT}"
printf 'record unit=%s attempt_dir=%s\n' "${CORE_UNIT}" "${CORE_ATTEMPT_DIR}"
)
```

Immediately record the unit name and follow the persistent root-only log:

```bash
sudo tail -F "${CORE_ATTEMPT_DIR}/console.log"
```

Stop following with Ctrl-C only after the unit is terminal; then run the strict
completion gate in the next section.

Journal activity—or quietness—is not a completion signal. Because
`KillMode=process` and `Delegate=yes` allow runtime children to survive the
launcher, a stopped unit also does not prove all children stopped after an
error. Declare the core launcher successful only when all of these agree:

- `LoadState=loaded`, `ActiveState=active`, `SubState=exited`,
  `Result=success`, `ExecMainCode=1`, and `ExecMainStatus=0` from one
  `systemctl show` snapshot;
- the recorded per-attempt `${CORE_STATUS}` contains `0`;
- the final Ansible recap has `failed=0` and `unreachable=0`; and
- the independent workload checks in the next section pass.

`--remain-after-exit` keeps a successful transient unit loaded so a misspelled,
garbage-collected, or never-created unit cannot look identical to success.
`systemd-run` is preferred on RHEL because it preserves an authoritative exit
status. If systemd transient units are unavailable, the launcher can be
detached with `nohup` and the same attempt argument:

```bash
export ATTEMPT=2
export CORE_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/core-attempts/attempt${ATTEMPT}"
export CORE_STATUS="${CORE_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${ATTEMPT}" =~ ^[0-9]+$ ]]
sudo install -d -o root -g root -m 0700 "$(dirname "${CORE_ATTEMPT_DIR}")"
sudo mkdir -m 0700 "${CORE_ATTEMPT_DIR}"
sudo /bin/bash -c '
  exec nohup /bin/bash "$1" "$2" "$3" </dev/null >"$4" 2>&1 &
' _ /run/kamiwaza-offline-install.sh "${RUN_ID}" "${ATTEMPT}" \
  "${CORE_ATTEMPT_DIR}/launcher.log"
)
```

In that fallback, require the runner's `.rc` file plus the final recap and all
independent health gates; the background PID disappearing is not success.

## 7. Verify the core installation

The `k0s-podman` topology uses Podman as the k0s container engine on the host:

```text
RHEL host -> k0s with Podman container engine -> Kubernetes pods
```

Host processes and Kubernetes workloads do not share one network namespace.
Use the root kubeconfig installed by the playbook and the node IP reported by Kubernetes. If an EC2
instance role is intentionally available to workloads, the instance metadata
response hop limit must support this nested path; explicit S3 credentials
remain supported when ambient identity is not desired.

For a same-boot verification, rebind the recorded values after reconnecting and
run:

```bash
export DOMAIN="<domain>"
export RUN_ID="<release-or-run>"
export ATTEMPT=1
export CORE_UNIT="kamiwaza-offline-install-${RUN_ID}-attempt${ATTEMPT}.service"
export CORE_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/core-attempts/attempt${ATTEMPT}"
export CORE_STATUS="${CORE_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
test "$(sudo cat "${CORE_ATTEMPT_DIR}/boot-id")" = \
  "$(cat /proc/sys/kernel/random/boot_id)"
CORE_STATE="$(sudo systemctl show "${CORE_UNIT}" \
  -p LoadState -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p InvocationID)"
printf '%s\n' "${CORE_STATE}"
for expected in \
  LoadState=loaded ActiveState=active SubState=exited \
  Result=success ExecMainCode=1 ExecMainStatus=0; do
  if ! grep -Fxq "${expected}" <<<"${CORE_STATE}"; then
    printf 'core unit state gate failed: missing %s\n' "${expected}" >&2
    exit 1
  fi
done
grep -Eq '^InvocationID=.+$' <<<"${CORE_STATE}"
test "$(sudo cat "${CORE_STATUS}")" = 0
)
```

Run the workload gates separately so the same block is usable after a verified
post-success reboot:

```bash
export DOMAIN="<domain>"

(
set -euo pipefail
ROOT_TOOLS=(sudo env \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HELM_PLUGINS=/usr/local/share/helm/plugins \
  KUBECONFIG=/var/lib/k0s/pki/admin.conf)
NODES_JSON="$("${ROOT_TOOLS[@]}" kubectl get nodes -o json)"
jq -e '
  (.items | length) > 0 and
  all(.items[]; any(.status.conditions[]?;
    .type == "Ready" and .status == "True"))
' <<<"${NODES_JSON}" >/dev/null

PODS_JSON="$("${ROOT_TOOLS[@]}" kubectl get pods -A -o json)"
jq -e '
  (.items | length) > 0 and
  all(.items[];
    .status.phase == "Succeeded" or
    (.status.phase == "Running" and
     ((.status.containerStatuses // []) | length) > 0 and
     all(.status.containerStatuses[]; .ready == true)))
' <<<"${PODS_JSON}" >/dev/null
jq -e '
  all(.items[];
    all((.status.containerStatuses // [])[];
      (.imageID // "") | contains("sha256:")))
' <<<"${PODS_JSON}" >/dev/null

HELM_JSON="$("${ROOT_TOOLS[@]}" helm list -A -o json)"
jq -e 'length > 0 and all(.[]; .status == "deployed")' \
  <<<"${HELM_JSON}" >/dev/null

NODE_IP="$("${ROOT_TOOLS[@]}" kubectl get nodes \
  -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')"
test -n "${NODE_IP}"
HTTP_CODE="$(curl -kfsS --resolve "${DOMAIN}:443:${NODE_IP}" \
  -o /dev/null -w '%{http_code}' \
  "https://${DOMAIN}/api/auth/health")"
test "${HTTP_CODE}" = 200

"${ROOT_TOOLS[@]}" kubectl get nodes -o wide
"${ROOT_TOOLS[@]}" kubectl get pods -A
"${ROOT_TOOLS[@]}" helm list -A
printf 'health HTTP %s\n' "${HTTP_CODE}"
)
```

If the host rebooted only **after** the durable `result.rc` reached `0`, the
transient unit tuple is no longer available. Do not run the same-boot tuple
gate. Instead require that attempt's root-only `console.log` to contain the
final clean Ansible recap, then run the separate workload block and every login,
digest, and provenance gate below. A missing or nonzero receipt is not
recoverable success.

The health endpoint is authentication-exempt and must return a successful HTTP
status. Also verify login and an authenticated API request, deployed Helm
releases, expected local-registry manifests, and the live pod `imageID` digests
against the selected release contract. Health without expected digest evidence
proves function, not artifact provenance. Passing the shell block alone is not
level-1 completion; login and an authenticated request must also succeed. A
missing expected manifest/digest comparison does not block that functional
level, but it does block any claim that the running images match the selected
release provenance.

The domain must resolve both from the install host and from the operator's
browser. Add one exact, reviewed `/etc/hosts` entry only when DNS is not ready;
do not append duplicates on every retry.

For SSM port forwarding, map local port 8443 to target port 443, add
`127.0.0.1 <domain>` to the operator workstation, and browse to
`https://<domain>:8443/login`. The default certificate is self-signed, so the
browser presents a warning until the operator explicitly trusts or replaces
it. Preserve `:8443` after authentication redirects.

## 8. Fully load bundled extensions (optional)

Core success does not finish a bundle that contains extensions. Run the full
load in a **separate** detached unit after the authenticated API is ready. Reuse
the exact root recorded during pre-stage; do not extract another copy without a
specific reason.

Create `/run/kamiwaza-offline-extensions.sh` through a root-owned quoted
heredoc:

```bash
(
set -euo pipefail
sudo install -o root -g root -m 0700 /dev/null \
  /run/kamiwaza-offline-extensions.sh
sudo tee /run/kamiwaza-offline-extensions.sh >/dev/null <<'KAMIWAZA_EXTENSIONS'
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf
unset NAMESPACE

DOMAIN='<domain>'
RUN_ID="${1:?pass the recorded run ID}"
ATTEMPT_ID="${2:?pass the recorded attempt number}"
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${ATTEMPT_ID}" =~ ^[0-9]+$ ]]
ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/extension-attempts/attempt${ATTEMPT_ID}"
STATUS_FILE="${ATTEMPT_DIR}/result.rc"
ROOT_RECORD="/var/lib/kajiya-reports/offline-install/${RUN_ID}/bundle-root"
BUNDLE_ROOT="$(<"${ROOT_RECORD}")"

test -d "${ATTEMPT_DIR}"
test ! -e "${STATUS_FILE}"
umask 077
cat /proc/sys/kernel/random/boot_id >"${ATTEMPT_DIR}/boot-id"
exec >"${ATTEMPT_DIR}/console.log" 2>&1

finish() {
  rc=$?
  trap - EXIT
  status_tmp="$(mktemp "${STATUS_FILE}.tmp.XXXXXX")"
  printf '%s\n' "${rc}" >"${status_tmp}"
  chmod 0600 "${status_tmp}"
  mv -f "${status_tmp}" "${STATUS_FILE}"
  exit "${rc}"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

[[ -n "${DOMAIN}" && "${DOMAIN}" != *'<'* ]]
test -d "${BUNDLE_ROOT}"
test -x "${BUNDLE_ROOT}/scripts/install-extensions-bundle.sh"

# Do not persist the seeded credential in a second file. Feed it to the helper
# on stdin; see the argv limitation immediately below.
ADMIN_PASSWORD="$(
  kubectl -n kamiwaza get secret kamiwaza-user-admin \
    -o jsonpath='{.data.password}' | base64 -d
)"

printf '%s\n' "${ADMIN_PASSWORD}" |
  "${BUNDLE_ROOT}/scripts/install-extensions-bundle.sh" \
    --bundle-root "${BUNDLE_ROOT}" \
    --container-cli podman \
    --sudo-mode always \
    --api-url "https://${DOMAIN}/api" \
    --username admin \
    --password-stdin
unset ADMIN_PASSWORD
KAMIWAZA_EXTENSIONS
)
```

The current bundle helper accepts `--password-stdin`, but its catalog-import
subprocess can still expand that value into a child command's arguments. This
has the same temporary privileged-process visibility limitation as the core
installer. Do not capture full process argument lists during this phase.

Launch and monitor it like the core phase:

```bash
export RUN_ID="<release-or-run>"
export EXT_ATTEMPT=1
export EXT_UNIT="kamiwaza-offline-extensions-${RUN_ID}-attempt${EXT_ATTEMPT}.service"
export EXT_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/extension-attempts/attempt${EXT_ATTEMPT}"
export EXT_STATUS="${EXT_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${EXT_ATTEMPT}" =~ ^[0-9]+$ ]]
sudo bash -n /run/kamiwaza-offline-extensions.sh
sudo chmod 0700 /run/kamiwaza-offline-extensions.sh
sudo install -d -o root -g root -m 0700 "$(dirname "${EXT_ATTEMPT_DIR}")"
sudo mkdir -m 0700 "${EXT_ATTEMPT_DIR}"
sudo systemd-run \
  --no-block \
  --service-type=oneshot \
  --remain-after-exit \
  --unit="${EXT_UNIT%.service}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-extensions.sh "${RUN_ID}" "${EXT_ATTEMPT}"
printf 'record unit=%s attempt_dir=%s\n' "${EXT_UNIT}" "${EXT_ATTEMPT_DIR}"
)

sudo tail -F "${EXT_ATTEMPT_DIR}/console.log"
```

After the unit is terminal, stop following with Ctrl-C and gate the exact
recorded attempt:

```bash
export RUN_ID="<release-or-run>"
export EXT_ATTEMPT=1
export EXT_UNIT="kamiwaza-offline-extensions-${RUN_ID}-attempt${EXT_ATTEMPT}.service"
export EXT_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/extension-attempts/attempt${EXT_ATTEMPT}"
export EXT_STATUS="${EXT_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
test "$(sudo cat "${EXT_ATTEMPT_DIR}/boot-id")" = \
  "$(cat /proc/sys/kernel/random/boot_id)"
EXT_STATE="$(sudo systemctl show "${EXT_UNIT}" \
  -p LoadState -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p InvocationID)"
printf '%s\n' "${EXT_STATE}"
for expected in \
  LoadState=loaded ActiveState=active SubState=exited \
  Result=success ExecMainCode=1 ExecMainStatus=0; do
  if ! grep -Fxq "${expected}" <<<"${EXT_STATE}"; then
    printf 'extension unit state gate failed: missing %s\n' "${expected}" >&2
    exit 1
  fi
done
grep -Eq '^InvocationID=.+$' <<<"${EXT_STATE}"
test "$(sudo cat "${EXT_STATUS}")" = 0
sudo env \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  KUBECONFIG=/var/lib/k0s/pki/admin.conf \
  kubectl get pods -A
)
```

Also require all expected local-registry manifests and healthy workloads.
Record the exact stored and visible catalog counts for the selected immutable
bundle. Stored and visible counts can differ when product posture intentionally
hides a template; verify both instead of assuming that an absent UI card means
import failed.

Customer level-2 completion does not require private Kajiya smoke helpers or
unpublished expected-count files. If the publisher supplies an additional
hash-authenticated validation pack, run its resource assertions; otherwise
record the observed evidence without substituting dated counts from this page.

Do not blindly rerun only the catalog importer after success. Existing hidden
templates can be invisible to its list call and then cause a duplicate-create
HTTP 400.

## 9. Run the internal release deploy gate (release parity)

This section is for Kamiwaza release engineers. The normal customer bundle does
not contain `smoke-extension-deploy.sh`, the Konnectivity guard, or expected
release-gate values. Do not require this section for customer level-1 or level-2
completion. For release/nightly parity, transfer the selected run's separate
validation pack and verify its recorded hashes; never download `develop` at
install time.

Install the verified gate into a fresh root-only directory:

```bash
export RUN_ID="<release-or-run>"
export GATE_SOURCE="<secure-path-to-smoke-extension-deploy.sh>"
export GATE_SHA256="<sha256-from-selected-validation-pack>"
export GATE_HELPER_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/release-validation"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${GATE_SHA256}" =~ ^[0-9a-fA-F]{64}$ ]]
[[ "${GATE_SOURCE}" != *'<'* ]]
test -f "${GATE_SOURCE}"
printf '%s  %s\n' "${GATE_SHA256}" "${GATE_SOURCE}" | sha256sum -c -
sudo install -d -o root -g root -m 0700 "$(dirname "${GATE_HELPER_DIR}")"
sudo mkdir -m 0700 "${GATE_HELPER_DIR}"
sudo install -o root -g root -m 0700 "${GATE_SOURCE}" \
  "${GATE_HELPER_DIR}/smoke-extension-deploy.sh"
printf '%s  %s\n' "${GATE_SHA256}" \
  "${GATE_HELPER_DIR}/smoke-extension-deploy.sh" | sudo sha256sum -c -
)
```

The currently selected 1.2.0 gate deploys `kaizen`, but the selected release
contract controls the exact template. The gate waits for readiness, proves that
relocation left no external image references, and removes it through the
supported API path. A raw `kubectl apply` bypasses that behavior and is not an
equivalent test.

Create `/run/kamiwaza-offline-extension-gate.sh` through a root-owned quoted
heredoc, replacing the placeholders with the recorded domain and gate values:

```bash
(
set -euo pipefail
sudo install -o root -g root -m 0700 /dev/null \
  /run/kamiwaza-offline-extension-gate.sh
sudo tee /run/kamiwaza-offline-extension-gate.sh >/dev/null <<'KAMIWAZA_GATE'
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf
unset NAMESPACE

DOMAIN='<domain>'
RUN_ID="${1:?pass the recorded run ID}"
ATTEMPT_ID="${2:?pass the recorded attempt number}"
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${ATTEMPT_ID}" =~ ^[0-9]+$ ]]
ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/gate-attempts/attempt${ATTEMPT_ID}"
STATUS_FILE="${ATTEMPT_DIR}/result.rc"
GATE_SCRIPT="/var/lib/kajiya-reports/offline-install/${RUN_ID}/release-validation/smoke-extension-deploy.sh"
GATE_TEMPLATE='<exact-gate-template-from-selected-release>'
GATE_WAIT_TIMEOUT='<exact-gate-timeout-from-selected-release>'

test -d "${ATTEMPT_DIR}"
test ! -e "${STATUS_FILE}"
umask 077
cat /proc/sys/kernel/random/boot_id >"${ATTEMPT_DIR}/boot-id"
exec >"${ATTEMPT_DIR}/console.log" 2>&1

finish() {
  rc=$?
  trap - EXIT
  status_tmp="$(mktemp "${STATUS_FILE}.tmp.XXXXXX")"
  printf '%s\n' "${rc}" >"${status_tmp}"
  chmod 0600 "${status_tmp}"
  mv -f "${status_tmp}" "${STATUS_FILE}"
  exit "${rc}"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

[[ -n "${DOMAIN}" && "${DOMAIN}" != *'<'* ]]
[[ "${GATE_TEMPLATE}" != *'<'* ]]
[[ "${GATE_WAIT_TIMEOUT}" != *'<'* ]]
test -x "${GATE_SCRIPT}"
ADMIN_PASSWORD="$(
  kubectl -n kamiwaza get secret kamiwaza-user-admin \
    -o jsonpath='{.data.password}' | base64 -d
)"

printf '%s\n' "${ADMIN_PASSWORD}" |
  bash "${GATE_SCRIPT}" \
    --api-url "https://${DOMAIN}/api" \
    --username admin \
    --password-stdin \
    --template-name "${GATE_TEMPLATE}" \
    --wait-timeout "${GATE_WAIT_TIMEOUT}"
unset ADMIN_PASSWORD
KAMIWAZA_GATE
)
```

Launch and gate it independently:

```bash
export RUN_ID="<release-or-run>"
export GATE_ATTEMPT=1
export GATE_UNIT="kamiwaza-offline-extension-gate-${RUN_ID}-attempt${GATE_ATTEMPT}.service"
export GATE_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/gate-attempts/attempt${GATE_ATTEMPT}"
export GATE_STATUS="${GATE_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
[[ "${RUN_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "${GATE_ATTEMPT}" =~ ^[0-9]+$ ]]
sudo bash -n /run/kamiwaza-offline-extension-gate.sh
sudo chmod 0700 /run/kamiwaza-offline-extension-gate.sh
sudo install -d -o root -g root -m 0700 "$(dirname "${GATE_ATTEMPT_DIR}")"
sudo mkdir -m 0700 "${GATE_ATTEMPT_DIR}"
sudo systemd-run \
  --no-block \
  --service-type=oneshot \
  --remain-after-exit \
  --unit="${GATE_UNIT%.service}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-extension-gate.sh "${RUN_ID}" "${GATE_ATTEMPT}"
printf 'record unit=%s attempt_dir=%s\n' "${GATE_UNIT}" "${GATE_ATTEMPT_DIR}"
)

sudo tail -F "${GATE_ATTEMPT_DIR}/console.log"
```

After the unit is terminal, require the retained unit tuple and the matching
durable receipt:

```bash
export RUN_ID="<release-or-run>"
export GATE_ATTEMPT=1
export GATE_UNIT="kamiwaza-offline-extension-gate-${RUN_ID}-attempt${GATE_ATTEMPT}.service"
export GATE_ATTEMPT_DIR="/var/lib/kajiya-reports/offline-install/${RUN_ID}/gate-attempts/attempt${GATE_ATTEMPT}"
export GATE_STATUS="${GATE_ATTEMPT_DIR}/result.rc"

(
set -euo pipefail
test "$(sudo cat "${GATE_ATTEMPT_DIR}/boot-id")" = \
  "$(cat /proc/sys/kernel/random/boot_id)"
GATE_STATE="$(sudo systemctl show "${GATE_UNIT}" \
  -p LoadState -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p InvocationID)"
printf '%s\n' "${GATE_STATE}"
for expected in \
  LoadState=loaded ActiveState=active SubState=exited \
  Result=success ExecMainCode=1 ExecMainStatus=0; do
  if ! grep -Fxq "${expected}" <<<"${GATE_STATE}"; then
    printf 'deploy-gate unit state gate failed: missing %s\n' "${expected}" >&2
    exit 1
  fi
done
grep -Eq '^InvocationID=.+$' <<<"${GATE_STATE}"
test "$(sudo cat "${GATE_STATUS}")" = 0
)
```

Also run any Konnectivity or authenticated resource gate in the same validation
pack. Record every script's source commit and SHA-256. The temporary child-argv
limitation described in the extension-load phase also applies to this helper.

SDK tests, UAT data seeding, DNS publication, and A/B promotion are separate
demo or publication phases. They are not required to call the base platform or
extension bundle installed.

## Reruns, recovery, and diagnostics

- Download and part assembly are safely repeatable. The download block removes
  an unverifiable or unresumable `.partial`; remove a failed `.assembling`
  before retrying assembly. Verify final-target SHA-256 after every transfer.
- `rpm --replacepkgs` is intentional. A core installer rerun is **not** a
  generic reset: inspect the existing unit, Ansible recap, cluster, registry,
  and surviving child processes first. Recreate the root-only password file
  before every core attempt because the launcher removes it on exit.
- Before staging a different release, archive or remove only the previous
  release's RPM, numbered wrap chunks, checksum, signature, public key, and
  extension archive/sidecar, root-staged `*.parts.json` manifests, and
  `artifacts.tsv` from `/opt/kamiwaza/prereqs`. Never mix release artifact
  families or broadly delete the packaged prerequisite tree. For an
  exact-release retry, verify the existing files and reuse them.
- Use monotonically named units and fresh per-attempt directories. Never reuse
  an attempt number or overwrite a terminal receipt, log, or recap before the
  cause is understood. After preserving evidence, stop a retained unit to
  release its systemd state. If a launcher was killed before its exit trap,
  confirm that its unit and children have stopped, then remove its exact
  `/run/kamiwaza-admin-extra-vars-<run>-attempt<n>.json` file before retrying.
- Reuse a verified pre-extracted extension root. Do not select among stale
  directories with an unordered search.
- Do not blindly rerun an extension or deploy-gate phase after interruption.
  First compare its persistent log, stored and visible catalog state, local
  manifests, and API resources. If catalog import completed, reconcile it
  instead of creating duplicates. If the deploy gate stranded its test
  deployment, remove that exact deployment through the supported API before a
  new attempt.
- An SSM disconnect does not stop a system unit. A host reboot does remove all
  transient units and every contract, secret, and launcher under `/run`. A
  missing durable `result.rc` after reboot is interrupted/unknown, never
  success. Inspect partial state, recreate `/run` inputs, and allocate a new
  attempt. A pre-reboot `result.rc` of `0` is usable only with its saved recap
  and fresh post-reboot health and provenance gates.
- Never delete clusters, PVCs, registry volumes, or an instance as a default
  retry. Destructive recovery requires a separate backup and rollback decision.
- Do not treat repeated red `HEAD`/manifest-not-found lines from a local
  registry as fatal by color alone. Determine whether the importer is probing
  before upload, then use the unit result and final manifest/digest gates.

Useful focused diagnostics:

```bash
ROOT_TOOLS=(sudo env \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HELM_PLUGINS=/usr/local/share/helm/plugins \
  KUBECONFIG=/var/lib/k0s/pki/admin.conf)
sudo systemctl show <unit>.service \
  -p LoadState -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p InvocationID
sudo journalctl -u <unit>.service -o cat
"${ROOT_TOOLS[@]}" kubectl get nodes -o wide
"${ROOT_TOOLS[@]}" kubectl get pods -A -o wide
"${ROOT_TOOLS[@]}" kubectl get events -A --sort-by=.lastTimestamp
"${ROOT_TOOLS[@]}" helm list -A
sudo podman ps -a
df -hT / /tmp /var/tmp /var/lib /opt
```

If a preflight aborts at `storage_host_prep`, `/var/lib` cannot fit the
configured storage image on its actual backing filesystem. Grow or remount that
filesystem before retrying; do not treat the abort as a prompt or bypass the
preflight.

Keep secrets and full process argument lists out of diagnostic captures. If a
password appears in output, treat it as exposed and rotate it through a
supported path after the installation is stable.

## Next steps

- [Quickstart](../quickstart.md) — verify the user-facing platform.
- [Uninstalling Kamiwaza](uninstall.md).
