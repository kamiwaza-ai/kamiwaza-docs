---
id: core-database-upgrade-1.2
title: Core database upgrade from 1.0.0 to 1.2.0
sidebar_label: Core database upgrade from 1.0.0 to 1.2.0
---

# Core database upgrade from 1.0.0 to 1.2.0

This is the supported production procedure for upgrading an existing Kamiwaza
1.0.0 PostgreSQL database to Kamiwaza 1.2.0. It applies to online and offline
RHEL 9 installations. It is not a general-purpose PostgreSQL migration guide.

The supported path is the packaged production installer. Do not run a raw
`helm upgrade`, edit the database schema manually, delete the `core-db-init`
Job, or rerun a failed installer until Kamiwaza Support has reviewed the first
failure bundle.

## Responsibility and stop rules

| Step | Owner | Continue only when |
| --- | --- | --- |
| Maintenance approval and customer communication | Customer operator | The outage window and recovery contact are confirmed. |
| Backup and validation | Customer operator | The dump is nonempty, checksummed, and `pg_restore --list` succeeds. |
| Installer and evidence capture | Customer operator | The installer exits zero and `core-db-init` succeeds. |
| Failed-upgrade diagnosis | Kamiwaza Support | Support identifies the failed attempt and approves a retry or recovery action. |
| Restore/cutover decision | Kamiwaza Support and customer change owner | A support-reviewed recovery plan is approved. |
| [Release qualification (M1-20)](#run-m1-20-release-qualification) | Kamiwaza Engineering/Release | The exact 1.0.0-to-1.2.0 run passes and the signed evidence is retained. |

Stop immediately if any prerequisite, backup validation, installer, schema
check, or smoke test fails. Preserve the active database and all evidence. A
failed Helm hook is a stopped upgrade, not permission to improvise.

## Prerequisites

- A supported RHEL 9 production installation running Kamiwaza 1.0.0 with the
  `core/1.0` database marker. This qualification procedure does not cover other
  source releases. A pre-1.0 database must first be upgraded to the supported
  1.0.0 source floor.
- The 1.2.0 online installer or the complete, verified 1.2.0 offline bundle.
- Cluster-admin `kubectl` and Helm access for the installed cluster.
- Enough storage outside the PostgreSQL data volume for the logical backup and
  evidence bundle.
- Free space inside the PostgreSQL data volume of at least 120% of the current
  database size for the temporary restore validation. The command below checks
  this before creating the scratch database.
- The exact domain, installation mode, and release inputs used for the site.
- The approved CA certificate that validates the production HTTPS endpoint.
- A confirmed maintenance window that covers a **Core API outage**, not merely a
  possible interruption. From the moment the 1.2.0 chart's Ray head starts until
  `core-db-init` brings the schema to head, the Core API serves no traffic at
  all. This is designed behaviour, not a fault; see
  [What normal looks like](#what-normal-looks-like-during-the-upgrade) before
  you begin.
- External writers quiesced for the backup and upgrade window.
- The site's existing domain, runtime, storage, GPU, and installer options
  recorded and preserved for the 1.2.0 invocation.
- A Kamiwaza Support contact who can review a failure before any retry.

Record the exact installed release/chart/core image versions, cluster context,
namespace, intended 1.2.0 artifact, and candidate SHA. The CI and signed M1
evidence URLs are release-engineering inputs, not values a customer operator
must create. If the database is below the 1.0.0 source floor, stop and request
the required intermediate upgrade procedure.

## What normal looks like during the upgrade

Read this section before starting. A gated workload and a broken one look
alike from the outside, and the single most likely way to turn a healthy
upgrade into a failed one is to react to the gate as though it were a fault.

### The Core API stops serving, on purpose

The 1.2.0 chart adds a second container, `schema-readiness`, to the Ray head
pod. It runs the core image's `python -m kamiwaza.node.readiness_server` and its
readiness probe asks one question: is the core database at the schema head this
build carries?

A Kubernetes pod is Ready only when **every** container is Ready, and the
`core-api` Service selects the Ray head. So while the database is behind — the
entire window from the new head starting to `core-db-init` reaching head —
the head is not Ready, `core-api` has no endpoints, and the Core API answers
nothing. That is the gate doing its job: 1.0.0-shaped data is never served
through a 1.2.0 binary, and a paused or failed `core-db-init` cannot go
unnoticed.

The probe is declared in the chart as `GET /healthz/schema` on port 7788, with
`periodSeconds: 10` and `failureThreshold: 3`. Where the mesh rewrites app
probes, the rendered pod spec shows the equivalent
`/app-health/schema-readiness/readyz` on the sidecar's port instead — both
describe the same probe. The thresholds mean the head leaves `core-api`'s
endpoints roughly 30 seconds after the schema stops being at head, and rejoins
within one 10-second period once `core-db-init` completes.

### Expected observations

| Observation | Meaning | Action |
| --- | --- | --- |
| Ray head pod `Running` but **not Ready**, with its READY column one container short (`2/3` where the mesh sidecar is present), while `core-db-init` is pre-head | Correct. The gate is holding. | Wait. Continue to observe `core-db-init`. |
| `core-api` has no endpoints, and requests to it fail or return 503, during that same window | Correct, and it follows directly from the line above. | Wait. Do not restart anything. |
| Ray head becomes Ready and `core-api` endpoints reappear shortly after `core-db-init` succeeds | Correct. The gate has reopened. | Continue to [step 6](#6-verify-the-schema-from-the-running-core-image). |
| `core-postgres-0` is recreated during the upgrade — a young pod age where you expected an old one | Correct. The platform sync rolls the PostgreSQL pod; the data lives on its volume and is unaffected by the roll. | Continue. The volume is what preserves the data. [Step 6](#6-verify-the-schema-from-the-running-core-image) then verifies the schema, which is the condition this runbook gates on — judge the roll by that, not by pod age. |
| The core schema marker still reads `core` / `1.0` after a successful upgrade | Correct — see [step 6](#6-verify-the-schema-from-the-running-core-image). The marker records the schema **contract** the database satisfies, which 1.2.0 does not change. There is no `1.2` marker value and you will never see one. | Continue. Judge success by `state`, `supported`, `migration_required`, and the head revisions. |
| Ray head still not Ready well **after** the schema has reached head | Not expected. | Collect evidence and escalate to Support. Do not delete the pod. |
| `schema-readiness` container is in `CrashLoopBackOff` | Not expected — almost always chart/image skew. | See [image contract](#image-contract-do-not-pin-an-older-core-image) below. |

Verifying the gate's state directly:

```bash
kubectl get pods -n "${NAMESPACE}" \
  -l ray.io/cluster=core-raycluster,ray.io/node-type=head -o wide
kubectl get endpoints core-api -n "${NAMESPACE}" -o wide
kubectl logs -n "${NAMESPACE}" \
  -l ray.io/cluster=core-raycluster,ray.io/node-type=head \
  -c schema-readiness --tail=20
```

An empty `ENDPOINTS` column on `core-api` while `core-db-init` is still running
is the expected reading, not a finding.

### Image contract: do not pin an older core image

The `schema-readiness` container runs a module that exists only in 1.2.0 and
later core images. The chart and the core image normally ship together — the
chart's `appVersion` is rewritten to the core version it was built against — so
every supported upgrade path is safe.

Deliberately skewing them is not. Pinning a core image older than the chart —
for example `KAMIWAZA_IMAGE_TAG=release-1.1.0` against the 1.2.0 chart — leaves
the container with no module to run. It crash-loops, the head never becomes
Ready, and `core-api` loses every endpoint permanently. **That is a full API
outage, not a held gate**, and no amount of waiting clears it.

If you must run a core image older than the gate, disable the gate in the same
change by setting `ray.head.schemaGate.enabled: false`. That restores exactly
the pre-1.2.0 behaviour — a head that serves regardless of schema state — and
is the documented escape hatch. Do not use it to work around a head that is
correctly holding against a pre-head schema; that would serve 1.0.0 data
through a 1.2.0 binary, which is the outcome this procedure exists to prevent.

### Wait windows

`core-db-init` may legitimately use its full dependency-wait budget of
1800 seconds (`core.scheduler.waitForDeps.timeoutSeconds`). The scheduler's
`startupProbe` is sized to match at `180 × 10s = 1800s`, so a slow but healthy
migration no longer expires the scheduler's startup gate before `core-db-init`
gives up. Preserve the site's configured Helm timeout, and size any wait of
your own against 1800 seconds rather than against a shorter fresh-install
example.

## 1. Create the evidence workspace

Run these commands from a private operator directory. Do not store the bundle
in a Git repository.

```bash
if [[ -n "${KAMIWAZA_M1_RUN_ID:-}" ]]; then
  # Release qualification: the M1 harness owns the validator identity.
  export RUN_ID="${KAMIWAZA_M1_RUN_ID}"
else
  # Customer/operator run: use a unique local support-bundle label.
  export RUN_ID="core-db-1.0.0-to-1.2.0-$(date -u +%Y%m%dT%H%M%SZ)"
fi
export LOCAL_RUN_LABEL="${RUN_ID}"
export EVIDENCE_DIR="${PWD}/${LOCAL_RUN_LABEL}"
export COLLECTOR_DIR="${PWD}/${LOCAL_RUN_LABEL}-collector"
export PRIVATE_DIR="${PWD}/${LOCAL_RUN_LABEL}-private"
export NAMESPACE="kamiwaza"
export RELEASE="kamiwaza"
: "${CANDIDATE_SHA:?export the full verified 1.2.0 candidate SHA}"
: "${DOMAIN:?export the existing production domain}"
: "${ADMIN_PASSWORD:?export the current production admin password}"

umask 077
mkdir -p "${PRIVATE_DIR}/backup" "${PRIVATE_DIR}/installer"
mkdir -p \
  "${EVIDENCE_DIR}/backup" \
  "${EVIDENCE_DIR}/installer" \
  "${EVIDENCE_DIR}/cluster" \
  "${EVIDENCE_DIR}/db-init" \
  "${EVIDENCE_DIR}/helm" \
  "${EVIDENCE_DIR}/schema" \
  "${EVIDENCE_DIR}/smoke" \
  "${EVIDENCE_DIR}/recovery"
chmod 700 "${EVIDENCE_DIR}" "${PRIVATE_DIR}"
```

Record the maintenance ticket, operator, UTC start time, source and target,
candidate commit, and the online/offline mode in a local change record. Before
sharing evidence, write those values to `${EVIDENCE_DIR}/metadata.json` using
the applicable schema in [Customer support bundle](#customer-support-bundle)
or [M1-20 qualification bundle](#m1-20-qualification-bundle).

### Inputs you must have before you start

The procedure requires these exports, spread across steps 1, 4, 7 and the
qualification sections. Every one of them stops the run where it is first
referenced, so collect them now rather than discovering the gap mid-window.

Supplied by the release owner (a qualification run cannot derive these):

| Variable | What it is | First needed |
| --- | --- | --- |
| `KAMIWAZA_M1_RUN_ID` | The harness run this evidence belongs to | step 1 |
| `CANDIDATE_SHA` | The full 1.2.0 candidate commit the run is pinned to | step 1 |
| `MAINTENANCE_TICKET` | The change record authorizing this run | step 1 |
| `INTENDED_ARTIFACT` | The exact 1.2.0 payload installed — offline, the candidate's `release_origination.md` manifest; online, the installer checksum plus the resolved core image digest. See [what `intended_artifact` has to record](#what-intended_artifact-has-to-record). | step 4 offline; finalized after the upgrade online |
| `RUNBOOK_URL` | Commit-pinned URL of the revision you followed | metadata |
| `CI_RUN_URL` | The M1-20 CI run URL | metadata |
| `M1_EVIDENCE_URL` | Where the signed qualification evidence is published | metadata |

Properties of the installation under test, held by whoever operates it:

| Variable | What it is | First needed |
| --- | --- | --- |
| `DOMAIN` | The existing domain of the 1.0.0 installation | step 1 |
| `ADMIN_PASSWORD` | Its current admin password | step 1 |
| `KEYGEN_LICENSE_KEY` | The license this installation runs under, from the approved license source. The installer validates it at startup, so a missing or wrong value fails **after** the backup has been taken. | step 4 |
| `KAMIWAZA_CA_CERT` | Path to the CA certificate validating that domain | step 7 |
| `INSTALLATION_MODE` | `online` or `offline`, matching the path you take in step 4 | metadata |

`KAMIWAZA_M1_RUN_ID` and `CANDIDATE_SHA` are checked against the harness ledger
and a mismatch is rejected outright, so neither can be invented locally. The
candidate must be a commit that contains the approver's enrolled signing key —
see [Record the external sign-off](#record-the-external-sign-off).

### Capture the metadata now, not at the end

`metadata.json` is the one bundle file with no natural home in the procedure,
and the easiest to get wrong: every field is required, and `run_id` and
`candidate_sha` are matched against the harness. Capture what is knowable at
this point, so the values describe the cluster **before** the upgrade rather
than being reconstructed afterwards:

```bash
: "${MAINTENANCE_TICKET:?export the change record authorizing this run}"
export OPERATOR="${OPERATOR:-$(id -un)}"
export STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Chart version of the installed release, e.g. kamiwaza-1.0.0
INSTALLED_CHART_VERSION=$(helm list -n "${NAMESPACE}" -o json \
  | jq -r --arg r "${RELEASE}" '.[] | select(.name == $r) | .chart')

# Prefer the immutable digest over the mutable tag: imageID carries name@sha256:...
INSTALLED_CORE_IMAGE=$(kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-scheduler \
  -o jsonpath='{.items[0].status.containerStatuses[?(@.name=="core")].imageID}')
# Fall back to the deployment's tag only if the pod has not reported an imageID.
if [[ -z "${INSTALLED_CORE_IMAGE}" ]]; then
  INSTALLED_CORE_IMAGE=$(kubectl get deployment/core-scheduler -n "${NAMESPACE}" \
    -o jsonpath='{.spec.template.spec.containers[?(@.name=="core")].image}')
fi

test -n "${INSTALLED_CHART_VERSION}"
test -n "${INSTALLED_CORE_IMAGE}"
printf 'chart=%s\nimage=%s\n' \
  "${INSTALLED_CHART_VERSION}" "${INSTALLED_CORE_IMAGE}"

export INSTALLED_CHART_VERSION INSTALLED_CORE_IMAGE
```

Both `test` lines are deliberate: an empty value here becomes a bundle that is
refused hours later, at the point where re-running is most expensive.

Write the file once the upgrade completes and `FINISHED_AT` is known — the
schema in [M1-20 qualification bundle](#m1-20-qualification-bundle) lists every
field, and the generator below fills them from the variables exported here.

## 2. Verify the 1.0.0 baseline

Confirm the cluster is reachable and healthy enough to back up. Record the
running core image and the existing schema marker. Do not print or collect
Secrets.

```bash
kubectl get nodes -o wide
kubectl get pods -n "${NAMESPACE}" -o wide
kubectl get deployment/core-scheduler -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="core")].image}{"\n"}'

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -AtF $'\t' \
  -c 'SELECT schema_name, version FROM kamiwaza_schema_version ORDER BY schema_name;' \
  >"${PRIVATE_DIR}/marker-before.tsv"
```

The release and maintenance records must establish that this is a 1.0.0
installation. If the marker query fails or its contents are unexpected, stop.
The pre-upgrade file is diagnostic only and is not part of the final allowlist;
retain it alongside the private change record.

## 3. Back up and validate the database

Create a PostgreSQL custom-format logical dump. The redirect runs on the
operator host, so the backup remains outside the database pod and volume.

```bash
export BACKUP_FILE="${PRIVATE_DIR}/backup/kamiwaza-1.0.0.dump"

(
  set +e
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    pg_dump -U core -d kamiwaza --format=custom --no-owner --no-privileges \
    >"${BACKUP_FILE}"
  printf '%s\n' "$?" >"${PRIVATE_DIR}/backup/pg-dump-exit-status.txt"
  exit 0
)

test "$(cat "${PRIVATE_DIR}/backup/pg-dump-exit-status.txt")" -eq 0
test -s "${BACKUP_FILE}"
sha256sum "${BACKUP_FILE}" >"${BACKUP_FILE}.sha256"
BACKUP_SIZE_BYTES=$(stat -c '%s' "${BACKUP_FILE}")
BACKUP_SHA256=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
kubectl exec -i -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  pg_restore --list <"${BACKUP_FILE}" >/dev/null
POSTGRESQL_VERSION=$(kubectl exec -n "${NAMESPACE}" \
  core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -Atqc 'SHOW server_version;')
BACKUP_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf 'size_bytes=%s\nsha256=%s\npostgresql_version=%s\nbackup_timestamp=%s\n' \
  "${BACKUP_SIZE_BYTES}" "${BACKUP_SHA256}" \
  "${POSTGRESQL_VERSION}" "${BACKUP_TIMESTAMP}"

# Prove the archive's data is restorable, not merely that its TOC is readable.
DATABASE_SIZE_BYTES=$(kubectl exec -n "${NAMESPACE}" \
  core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -Atqc \
  "SELECT pg_database_size('kamiwaza');")
POSTGRES_DATA_DIR=$(kubectl exec -n "${NAMESPACE}" \
  core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -Atqc 'SHOW data_directory;')
POSTGRES_FREE_BYTES=$(kubectl exec -n "${NAMESPACE}" \
  core-postgres-0 -c postgres -- \
  df -PB1 "${POSTGRES_DATA_DIR}" | awk 'NR == 2 {print $4}')
RESTORE_REQUIRED_BYTES=$((DATABASE_SIZE_BYTES + DATABASE_SIZE_BYTES / 5))
test "${POSTGRES_FREE_BYTES}" -ge "${RESTORE_REQUIRED_BYTES}"

export BACKUP_CHECK_DB="kamiwaza_backup_check_$(date -u +%Y%m%dT%H%M%S)"
(
  set +e
  (
    cleanup_backup_check() {
      kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
        dropdb -U core --if-exists "${BACKUP_CHECK_DB}" \
        >/dev/null 2>&1 || true
    }
    trap cleanup_backup_check EXIT

    kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
      createdb -U core "${BACKUP_CHECK_DB}" || exit 1
    kubectl exec -i -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
      pg_restore -U core --exit-on-error --no-owner --no-privileges \
      -d "${BACKUP_CHECK_DB}" <"${BACKUP_FILE}" || exit 1
    kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
      psql -U core -d "${BACKUP_CHECK_DB}" -Atqc \
      "SELECT version FROM kamiwaza_schema_version WHERE schema_name = 'core';" \
      >"${PRIVATE_DIR}/backup/restore-marker.tsv" || exit 1
  )
  printf '%s\n' "$?" >"${PRIVATE_DIR}/backup/pg-restore-exit-status.txt"
  exit 0
)
test "$(cat "${PRIVATE_DIR}/backup/pg-restore-exit-status.txt")" -eq 0
test "$(cat "${PRIVATE_DIR}/backup/restore-marker.tsv")" = "1.0"
```

Create `backup/manifest.json` with these exact field names and types (replace
the example values with the observed values):

```json
{
  "filename": "kamiwaza-1.0.0.dump",
  "size_bytes": 123456,
  "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "pg_restore_list_valid": true,
  "postgresql_version": "observed-server-version",
  "backup_timestamp": "RFC3339 UTC timestamp"
}
```

Do not continue unless every command above succeeds. Keep the dump itself and
its checksum private; the shareable evidence bundle contains the manifest, not
the database contents.

## 4. Run the supported installer once

Use the same supported production path as a clean installation. Preserve the
exact invocation and exit status. The examples below omit real credentials;
provide them using your approved secret-handling process and do not add them to
the evidence bundle.

### Online upgrade

Obtain `kamiwaza-online-install.sh` and its `.sha256` file from the approved
1.2.0 release-candidate artifact location. Do not reuse an installer URL or
script retained from an earlier release. Verify the candidate before running
it, and retain the checksum — on this path `intended_artifact` is finalized
after the upgrade from this value plus the resolved image digest, per
[What `intended_artifact` has to record](#what-intended_artifact-has-to-record):

```bash
sha256sum -c kamiwaza-online-install.sh.sha256
chmod +x kamiwaza-online-install.sh

INSTALLER_SHA256=$(sha256sum kamiwaza-online-install.sh | awk '{print $1}')
```

Then run the verified candidate once. `--keep-extract` retains the exact
candidate's deploy payload so its diagnostics collector remains available at
the documented path. The subshell preserves the caller's existing `errexit`
setting while still capturing a failed installer:

```bash
: "${KEYGEN_LICENSE_KEY:?export KEYGEN_LICENSE_KEY from the approved license source}"

(
  set +e
  KEYGEN_LICENSE_KEY="${KEYGEN_LICENSE_KEY}" \
    ./kamiwaza-online-install.sh \
    --domain "${DOMAIN}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --keep-extract \
    -y 2>&1 | tee "${PRIVATE_DIR}/installer/console.log"
  install_rc=${PIPESTATUS[0]}
  printf '%s\n' "${install_rc}" \
    >"${EVIDENCE_DIR}/installer/exit-status.txt"
  exit 0
)
INSTALL_RC=$(cat "${EVIDENCE_DIR}/installer/exit-status.txt")
export COLLECTOR_COMMAND="/var/lib/kamiwaza-online-install/kamiwaza-online-payload/scripts/collect-core-db-init-diagnostics.sh"
test -x "${COLLECTOR_COMMAND}"
```

That path is derived from the generated online installer's Linux
`DEFAULT_EXTRACT_DIR` and `PAYLOAD_ROOT_NAME` constants in
`kajiya/infra/online-ubuntu/kamiwaza-online-install.sh`; `--keep-extract`
prevents cleanup of the candidate payload. The payload build stages the deploy
tree's whole `scripts/` directory, so the collector arrives with its executable
bit intact.

The `test -x` above is the check that matters — run it before you need the
collector, not after an upgrade has already failed. If it fails, the payload
was cleaned up (`--keep-extract` missing) or the candidate predates the
collector. Locate the payload root before continuing, and do not proceed to the
installer without a working collector:

```bash
find /var/lib/kamiwaza-online-install -maxdepth 3 -name kamiwaza-online-payload -type d
```

### Offline upgrade

Stage and verify the complete 1.2.0 offline candidate in a new, version-scoped
directory; never reuse `/opt/kamiwaza/prereqs` from the installed release. Use
its own `release_origination.md` as the authority for the RPM, chart, and image tags;
do not copy the 1.0.1 values from the current installation example. Record
that manifest as `intended_artifact`, confirm it identifies product version
1.2.0, and export its release-specific image values. Before invoking the
installer, upgrade the installed production payload to the verified 1.2.0 RPM
from that same candidate so `/opt/kamiwaza/scripts/install-prod.sh` and the
packaged diagnostics are the 1.2.0 versions. Download and recombine the exact
files named by the candidate's release record into `PREREQ_DIR`, then verify
the candidate-specific checksums and required files before installing anything:

```bash
export PREREQ_DIR="${PWD}/kamiwaza-prereqs-1.2.0-${CANDIDATE_SHA}"
mkdir "${PREREQ_DIR}"

# Populate this new directory from the candidate's artifact location only.
# Use the exact RPM and recombined Helm-bundle names in release_origination.md.
export KAMIWAZA_PROD_RPM="${PREREQ_DIR}/<exact-1.2.0-kamiwaza-prod-rpm>"
export HELM_BUNDLE="${PREREQ_DIR}/<exact-recombined-kamiwaza-helm-tar>"
export HELM_SHA256="${PREREQ_DIR}/kamiwaza-helm.sha256"
export HELM_SIGNATURE="${PREREQ_DIR}/kamiwaza-helm.asc"
export HELM_PUBKEY="${PREREQ_DIR}/kamiwaza-tools-rpm.pub.gpg"

test -s "${PREREQ_DIR}/release_origination.md"
test -s "${KAMIWAZA_PROD_RPM}"
test -s "${HELM_BUNDLE}"
test -s "${HELM_SHA256}"
test -s "${HELM_SIGNATURE}"
test -s "${HELM_PUBKEY}"
(cd "${PREREQ_DIR}" && sha256sum -c "$(basename "${HELM_SHA256}")")

sudo rpm -Uvh "${KAMIWAZA_PROD_RPM}"
rpm -q --queryformat '%{NAME} %{VERSION}-%{RELEASE}\n' kamiwaza-prod
export COLLECTOR_COMMAND="/opt/kamiwaza/scripts/collect-core-db-init-diagnostics.sh"
test -x "${COLLECTOR_COMMAND}"
```

The `kamiwaza-prod` RPM installs the deploy tree's `scripts/` directory under
`/opt/kamiwaza`, so the collector is present once the 1.2.0 RPM is installed —
which is why the RPM upgrade above precedes this check. If `test -x` fails, the
installed RPM predates the collector; upgrade to the verified 1.2.0 candidate
package before continuing.

Confirm the reported package version is the intended 1.2.0 candidate. Export
the exact values from that candidate's `release_origination.md`; do not infer
or reuse tags from the currently installed release:

```bash
export APP_TAG="<1.2.0-candidate-app-tag>"
export FRONTEND_TAG="<1.2.0-candidate-frontend-tag>"
export CONTAINERS_TAG="<1.2.0-candidate-containers-tag>"
export KAMIWAZA_VERSION="${APP_TAG}"
export KAMIWAZA_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_APP_IMAGE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CORE_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_FRONTEND_TAG="${FRONTEND_TAG}"
export KAMIWAZA_OFFLINE_INIT_KEYCLOAK_USERS_TAG="${APP_TAG}"
export KAMIWAZA_OFFLINE_CONTAINERS_IMAGE_TAG="${CONTAINERS_TAG}"
export KAMIWAZA_OFFLINE_CHAINGUARD_BASE_TAG="${CONTAINERS_TAG}"
export KAMIWAZA_IMAGE_OVERRIDES="<exact comma-separated overrides from release_origination.md>"
```

Preserve the site's existing `KAMIWAZA_K8S_RUNTIME`, resource profile,
storage, GPU, and Helm override inputs. Preserve the site's configured Helm
timeout, and size it against `core-db-init`'s full 1800-second dependency-wait
budget (see [Wait windows](#wait-windows)); do not copy the fresh-install
guide's shorter example timeout into a populated-database migration. Then run
the upgraded installer once:

```bash
(
  set +e
  sudo -E /opt/kamiwaza/scripts/install-prod.sh \
    --offline \
    --domain "${DOMAIN}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --wrap-bundle "${HELM_BUNDLE}" \
    --wrap-sha256 "${HELM_SHA256}" \
    --wrap-signature "${HELM_SIGNATURE}" \
    --wrap-pubkey "${HELM_PUBKEY}" \
    -y 2>&1 | tee "${PRIVATE_DIR}/installer/console.log"
  install_rc=${PIPESTATUS[0]}
  printf '%s\n' "${install_rc}" \
    >"${EVIDENCE_DIR}/installer/exit-status.txt"
  exit 0
)
INSTALL_RC=$(cat "${EVIDENCE_DIR}/installer/exit-status.txt")
```

For an online upgrade, review both the captured
`${PRIVATE_DIR}/installer/console.log` and the installer's Linux default log,
`/var/log/kamiwaza_install_online.log` (or the path selected with
`KAMIWAZA_ONLINE_INSTALL_LOG`). For an offline upgrade, review the captured
console and `/var/log/kamiwaza_install_prod.log`. Redact credentials and copy
the diagnostic content needed for Support to the validator-compatible evidence
name `installer/postinst-debug.log`. Keep every raw source log private.

Whether the installer succeeds or fails, continue immediately with
[Collect upgrade diagnostics](#collect-upgrade-diagnostics). If `INSTALL_RC`
is nonzero, collect the evidence and then stop; do not rerun the installer.

## 5. Observe `core-db-init`

The production installer invokes the Helmfile-managed release. Its
`core-db-init` post-install/post-upgrade hook is the only supported schema
entrypoint. The Job runs the 1.2.0 core image's
`/app/services/core/scripts/db-init.py`. Because this is a post-upgrade hook,
do not infer scheduler rollout ordering from the hook weight; use the Job,
schema-status, and readiness checks below as the authoritative gates.

```bash
kubectl get job/core-db-init -n "${NAMESPACE}" -o wide
kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-db-init \
  --sort-by=.metadata.creationTimestamp -o wide
```

While this Job is running, the Ray head is expected to be `Running` but **not
Ready** and `core-api` is expected to have no endpoints. That is the
schema-readiness gate holding, not a fault — see
[What normal looks like](#what-normal-looks-like-during-the-upgrade). Do not
restart the head, delete its pod, or roll back the release in response to it.
The head rejoins `core-api` on its own within about ten seconds of the schema
reaching head.

Do not delete the Job or pods. The completed Job and its pods are retained for
`core.scheduler.dbInit.ttlSecondsAfterFinished` (3600 seconds by default) and
are removed before the next hook creation, so collect evidence promptly.

### Collect upgrade diagnostics

Run the 1.2.0 production payload's deterministic collector on both success and
failure paths. Support diagnosis and M1 qualification both require its cluster,
db-init, and Helm outputs even when the upgrade succeeds:

```bash
COLLECTOR_RC=0
COLLECTOR_COMMAND_FAILURES=0
COLLECTOR_EVIDENCE_COMPLETE=0

"${COLLECTOR_COMMAND}" \
  "${COLLECTOR_DIR}" "${NAMESPACE}" "${RELEASE}" || COLLECTOR_RC=$?

if [[ "${COLLECTOR_RC}" -ne 0 ]]; then
  printf 'stop: diagnostics collector failed before evidence merge (exit %s)\n' \
    "${COLLECTOR_RC}" >&2
else
  # The collector deliberately requires a new or empty, non-symlink target.
  # Merge evidence before classifying failures observed in the cluster.
  cp -a "${COLLECTOR_DIR}/cluster/." "${EVIDENCE_DIR}/cluster/"
  cp -a "${COLLECTOR_DIR}/db-init/." "${EVIDENCE_DIR}/db-init/"
  cp -a "${COLLECTOR_DIR}/helm/." "${EVIDENCE_DIR}/helm/"

  awk '
    BEGIN { failed = 0 }
    /^command=/ && $0 !~ / status=0$/ { print; failed = 1 }
    END { exit failed }
  ' "${COLLECTOR_DIR}/manifest.txt" || COLLECTOR_COMMAND_FAILURES=1

  if test -s "${EVIDENCE_DIR}/db-init/pod-describe.txt" && \
    test -s "${EVIDENCE_DIR}/db-init/all-attempts.log"; then
    COLLECTOR_EVIDENCE_COMPLETE=1
  else
    printf '%s\n' \
      "stop: required db-init pod evidence is empty; preserve the partial bundle for Support" >&2
  fi
fi

printf 'collector_rc=%s\ncommand_failures=%s\nevidence_complete=%s\n' \
  "${COLLECTOR_RC}" "${COLLECTOR_COMMAND_FAILURES}" \
  "${COLLECTOR_EVIDENCE_COMPLETE}"
test "${COLLECTOR_RC}" -eq 0
test "${COLLECTOR_COMMAND_FAILURES}" -eq 0
test "${COLLECTOR_EVIDENCE_COMPLETE}" -eq 1
```

It records the Job, all attempt pods in creation order, all attempt logs,
namespace state and events, and Helm status/history. For a pod that never
started, the pod description and events are authoritative; an empty container
log alone is not evidence that migration code ran.

`COLLECTOR_RC` nonzero means the collector itself failed. A
`COLLECTOR_COMMAND_FAILURES` value of 1 means collection succeeded but observed
one or more failing cluster commands; preserve the merged evidence and stop for
Support review. `COLLECTOR_EVIDENCE_COMPLETE` must be 1 for M1 qualification.

```bash
if [[ "${INSTALL_RC}" -ne 0 ]]; then
  printf 'stop: installer failed with exit %s; do not continue to schema checks\n' \
    "${INSTALL_RC}" >&2
fi
test "${INSTALL_RC}" -eq 0
```

If Support approves a retry, start again with a new `RUN_ID`, `EVIDENCE_DIR`,
and `COLLECTOR_DIR`. Never reuse or overwrite the first attempt's evidence.

## 6. Verify the schema from the running core image

After an installer exit of zero, invoke the packaged schema-status CLI from the
running 1.2.0 core container. Its exit code distinguishes supported states from
unsafe or undetermined states; a supported state can still require migration.
Always inspect the JSON fields below rather than gating on exit zero alone.

```bash
(
  set +e
  kubectl exec -n "${NAMESPACE}" deployment/core-scheduler -c core -- \
    python /app/scripts/schema-status.py --json \
    >"${EVIDENCE_DIR}/schema/status.json"
  printf '%s\n' "$?" >"${PRIVATE_DIR}/schema-status-exit-status.txt"
  exit 0
)

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -AtF $'\t' \
  -c "SELECT schema_name, version FROM kamiwaza_schema_version WHERE schema_name = 'core';" \
  >"${EVIDENCE_DIR}/schema/marker.tsv"

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -AtF $'\t' \
  -c 'SELECT version_num FROM alembic_version ORDER BY version_num;' \
  >"${EVIDENCE_DIR}/schema/revision.tsv"

test -s "${EVIDENCE_DIR}/schema/status.json"
test -s "${EVIDENCE_DIR}/schema/marker.tsv"
test -s "${EVIDENCE_DIR}/schema/revision.tsv"
```

Required result:

- `state` is `at_head`;
- `supported` is `true`;
- `migration_required` is `false`;
- `marker_version` is `1.0` and `marker.tsv` contains exactly `core<TAB>1.0`.
  **This is correct after a successful 1.2.0 upgrade and is the single most
  misread line in this procedure.** The marker names the schema contract the
  database satisfies, not the product release you installed. 1.2.0 does not
  advance it, no `1.2` marker value exists, and a marker reading `1.0` is
  therefore evidence of success rather than of an incomplete upgrade. Judge the
  upgrade by `state`, `supported`, `migration_required`, and the head revisions
  below;
- `db_heads` contains exactly one revision;
- `code_heads` contains exactly one revision and equals `db_heads`.

The captured schema-status exit code may be nonzero on the failure path; the
three evidence files are still required. Any result outside the fields above is
a stopped upgrade. Do not stamp a revision or edit the marker manually.

## 7. Run smoke checks

Verify the actual production domain with the approved CA certificate and record
machine-readable results in `smoke/results.json`. M1 qualification must never
replace this trust check with `--insecure`.

**Order matters.** These checks reach the Core API through the Ray head, which
is withdrawn from `core-api` while the schema is behind. Run them only after
[step 6](#6-verify-the-schema-from-the-running-core-image) reports `at_head`
and the head is Ready. Run earlier, they fail for a reason that has nothing to
do with the platform's health, and a failure recorded then is not evidence of
anything. Confirm the gate has reopened first:

```bash
kubectl get pods -n "${NAMESPACE}" \
  -l ray.io/cluster=core-raycluster,ray.io/node-type=head -o wide
kubectl get endpoints core-api -n "${NAMESPACE}" -o wide
```

Both the head's READY column showing every container ready and a nonempty
`core-api` endpoints list are preconditions for the checks below.

```bash
: "${KAMIWAZA_CA_CERT:?export the approved production CA certificate path}"
kubectl get pods -n "${NAMESPACE}" -o wide
curl --fail --silent --show-error --cacert "${KAMIWAZA_CA_CERT}" \
  "https://${DOMAIN}/api/node/node_status" >/dev/null
curl --fail --silent --show-error --cacert "${KAMIWAZA_CA_CERT}" \
  "https://${DOMAIN}/api/security/public/config" >/dev/null
```

The M1-20 release qualification also exercises authenticated login, a core API
read, and an extension/API smoke appropriate to the release. Record every
required check using the evidence convention below. The bundle validator
enforces a nonempty list with every `status` set to `"pass"`; the M1 harness is
responsible for producing all five named checks:

```json
{
  "checks": [
    {"name": "node-status", "status": "pass"},
    {"name": "public-security-config", "status": "pass"},
    {"name": "authenticated-login", "status": "pass"},
    {"name": "authenticated-core-api-read", "status": "pass"},
    {"name": "extension-api-smoke", "status": "pass"}
  ]
}
```

## Failure states and next action

| Observed state | Meaning | Required action |
| --- | --- | --- |
| Backup is empty, checksum cannot be produced, or either restore validation fails | There is no validated recovery artifact. | Stop before upgrade; correct backup storage or access and create a new validated backup. |
| Installer exits nonzero before `core-db-init` exists | Host, artifact, registry, or Helm preparation failed before schema execution. | Preserve installer logs and cluster/Helm state; contact Support before retrying. |
| `core-db-init` pod is Pending, `ImagePullBackOff`, or `CreateContainerConfigError` | Migration code did not start. | Collect pod descriptions and events; fix only the Support-approved infrastructure cause, then obtain retry approval. |
| `core-db-init` starts and exits nonzero | Migration or database validation failed. | Collect every attempt log and description. Do not delete the Job, stamp the DB, or rerun. Escalate to Support. |
| Ray head is `Running` but not Ready, and `core-api` has no endpoints, **while `core-db-init` is still pre-head** | Not a failure. The schema-readiness gate is holding the API off a pre-head database, as designed. | Wait for `core-db-init`. Do not restart the head, delete its pod, or roll back — a retry here is the wrong action and can only lose evidence. |
| Ray head is still not Ready **after** schema status reports `at_head` | The gate should have reopened and did not. | Collect the head pod description, its `schema-readiness` container logs, and `core-api` endpoints; escalate to Support. Do not delete the pod. |
| `schema-readiness` container is in `CrashLoopBackOff` | Chart and core image are skewed: the pinned core image predates the module this container runs. | Full API outage until corrected. Deploy a core image matching the chart, or set `ray.head.schemaGate.enabled: false` if the older image is intentional. See [image contract](#image-contract-do-not-pin-an-older-core-image). |
| Installer exits zero but schema status is not `at_head` and supported | The release gate and the database disagree. | Treat the upgrade as failed; preserve the database and evidence and contact Support. |
| Schema is healthy but a required smoke test fails | Schema migration completed, but the platform is not operational. | Preserve evidence. Support determines whether the issue is configuration, service recovery, or rollback/cutover. |
| Evidence contains a credential, token, private key, or Kubernetes Secret | The bundle is unsafe to share. | Quarantine it, rotate exposed credentials as required, redact by omission, and regenerate the bundle. |

The schema classifier adds these state-specific rules:

| Schema state | Safe action |
| --- | --- |
| `fresh`, `unstamped`, `v1_marker_only`, or `behind` | Migratable only through `core-db-init`. Preserve evidence before a Support-approved retry. |
| `at_head` | Continue with workload readiness and application verification. |
| `ahead` or `unknown_marker` | Never start the older binary. Deploy the build that owns the state or use the support-reviewed backup recovery path. |
| `below_floor` | Stop and first reach the supported 1.0.0 source floor. |
| `partial` or `multiple_heads` | Stop, collect marker/revision/status/hook evidence, and escalate for a reviewed restore or forward fix. |
| `unreadable` | Check database readiness and connectivity, then retry diagnosis only. This is not a schema verdict. |
| `no_migration_chain` or `unusable_artifact` | Replace or repair the build. Repeated database mutation cannot repair a broken binary. |
| `unsupported_dialect` | Stop. This runbook supports PostgreSQL only. |
| `lite` | Not applicable to this PostgreSQL-only procedure. Stop and use the separate Lite/SQLite lifecycle. |

`KAMIWAZA_SCHEMA_LOCK_TIMEOUT` defaults to 30 seconds and bounds PostgreSQL
table-lock acquisition by the migration DDL; it does not bound acquisition of
the session advisory lock and does not bound total migration duration. A
reported table-lock timeout is retryable only after the table-lock blocker is
identified and removed. A migration that appears stuck before DDL may instead
be waiting on the advisory lock and requires Support to inspect `pg_locks`.
Preserve the failed attempt before any Support-approved retry.

## Recovery boundary

Kamiwaza 1.2.0 does not promise general downgrade migrations. A Helm rollback
alone does not roll the database schema backward and is not a safe rollback
after the canonical revision advances.

Do not restore a logical dump over the active database. Do not point an old
binary at a database after the 1.2.0 migration unless the exact compatibility
has passed release qualification and Support explicitly approves it.

Customer operators stop here and preserve the verified backup. Any restore,
old-binary compatibility test, or production cutover requires a Support-owned
recovery plan; it is not a routine continuation of a failed upgrade. Skip the
Engineering-only rehearsal below and prepare the
[Customer support bundle](#customer-support-bundle).

For release qualification only, Engineering runs the following diagnostic
rehearsal in the disposable M1 environment. It restores the dump into a newly
created database while the active `kamiwaza` database remains untouched:

```bash
export RESTORE_DB="kamiwaza_restore_${RUN_ID//[^A-Za-z0-9]/_}"

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  createdb -U core "${RESTORE_DB}"
kubectl exec -i -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  pg_restore -U core --no-owner --no-privileges -d "${RESTORE_DB}" \
  <"${BACKUP_FILE}"
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d "${RESTORE_DB}" -Atqc \
  'SELECT schema_name, version FROM kamiwaza_schema_version ORDER BY schema_name;'
```

This M1-only rehearsal proves dump restorability; it does not switch production.
Supported recovery is either a support-reviewed cutover to a clean database
restored from the verified pre-upgrade backup and run with a compatible old
binary, or a reviewed and tested forward fix with its own evidence. Preserve
the failed database and evidence first. Never drop the active database, delete
its PVC, edit marker rows, stamp revisions, or apply ad hoc DDL as a first
response. In `recovery/restore-rehearsal.json`, record the restored database
name, old-binary compatibility result, and confirmation that the active
database was untouched.

Old-binary compatibility is not inferred from schema queries. Engineering
starts the exact immutable 1.0.0 core image with its database URL
pointing only at `${RESTORE_DB}`, waits for its readiness check, and runs its
authenticated core API smoke. Stop that disposable workload after the check;
never repoint a production 1.0.0 workload. Set `old_binary_compatible` to true
only when both readiness and the authenticated smoke pass. Record the result
using these exact fields:

```json
{
  "restored_database": "kamiwaza_restore_20260807T001500Z_a1b2c3d4",
  "active_database_untouched": true,
  "old_binary_compatible": true
}
```

## Customer support bundle

The customer/operator bundle may contain only the following paths. Include the
nonempty files produced by the applicable steps; on a failed upgrade, tell
Support which later files could not be produced rather than inventing them.
The dump, checksum file, raw installer logs, environment dumps, Kubernetes
Secrets, and ConfigMaps remain private.

<!-- Contract: keep this list synchronized with the customer subset of
kamiwaza/scripts/db_migration_m1/runbook_bundle.py EVIDENCE_FILES. -->

```text
metadata.json
backup/manifest.json
installer/exit-status.txt
installer/postinst-debug.log
cluster/state.txt
cluster/events.txt
db-init/attempts.json
db-init/job-describe.txt
db-init/pod-describe.txt
db-init/all-attempts.log
helm/status.txt
helm/history.txt
schema/status.json
schema/marker.tsv
schema/revision.tsv
smoke/results.json
```

Write `${EVIDENCE_DIR}/metadata.json` with these fields for Support:

```json
{
  "schema_version": 1,
  "run_id": "core-db-1.0.0-to-1.2.0-20260807T001500Z",
  "candidate_sha": "full-git-commit-sha",
  "source_product_version": "1.0.0",
  "target_product_version": "1.2.0",
  "installation_mode": "online-or-offline",
  "operator": "named-operator",
  "maintenance_ticket": "customer-change-id",
  "cluster_context": "exact-kube-context",
  "namespace": "kamiwaza",
  "installed_release_version": "1.0.0",
  "installed_chart_version": "exact-installed-chart-version",
  "installed_core_image": "immutable-image-reference-or-digest",
  "intended_artifact": "exact-1.2.0-artifact-name-or-digest",
  "started_at": "RFC3339 UTC timestamp",
  "finished_at": "RFC3339 UTC timestamp",
  "runbook_id": "core-database-upgrade-1.2",
  "runbook_url": "published immutable or versioned URL"
}
```

Before sharing, remove paths outside the list above and scan every text file.
The following scan reports only the file path and line number, never the
matching value:

```bash
secret_locations=0
while IFS= read -r -d '' file; do
  if ! awk '
    BEGIN { IGNORECASE = 1; found = 0 }
    /:\/\/[^\/[:space:]@:]+:[^@\/[:space:]]+@/ ||
    /--admin-password([=[:space:]])[^[:space:]]+/ ||
    /(KEYGEN_LICENSE_KEY|KAMIWAZA_KEYGEN_LICENSE_KEY)[=[:space:]][^[:space:]]+/ ||
    /-----BEGIN .*PRIVATE KEY-----/ ||
    /authorization:[[:space:]]*bearer/ ||
    /kind:[[:space:]]*Secret/ {
      print FILENAME ":" FNR
      found = 1
    }
    END { exit found }
  ' "${file}"; then
    secret_locations=1
  fi
done < <(find "${EVIDENCE_DIR}" -type f -print0)
test "${secret_locations}" -eq 0
```

Also perform a manual review for site-specific credentials, tokens, customer
data, and private hostnames. Share only through the approved Support channel.
A customer bundle is diagnostic input; it is not the signed M1-20
release-qualification artifact and does not require `KAMIWAZA_M1_RUN_ID`, an
old-binary rehearsal, or M1 CI URLs.

## M1-20 qualification bundle

This section is for Kamiwaza Engineering/Release only. The M1 harness exports
`KAMIWAZA_M1_RUN_ID` in the form `YYYYMMDDTHHMMSSZ-8hex`, and Step 1 uses that
value as `RUN_ID`. The harness runs the recovery rehearsal and requires the
following exact deterministic bundle.

The qualification bundle contains exactly these nonempty files, no dump, no
raw installer console, no environment dump, and no Kubernetes Secret or
ConfigMap:

<!-- Contract: keep this exact list synchronized with
kamiwaza/scripts/db_migration_m1/runbook_bundle.py EVIDENCE_FILES. -->

```text
metadata.json
backup/manifest.json
installer/exit-status.txt
installer/postinst-debug.log
cluster/state.txt
cluster/events.txt
db-init/attempts.json
db-init/job-describe.txt
db-init/pod-describe.txt
db-init/all-attempts.log
helm/status.txt
helm/history.txt
schema/status.json
schema/marker.tsv
schema/revision.tsv
smoke/results.json
recovery/restore-rehearsal.json
```

For M1 qualification, `metadata.json` must include:

```json
{
  "schema_version": 1,
  "run_id": "20260807T001500Z-a1b2c3d4",
  "candidate_sha": "full-git-commit-sha",
  "source_product_version": "1.0.0",
  "target_product_version": "1.2.0",
  "installation_mode": "online-or-offline",
  "operator": "named-operator",
  "maintenance_ticket": "customer-change-id",
  "cluster_context": "exact-kube-context",
  "namespace": "kamiwaza",
  "installed_release_version": "1.0.0",
  "installed_chart_version": "exact-installed-chart-version",
  "installed_core_image": "immutable-image-reference-or-digest",
  "intended_artifact": "exact-1.2.0-artifact-name-or-digest",
  "started_at": "RFC3339 UTC timestamp",
  "finished_at": "RFC3339 UTC timestamp",
  "runbook_id": "core-database-upgrade-1.2",
  "runbook_url": "published immutable or versioned URL",
  "ci_run_url": "exact M1-20 CI run URL",
  "m1_evidence_url": "exact signed qualification/evidence URL"
}
```

Before publishing M1 evidence, enforce the exact file list above, then run the
same secret scan and manual review documented in
[Customer support bundle](#customer-support-bundle).

### What `intended_artifact` has to record

`intended_artifact` names the exact payload this run installed. What satisfies
it differs by installation mode, and on the online path it is **finalized after
the upgrade**, not before.

**Offline.** The staged candidate's own `release_origination.md` manifest is the
record, exactly as [Offline upgrade](#offline-upgrade) instructs. That path
pins every image to an exact, non-floating tag taken from the manifest, so the
manifest alone identifies the payload. Nothing further is required here.

**Online.** Record **both** the installer's SHA-256 **and** the core image
digest the install actually resolved. Either alone is insufficient. The
installer is immutable once built, so its checksum identifies the payload
exactly — but that payload carries no Kamiwaza code. It pulls images at install
time, and the online chart resolves the core image through a floating tag with
`pullPolicy: Always`, so the tag can move between the moment you verify the
installer checksum and the moment the image is pulled.

Capture the resolved digest after the upgrade, with the same selector used in
[Capture the metadata now](#capture-the-metadata-now-not-at-the-end) so the
result is a single assignable value rather than every container in the
namespace:

```bash
INSTALLED_CORE_DIGEST=$(kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-scheduler \
  -o jsonpath='{range .items[*]}{.status.containerStatuses[?(@.name=="core")].imageID}{"\n"}{end}' \
  | sed '/^$/d' | sort -u)

# Exactly one digest is required. Empty means no core pod reported an imageID
# yet — wait and re-run rather than recording a blank field. More than one means
# the tag moved during the install and the pods are not running the same code:
# stop, and re-run the upgrade against a pinned digest. Do not pick one of them.
test -n "${INSTALLED_CORE_DIGEST}"
test "$(printf '%s\n' "${INSTALLED_CORE_DIGEST}" | wc -l)" -eq 1

export INTENDED_ARTIFACT="installer=sha256:${INSTALLER_SHA256};core-image=${INSTALLED_CORE_DIGEST}"
```

`INSTALLER_SHA256` is the value captured when you verified the installer in
[Online upgrade](#online-upgrade). The two fields are semicolon-delimited and
each is `name=value`, so the pair stays parseable in the single
`intended_artifact` string the bundle contract allows.

Together the two are reproducible: the checksum says which installer ran, and
the digest says which code it installed. Neither question can be answered later
from the other, and the image carries no source-commit label to recover it
from.

### Generating `metadata.json`

Every field is required and the harness matches `run_id` and `candidate_sha`
against its ledger, so hand-assembly is the most common way a complete,
correct upgrade still produces a rejected bundle. Generate it from the
variables exported in [step 1](#inputs-you-must-have-before-you-start),
after the upgrade finishes:

```bash
export FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
: "${CI_RUN_URL:?export the exact M1-20 CI run URL}"
: "${M1_EVIDENCE_URL:?export the signed qualification evidence URL}"
: "${INSTALLATION_MODE:?export online or offline}"
: "${INTENDED_ARTIFACT:?export the exact 1.2.0 artifact name or digest}"
: "${RUNBOOK_URL:?export the versioned URL of the runbook you followed}"

jq -n \
  --argjson schema_version 1 \
  --arg run_id "${RUN_ID}" \
  --arg candidate_sha "${CANDIDATE_SHA}" \
  --arg source_product_version "1.0.0" \
  --arg target_product_version "1.2.0" \
  --arg installation_mode "${INSTALLATION_MODE}" \
  --arg operator "${OPERATOR}" \
  --arg maintenance_ticket "${MAINTENANCE_TICKET}" \
  --arg cluster_context "$(kubectl config current-context)" \
  --arg namespace "${NAMESPACE}" \
  --arg installed_release_version "1.0.0" \
  --arg installed_chart_version "${INSTALLED_CHART_VERSION}" \
  --arg installed_core_image "${INSTALLED_CORE_IMAGE}" \
  --arg intended_artifact "${INTENDED_ARTIFACT}" \
  --arg started_at "${STARTED_AT}" \
  --arg finished_at "${FINISHED_AT}" \
  --arg runbook_id "core-database-upgrade-1.2" \
  --arg runbook_url "${RUNBOOK_URL}" \
  --arg ci_run_url "${CI_RUN_URL}" \
  --arg m1_evidence_url "${M1_EVIDENCE_URL}" \
  '$ARGS.named' >"${EVIDENCE_DIR}/metadata.json"

# Refuse to ship a file with an empty or placeholder value in it.
jq -e --arg placeholder '^(exact|immutable|named-operator|customer-change-id|online-or-offline|full-git-commit-sha|RFC3339|published immutable)' \
  'to_entries | all(.value | tostring | (length > 0) and (test($placeholder) | not))' \
  "${EVIDENCE_DIR}/metadata.json" >/dev/null
```

`RUNBOOK_URL` must be a versioned or immutable URL — a commit-pinned link, not
a branch link. A branch URL moves after the fact, which makes the evidence
unreproducible and does not satisfy M1-20.

The second `jq` is the check worth keeping: it fails if any field is empty or
still carries one of the placeholder strings from the schema above. Those
placeholders are valid non-empty text, so the harness would otherwise accept
them and the finished record would assert a change ticket and an operator that
never existed.

If you extend the schema, extend that pattern with it — a placeholder it does
not match is one the harness will accept.

## Record the external sign-off

M1-20 completes as **Blocked** on purpose, so an independent approver can
inspect finished evidence before approving it. The case closes only when a
signed approval is imported.

The approval is an Ed25519 signature over the artifact's own fields, verified
against a public key **enrolled in the candidate commit**. Three consequences
follow, and each has refused an otherwise-valid approval:

- The approver's key must already be enrolled in the candidate the run is
  pinned to. A run pinned to a commit predating enrollment can never accept
  that approver's sign-off, no matter how the signature is produced.
- The approval must be timestamped **after** the rehearsal finished, and no
  more than five minutes ahead of the verifying clock. Signing in advance
  fails.
- `role` must be one of `business-owner`, `customer-proxy`, or
  `release-approver`. It is a signed field, so it cannot be corrected
  afterwards without re-signing.

### Produce the signed approval

The approver runs this on the machine holding their private key. The signature
covers every field except `signature` itself, serialized as canonical JSON —
sorted keys, no whitespace. Any other serialization verifies as invalid:

```bash
# Values supplied by the release owner; RUN_ID and CANDIDATE_SHA must match the run.
: "${RUN_ID:?}" ; : "${CANDIDATE_SHA:?}"
export APPROVER="Full Name"
export ROLE="release-approver"        # or business-owner / customer-proxy
export SOURCE="the record this approval is tracked in"
export PRIVATE_KEY="${HOME}/.kamiwaza-signoff.key"

python3 - <<'PY' >external-signoff.json
import base64, json, os, datetime
from cryptography.hazmat.primitives.serialization import load_pem_private_key

payload = {
    "schema_version": 1,
    "approved": True,
    "approver": os.environ["APPROVER"],
    "role": os.environ["ROLE"],
    "approved_at": datetime.datetime.now(datetime.timezone.utc)
        .strftime("%Y-%m-%dT%H:%M:%SZ"),
    "source": os.environ["SOURCE"],
    "run_id": os.environ["RUN_ID"],
    "candidate_sha": os.environ["CANDIDATE_SHA"],
}
# Canonical form: sorted keys, compact separators, signature excluded.
signed = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()

key = load_pem_private_key(
    open(os.environ["PRIVATE_KEY"], "rb").read(),
    password=(os.environ["KEY_PASSPHRASE"].encode()
              if os.environ.get("KEY_PASSPHRASE") else None),
)
payload["signature"] = base64.b64encode(key.sign(signed)).decode()
print(json.dumps(payload, indent=2))
PY
```

The private key never leaves the approver's machine; only
`external-signoff.json` is returned. If the key is passphrase-protected, set
`KEY_PASSPHRASE` for the command rather than storing it.

### Import it

Run this from the `kamiwaza` checkout the qualification run was created in:

```bash
scripts/kw_py scripts/run_db_migration_m1.py \
  resume "${RUN_ID}" --external-signoff /path/to/external-signoff.json
```

The import validates the signature, the enrolled key, the run and candidate
binding, the timestamp window, and refuses any approval carrying sensitive
data. On success M1-20 moves from Blocked to Pass. On failure the case stays
Blocked and the reason names the specific check that refused — read it rather
than re-signing blindly, since the usual causes are a candidate that predates
enrollment or a timestamp earlier than the rehearsal's completion.

## Run M1-20 release qualification

Before 1.2.0 is promoted, Kamiwaza Engineering/Release runs the M1-only parts
of this runbook against the exact release candidate in a disposable environment
using a real 1.0.0 database. The automated M1 harness binds the run to the
candidate SHA, disposable kube context, disposable database URL, this runbook,
and the deterministic evidence directory. It validates backup integrity,
schema head and marker, smoke results, restore into a new database, old-binary
compatibility, allowlisted files, and the secret scan.

The release owner must publish the exact CI run URL and signed M1 evidence URL
in both `metadata.json` and the release record. A unit-test fixture, a different
candidate SHA, a mutable documentation URL, or a bundle missing external
signoff does not satisfy M1-20.
