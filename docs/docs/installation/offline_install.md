# Offline Installation

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
3. **Release parity:** one bundled extension is deployed, verified, and removed
   through the supported catalog/API path, plus any additional gates recorded
   by the selected release run.

Do not report level 2 or 3 after only pre-staging the extension catalog.

## Before you begin

You need:

- A supported RHEL-compatible 9.x x86_64 host that meets the
  [System Requirements](system_requirements.md).
- A host name no longer than 54 characters.
- A Kamiwaza license and access to one **immutable** release or Kajiya run.
- A connected staging machine if the target cannot download the artifacts.
- Root access on the target. For a remote private host, Session Manager (SSM)
  or an equivalent managed shell is preferred over SSH.
- Bash 4 or newer plus GNU `coreutils`, `findutils`, `curl`, `jq`, `gpg`, and
  `tar` on the connected staging machine. The verification snippets use GNU
  options and do not run in stock macOS Bash; use a trusted Linux staging host
  or container when the connected workstation is a Mac. If the target has no
  reachable RHEL repositories, those tools and all OS packages required by the
  selected prerequisite bootstrap must already be available through a trusted
  local repository or the verified handoff.

### Check the actual filesystems

The bundle, extracted extensions, container images, and the Rook/Ceph OSD can
live on different filesystems. A large virtual disk is not proof that
`/var/lib` or `/tmp` has room; cloud RHEL images commonly put `/var` on a small
logical volume.

Before transfer, calculate the compressed bundle total, the extracted
extension size, installer scratch, image-store growth, the configured OSD image
size, and operational headroom. Then check the backing filesystems:

```bash
df -hT / /tmp /var/lib
findmnt -T /tmp
findmnt -T /var/lib
lsblk -f
```

As a planning floor for the current small profile, allow at least 30 GB free on
`/`, 25 GB on `/tmp`, and 140 GB on `/var/lib`. These are not substitutes for
the calculation above: a larger OSD, bundle, or image set requires more. Grow
the correct PV/LV/filesystem before installation and run `df` again afterward.

Also confirm that no package manager, previous installer, Kubernetes bootstrap,
or local-registry import is running. Understand any existing `/opt/kamiwaza`,
`/var/lib/k0s`, Podman, or cluster state before rerunning an installer.

Verify the host before transferring large artifacts:

```bash
test "$(uname -m)" = x86_64
grep -E 'release 9([. ]|$)' /etc/redhat-release
test "$(hostnamectl --static | wc -c)" -le 55
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
- every object name, size, and SHA-256;
- runtime, resource profile, OSD size, Helm timeout, and compatibility flags;
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

The number and names are release-specific. Export the exact package inventory
from Keygen or the build handoff into `artifacts.tsv`, with tab-separated
filename, byte count, and SHA-256 columns. Include the generated part manifests,
parts, and part sidecars when present. Keep this inventory with the installation
record.

## 2. Download, transfer, and verify artifacts

On the connected staging machine, use the selected package URL and the exact
inventory. The example below is deliberately parameterized; `<release>` is the
immutable selected release or run tag, not a version copied from this page.

```bash
read -rsp 'Kamiwaza license token: ' KEYGEN_TOKEN; printf '\n'
export KEYGEN_TOKEN
export RELEASE="<release>"
export PACKAGE_KEY="<exact-package-key-from-the-selected-release>"
export BASE="https://raw.pkg.keygen.sh/kamiwaza/kamiwaza-prod/@${PACKAGE_KEY}/${RELEASE}"
export ARTIFACT_DIR="${PWD}/kamiwaza-offline-${RELEASE}"

install -d -m 0755 "${ARTIFACT_DIR}"
cp /secure/path/artifacts.tsv "${ARTIFACT_DIR}/artifacts.tsv"
cd "${ARTIFACT_DIR}"

while IFS=$'\t' read -r file expected_size expected_sha; do
  [[ -n "${file}" && "${file}" != \#* ]] || continue
  [[ "${file}" != */* && "${file}" != .* ]]
  [[ "${expected_size}" =~ ^[0-9]+$ ]]
  [[ "${expected_sha}" =~ ^[0-9a-fA-F]{64}$ ]]

  if [[ -f "${file}" ]] &&
     [[ "$(stat -c %s "${file}")" = "${expected_size}" ]] &&
     printf '%s  %s\n' "${expected_sha}" "${file}" | sha256sum -c - >/dev/null; then
    printf 'already verified: %s\n' "${file}"
    continue
  fi
  rm -f "${file}"

  if [[ -f "${file}.partial" ]] &&
     [[ "$(stat -c %s "${file}.partial")" = "${expected_size}" ]] &&
     printf '%s  %s\n' "${expected_sha}" "${file}.partial" | sha256sum -c - >/dev/null; then
    mv "${file}.partial" "${file}"
    continue
  fi
  if [[ -f "${file}.partial" ]] &&
     (($(stat -c %s "${file}.partial") >= expected_size)); then
    rm -f "${file}.partial"
  fi

  curl -fL --retry 5 --retry-delay 10 --retry-all-errors --continue-at - \
    -H "Authorization: License ${KEYGEN_TOKEN}" \
    -o "${file}.partial" \
    "${BASE}/${file}"

  if [[ "$(stat -c %s "${file}.partial")" != "${expected_size}" ]] ||
     ! printf '%s  %s\n' "${expected_sha}" "${file}.partial" | sha256sum -c -; then
    rm -f "${file}.partial"
    printf 'download verification failed: %s\n' "${file}" >&2
    exit 1
  fi
  mv "${file}.partial" "${file}"
done < artifacts.tsv

unset KEYGEN_TOKEN
```

Do not put license tokens in command logs, shell history, or the installation
record. A cloud-to-cloud relay may be faster than a local upload, but use a
managed identity or short-lived prefix-scoped credential and verify again on
the final target. S3 ETags are not SHA-256 integrity checks.

### Reassemble distribution parts

Each `.parts.json` records the original filename/hash and the ordered part
inventory. Reassemble from that manifest instead of hardcoding part counts:

```bash
shopt -s nullglob
for manifest in *.parts.json; do
  output="$(jq -r '.source.filename' "${manifest}")"
  expected_size="$(jq -r '.source.size' "${manifest}")"
  expected_sha="$(jq -r '.source.sha256' "${manifest}")"

  : > "${output}.assembling"
  while IFS=$'\t' read -r part part_sha; do
    printf '%s  %s\n' "${part_sha}" "${part}" | sha256sum -c -
    cat "${part}" >> "${output}.assembling"
  done < <(jq -r '.parts[] | [.filename, .sha256] | @tsv' "${manifest}")

  test "$(stat -c %s "${output}.assembling")" = "${expected_size}"
  printf '%s  %s\n' "${expected_sha}" "${output}.assembling" | sha256sum -c -
  mv "${output}.assembling" "${output}"
done
```

### Verify source artifacts and the logical wrap

Verify every artifact recorded in `release_origination.md`:

```bash
awk '
  $0 == "## Artifacts" { in_artifacts=1; next }
  in_artifacts && /^## / { exit }
  in_artifacts && /^- / {
    name=$2; sub(/:$/, "", name); print name, $3
  }
' release_origination.md |
while read -r file expected; do
  test -f "${file}"
  printf '%s  %s\n' "${expected}" "${file}" | sha256sum -c -
done
```

`kamiwaza-helm.sha256` names the **logical concatenated wrap**, which might not
exist as a physical file. Hash the bytewise concatenation of all numbered wrap
chunks in natural numeric order. Creating a similarly named symlink does not
verify this contract.

```bash
mapfile -d '' WRAP_CHUNKS < <(
  find . -maxdepth 1 -type f -regextype posix-extended \
    -regex './kamiwaza-helm\.[0-9]+\.tar' -print0 | sort -z -V
)
((${#WRAP_CHUNKS[@]} > 0))

expected="$(awk 'NR==1 {print $1}' kamiwaza-helm.sha256)"
actual="$(cat "${WRAP_CHUNKS[@]}" | sha256sum | awk '{print $1}')"
test "${actual}" = "${expected}"
printf 'logical wrap checksum: OK (%s chunks)\n' "${#WRAP_CHUNKS[@]}"
```

Verify the detached signature over the checksum file. Confirm the signer
fingerprint through an independent trusted channel; a key delivered in the same
directory proves bundle consistency, not independently anchored provenance.

```bash
export GNUPGHOME="$(mktemp -d)"
chmod 0700 "${GNUPGHOME}"
gpg --batch --import ./kamiwaza-tools-rpm.pub.gpg
gpg --batch --verify ./kamiwaza-helm.asc ./kamiwaza-helm.sha256
gpg --batch --with-colons --fingerprint
rm -rf "${GNUPGHOME}"
unset GNUPGHOME
```

Transfer the entire verified directory to the target, then repeat the hash,
logical-wrap, and signature checks there. Perform the rest of this guide only
from that final target copy.

## 3. Install and verify embedded prerequisites

Move the verified artifacts into the fixed prerequisite path, install the exact
RPM, and run its packaged bootstrap noninteractively:

```bash
export ARTIFACT_DIR="/var/tmp/kamiwaza-offline/<release-or-run>"

sudo install -d -m 0755 /opt/kamiwaza/prereqs
sudo cp "${ARTIFACT_DIR}"/kamiwaza-prod-*.el9.x86_64.rpm \
  "${ARTIFACT_DIR}"/kamiwaza-helm.*.tar \
  "${ARTIFACT_DIR}"/kamiwaza-helm.sha256 \
  "${ARTIFACT_DIR}"/kamiwaza-helm.asc \
  "${ARTIFACT_DIR}"/kamiwaza-tools-rpm.pub.gpg \
  /opt/kamiwaza/prereqs/

sudo rpm -Uvh --replacepkgs /opt/kamiwaza/prereqs/kamiwaza-prod-*.el9.x86_64.rpm
sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --yes \
  --embedded-root /opt/kamiwaza/prereqs \
  --os rhel
```

If this exact packaged bootstrap does not support `--yes`, use its documented
noninteractive option. Do not pipe repeated `yes` or press Enter to drive a
long unattended install.

The install runs as root, so verify tools using root's actual environment:

```bash
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
export HELPER_DIR="/var/tmp/kamiwaza-extension-helper-${RUN_ID}"

sudo cp "${ARTIFACT_DIR}/${EXT_BUNDLE}" \
  "${ARTIFACT_DIR}/${EXT_BUNDLE}.sha256" \
  /opt/kamiwaza/prereqs/

mapfile -t BUNDLE_TOP_LEVELS < <(
  tar -tzf "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" |
    awk -F/ 'NF {print $1}' | sort -u
)
test "${#BUNDLE_TOP_LEVELS[@]}" -eq 1
export BUNDLE_DIR_NAME="${BUNDLE_TOP_LEVELS[0]}"

sudo install -d -m 0755 "${HELPER_DIR}"
sudo tar -xzf "/opt/kamiwaza/prereqs/${EXT_BUNDLE}" -C "${HELPER_DIR}"
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
  "KAMIWAZA_ROOK_OSD_IMAGE_SIZE": "<exact>",
  "KAMIWAZA_RESOURCE_PROFILE": "<exact>",
  "HELMFILE_EXTRA_SET": "<exact, including spaces>",
  "KAMIWAZA_HELM_TIMEOUT": "<exact>",
  "KAMIWAZA_OFFLINE_APP_IMAGE_TAG": "<exact>",
  "KAMIWAZA_OFFLINE_CORE_TAG": "<exact>",
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
CONTRACT_SOURCE=/secure/path/kamiwaza-install-contract.json
jq -e '
  type == "object" and
  (keys | sort) == ([
    "HELMFILE_EXTRA_SET",
    "KAMIWAZA_HELM_TIMEOUT",
    "KAMIWAZA_IMAGE_OVERRIDES",
    "KAMIWAZA_IMAGE_TAG",
    "KAMIWAZA_K8S_RUNTIME",
    "KAMIWAZA_OFFLINE_APP_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG",
    "KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG",
    "KAMIWAZA_OFFLINE_CORE_TAG",
    "KAMIWAZA_OFFLINE_FRONTEND_TAG",
    "KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG",
    "KAMIWAZA_RESOURCE_PROFILE",
    "KAMIWAZA_ROOK_OSD_IMAGE_SIZE",
    "KAMIWAZA_VERSION"
  ] | sort) and
  all(.[]; type == "string")
' "${CONTRACT_SOURCE}"
sudo install -o root -g root -m 0600 \
  "${CONTRACT_SOURCE}" /run/kamiwaza-install-contract.json
```

Use the exact release contract even when several values happen to share a tag.
Do not synthesize missing values from the release number.
`KAMIWAZA_K8S_RUNTIME` must be `k0s-podman` for this guide. If the selected
contract names another runtime, stop and use that runtime's runbook.

### Password limitation

The current vendor installer accepts the initial admin password through
`--admin-password`. Although the runner below keeps it out of the saved
launcher, unit environment, and journal, the installer expands it into child
process arguments. A privileged user can observe it during the install.

Proceed only if that temporary privileged-argv exposure is acceptable. Do not
run full-command-line diagnostics such as `ps auxww` during installation. If
your security policy requires file-descriptor, file, or standard-input secret
transport end to end, stop until the installer provides that interface.

Read the password without echoing it and create a transient root-only file:

```bash
read -rsp 'Initial Kamiwaza admin password: ' ADMIN_PASSWORD; printf '\n'
printf '%s' "${ADMIN_PASSWORD}" | sudo tee /run/kamiwaza-admin-password >/dev/null
unset ADMIN_PASSWORD
sudo chmod 0600 /run/kamiwaza-admin-password
```

Create `/run/kamiwaza-offline-install.sh` as root, mode 0700:

```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf

CONTRACT=/run/kamiwaza-install-contract.json
PASSWORD_FILE=/run/kamiwaza-admin-password
STATUS_FILE=/run/kamiwaza-offline-install.rc

finish() {
  rc=$?
  rm -f "${PASSWORD_FILE}"
  printf '%s\n' "${rc}" >"${STATUS_FILE}"
}
trap finish EXIT

test -s "${CONTRACT}"
test -s "${PASSWORD_FILE}"
test -f /opt/kamiwaza/prereqs/kamiwaza-helm.sha256
test -f /opt/kamiwaza/prereqs/kamiwaza-helm.asc
test -f /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg

CONTRACT_KEYS=(
  KAMIWAZA_VERSION
  KAMIWAZA_IMAGE_TAG
  KAMIWAZA_K8S_RUNTIME
  KAMIWAZA_ROOK_OSD_IMAGE_SIZE
  KAMIWAZA_RESOURCE_PROFILE
  HELMFILE_EXTRA_SET
  KAMIWAZA_HELM_TIMEOUT
  KAMIWAZA_OFFLINE_APP_IMAGE_TAG
  KAMIWAZA_OFFLINE_CORE_TAG
  KAMIWAZA_OFFLINE_FRONTEND_TAG
  KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG
  KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG
  KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG
  KAMIWAZA_IMAGE_OVERRIDES
)
for name in "${CONTRACT_KEYS[@]}"; do
  printf -v "${name}" '%s' "$(jq -er --arg name "${name}" '.[$name] | strings' "${CONTRACT}")"
  export "${name}"
done

ADMIN_PASSWORD="$(<"${PASSWORD_FILE}")"
/opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --skip-prereq-bootstrap \
  --domain '<domain>' \
  --admin-password "${ADMIN_PASSWORD}" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  -e "helm_timeout=${KAMIWAZA_HELM_TIMEOUT}" \
  -y
unset ADMIN_PASSWORD
```

Replace `<domain>`, then validate and protect the launcher:

```bash
sudo bash -n /run/kamiwaza-offline-install.sh
sudo chmod 0700 /run/kamiwaza-offline-install.sh
sudo rm -f /run/kamiwaza-offline-install.rc
```

## 6. Launch through SSM without tying the install to the shell

An SSM interactive shell can time out while a healthy installation is still
running. Launch each attempt as a distinct transient systemd unit:

```bash
export ATTEMPT=1
sudo systemd-run \
  --no-block \
  --unit="kamiwaza-offline-install-attempt${ATTEMPT}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-install.sh
```

Immediately record the unit name and these watch commands:

```bash
sudo journalctl -fu "kamiwaza-offline-install-attempt${ATTEMPT}.service"

sudo systemctl show "kamiwaza-offline-install-attempt${ATTEMPT}.service" \
  -p ActiveState -p SubState -p Result -p ExecMainStatus
```

Journal activity—or quietness—is not a completion signal. Because
`KillMode=process` and `Delegate=yes` allow runtime children to survive the
launcher, a stopped unit also does not prove all children stopped after an
error. Declare the core launcher successful only when all of these agree:

- `Result=success` and `ExecMainStatus=0`;
- `/run/kamiwaza-offline-install.rc` contains `0`;
- the final Ansible recap has `failed=0` and `unreachable=0`; and
- the independent workload checks in the next section pass.

`systemd-run` is preferred on RHEL because it preserves an authoritative exit
status. If systemd transient units are unavailable, the launcher can be
detached with `nohup`:

```bash
sudo nohup /bin/bash /run/kamiwaza-offline-install.sh \
  </dev/null >/var/log/kamiwaza-offline-install.log 2>&1 &
```

In that fallback, require the runner's `.rc` file plus the final recap and all
independent health gates; the background PID disappearing is not success.

## 7. Verify the core installation

The `k0s-podman` topology is nested:

```text
RHEL host -> Podman-contained k0s node -> Kubernetes pods
```

Host processes and Kubernetes workloads do not share one network namespace.
Use the k0s admin kubeconfig and the node IP reported by Kubernetes. If an EC2
instance role is intentionally available to workloads, the instance metadata
response hop limit must support this nested path; explicit S3 credentials
remain supported when ambient identity is not desired.

Run:

```bash
export DOMAIN="<domain>"
export KUBECONFIG=/var/lib/k0s/pki/admin.conf

sudo systemctl show "kamiwaza-offline-install-attempt${ATTEMPT}.service" \
  -p Result -p ExecMainStatus -p ActiveState
sudo kubectl get nodes -o wide
sudo kubectl get pods -A
sudo helm list -A

NODE_IP="$(sudo kubectl get nodes -o wide --no-headers | awk 'NR==1 {print $6}')"
curl -k --resolve "${DOMAIN}:443:${NODE_IP}" \
  -o /dev/null -w 'HTTP %{http_code}\n' \
  "https://${DOMAIN}/api/auth/health"
```

An unauthenticated endpoint can return 401 or 403 while routing is healthy, so
that curl is only a reachability check. Also verify login and an authenticated
API request, deployed Helm releases, expected local-registry manifests, and
the live pod `imageID` digests against the selected release contract. Health
without expected digest evidence proves function, not artifact provenance.

The domain must resolve both from the install host and from the operator's
browser. Add one exact, reviewed `/etc/hosts` entry only when DNS is not ready;
do not append duplicates on every retry.

For SSM port forwarding, map local port 8443 to target port 443, add
`127.0.0.1 <domain>` to the operator workstation, and browse to
`https://<domain>:8443`. Preserve `:8443` after authentication redirects.

## 8. Fully load bundled extensions (optional)

Core success does not finish a bundle that contains extensions. Run the full
load in a **separate** detached unit after the authenticated API is ready. Reuse
the exact root recorded during pre-stage; do not extract another copy without a
specific reason.

Create `/run/kamiwaza-offline-extensions.sh` as root, mode 0700:

```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf

DOMAIN='<domain>'
ROOT_RECORD='/var/lib/kajiya-reports/offline-install/<release-or-run>/bundle-root'
BUNDLE_ROOT="$(<"${ROOT_RECORD}")"

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
```

The current bundle helper accepts `--password-stdin`, but its catalog-import
subprocess can still expand that value into a child command's arguments. This
has the same temporary privileged-process visibility limitation as the core
installer. Do not capture full process argument lists during this phase.

Launch and monitor it like the core phase:

```bash
sudo bash -n /run/kamiwaza-offline-extensions.sh
sudo chmod 0700 /run/kamiwaza-offline-extensions.sh

export EXT_ATTEMPT=1
sudo systemd-run \
  --no-block \
  --unit="kamiwaza-offline-extensions-attempt${EXT_ATTEMPT}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-extensions.sh

sudo journalctl -fu "kamiwaza-offline-extensions-attempt${EXT_ATTEMPT}.service"
sudo systemctl show "kamiwaza-offline-extensions-attempt${EXT_ATTEMPT}.service" \
  -p ActiveState -p SubState -p Result -p ExecMainStatus
```

Require unit success, all expected local-registry manifests, healthy workloads,
and exact stored and visible catalog counts for the selected immutable bundle.
Stored and visible counts can differ when product posture intentionally hides a
template; verify both instead of assuming that an absent UI card means import
failed.

The release handoff must provide the exact commands and expected digest/count
files for these assertions. Run its hash-verified authenticated resource gate
and diagnostics from the recorded Kajiya commit. If that executable gate or its
expected values are absent, the operator cannot make a release-provenance claim;
obtain them from the publisher instead of substituting dated counts from this
page.

Do not blindly rerun only the catalog importer after success. Existing hidden
templates can be invisible to its list call and then cause a duplicate-create
HTTP 400.

## 9. Run the release deploy gate (release parity)

For release/nightly parity, use the exact hash-verified
`smoke-extension-deploy.sh` and any additional guard scripts from the selected
Kajiya commit. Store them in the session's root-only helper directory. The
currently selected 1.2.0 gate deploys `kaizen`, but the selected release
contract controls the exact template. The gate waits for readiness, proves that
relocation left no external image references, and removes it through the
supported API path. A raw `kubectl apply` bypasses that behavior and is not an
equivalent test.

Create `/run/kamiwaza-offline-extension-gate.sh` as root, mode 0700, replacing
the placeholders with the recorded helper path and domain:

```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export HELM_PLUGINS=/usr/local/share/helm/plugins
export KUBECONFIG=/var/lib/k0s/pki/admin.conf

DOMAIN='<domain>'
GATE_SCRIPT='/var/lib/kajiya-reports/offline-install/<release-or-run>/helpers/smoke-extension-deploy.sh'
GATE_TEMPLATE='<exact-gate-template-from-selected-release>'
GATE_WAIT_TIMEOUT='<exact-gate-timeout-from-selected-release>'

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
```

Launch and gate it independently:

```bash
sudo bash -n /run/kamiwaza-offline-extension-gate.sh
sudo chmod 0700 /run/kamiwaza-offline-extension-gate.sh

export GATE_ATTEMPT=1
sudo systemd-run \
  --no-block \
  --unit="kamiwaza-offline-extension-gate-attempt${GATE_ATTEMPT}" \
  --property=KillMode=process \
  --property=Delegate=yes \
  --property=TimeoutStartSec=infinity \
  /bin/bash /run/kamiwaza-offline-extension-gate.sh

sudo journalctl -fu \
  "kamiwaza-offline-extension-gate-attempt${GATE_ATTEMPT}.service"
sudo systemctl show \
  "kamiwaza-offline-extension-gate-attempt${GATE_ATTEMPT}.service" \
  -p ActiveState -p SubState -p Result -p ExecMainStatus
```

Require `Result=success` and `ExecMainStatus=0`. Also run any Konnectivity or
authenticated resource gate named by the selected release contract. These
scripts are release inputs: record their source commit and SHA-256 rather than
downloading `develop` at install time. The temporary child-argv limitation
described in the extension-load phase also applies to this helper.

SDK tests, UAT data seeding, DNS publication, and A/B promotion are separate
demo or publication phases. They are not required to call the base platform or
extension bundle installed.

## Reruns, recovery, and diagnostics

- Download and part assembly are safely repeatable after removing only a failed
  `.assembling` file. Verify final-target SHA-256 again after every transfer.
- `rpm --replacepkgs` is intentional. A core installer rerun is **not** a
  generic reset: inspect the existing unit, Ansible recap, cluster, registry,
  and surviving child processes first.
- Use monotonically named attempt units. Never overwrite the evidence from a
  failed attempt before its cause is understood.
- Reuse a verified pre-extracted extension root. Do not select among stale
  directories with an unordered search.
- Never delete clusters, PVCs, registry volumes, or an instance as a default
  retry. Destructive recovery requires a separate backup and rollback decision.
- Do not treat repeated red `HEAD`/manifest-not-found lines from a local
  registry as fatal by color alone. Determine whether the importer is probing
  before upload, then use the unit result and final manifest/digest gates.

Useful focused diagnostics:

```bash
sudo systemctl show <unit>.service \
  -p ActiveState -p SubState -p Result -p ExecMainStatus
sudo journalctl -u <unit>.service -o cat
sudo kubectl get nodes -o wide
sudo kubectl get pods -A -o wide
sudo kubectl get events -A --sort-by=.lastTimestamp
sudo helm list -A
sudo podman ps -a
df -hT / /tmp /var/lib
```

Keep secrets and full process argument lists out of diagnostic captures. If a
password appears in output, treat it as exposed and rotate it through a
supported path after the installation is stable.

## Next steps

- [Quickstart](../quickstart.md) — verify the user-facing platform.
- [Uninstalling Kamiwaza](uninstall.md).
