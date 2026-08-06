---
title: Core database upgrade from 1.0.0 to 1.2.0
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
| Release qualification (M1-20) | Kamiwaza Engineering/Release | The exact 1.0.0-to-1.2.0 run passes and the signed evidence is retained. |

Stop immediately if any prerequisite, backup validation, installer, schema
check, or smoke test fails. Preserve the active database and all evidence. A
failed Helm hook is a stopped upgrade, not permission to improvise.

## Prerequisites

- A supported RHEL 9 production installation running Kamiwaza 1.0.0 or later
  in the 1.x line, with the `core/1.0` database marker. A pre-1.0 database must
  first be upgraded to the supported 1.0.0 source floor.
- The 1.2.0 online installer or the complete, verified 1.2.0 offline bundle.
- Cluster-admin `kubectl` and Helm access for the installed cluster.
- Enough storage outside the PostgreSQL data volume for the logical backup and
  evidence bundle.
- The exact domain, installation mode, and release inputs used for the site.
- A confirmed maintenance window. Scheduler and API availability can be
  interrupted while the post-install database hook runs.
- External writers quiesced for the backup and upgrade window.
- The site's existing domain, runtime, storage, GPU, and installer options
  recorded and preserved for the 1.2.0 invocation.
- A Kamiwaza Support contact who can review a failure before any retry.

Record the exact installed release/chart/core image versions, cluster context,
namespace, intended 1.2.0 artifact and candidate SHA, and the successful CI and
M1 evidence URLs being relied on. If the database is below the 1.0.0 source
floor, stop and request the required intermediate upgrade procedure.

## 1. Create the evidence workspace

Run these commands from a private operator directory. Do not store the bundle
in a Git repository.

```bash
export RUN_ID="core-db-1.0.0-to-1.2.0-$(date -u +%Y%m%dT%H%M%SZ)"
export EVIDENCE_DIR="${PWD}/${RUN_ID}"
export COLLECTOR_DIR="${PWD}/${RUN_ID}-collector"
export PRIVATE_DIR="${PWD}/${RUN_ID}-private"
export NAMESPACE="kamiwaza"
export RELEASE="kamiwaza"

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
candidate commit, and the online/offline mode in a local change record. The
final `metadata.json` schema is shown in [Evidence manifest](#evidence-manifest).

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

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  pg_dump -U core -d kamiwaza --format=custom --no-owner --no-privileges \
  >"${BACKUP_FILE}"

test -s "${BACKUP_FILE}"
sha256sum "${BACKUP_FILE}" >"${BACKUP_FILE}.sha256"
kubectl exec -i -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  pg_restore --list <"${BACKUP_FILE}" >/dev/null
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -Atqc 'SHOW server_version;'
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
1.2.0 release-candidate artifact location recorded in `intended_artifact`.
Do not reuse an installer URL or script retained from an earlier release.
Verify the candidate before running it:

```bash
sha256sum -c kamiwaza-online-install.sh.sha256
chmod +x kamiwaza-online-install.sh
```

Then run the verified candidate once:

```bash
set +e
KEYGEN_LICENSE_KEY="${KEYGEN_LICENSE_KEY}" \
  ./kamiwaza-online-install.sh \
  --domain "${DOMAIN}" \
  --admin-password "${ADMIN_PASSWORD}" \
  -y 2>&1 | tee "${PRIVATE_DIR}/installer/console.log"
INSTALL_RC=${PIPESTATUS[0]}
set -e
printf '%s\n' "${INSTALL_RC}" >"${EVIDENCE_DIR}/installer/exit-status.txt"
```

### Offline upgrade

Stage and verify the complete 1.2.0 offline candidate. Use its own
`release_origination.md` as the authority for the RPM, chart, and image tags;
do not copy the 1.0.1 values from the current installation example. Record
that manifest as `intended_artifact`, confirm it identifies product version
1.2.0, and export its release-specific image values before running:

```bash
set +e
sudo -E /opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --domain "${DOMAIN}" \
  --admin-password "${ADMIN_PASSWORD}" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  -e helm_timeout=12m \
  -y 2>&1 | tee "${PRIVATE_DIR}/installer/console.log"
INSTALL_RC=${PIPESTATUS[0]}
set -e
printf '%s\n' "${INSTALL_RC}" >"${EVIDENCE_DIR}/installer/exit-status.txt"
```

Copy `/var/log/kamiwaza-postinst-debug.log` to
`installer/postinst-debug.log`, removing credentials or tokens before it is
shared. Keep the raw source log and `console.log` private; neither is in the
shareable allowlist.

If `INSTALL_RC` is nonzero, stop. Do not rerun the installer. Continue with
[Collect every failed attempt](#collect-every-failed-attempt).

## 5. Observe `core-db-init`

The production installer invokes the Helmfile-managed release. Its
`core-db-init` post-install/post-upgrade hook is the only supported schema
entrypoint. The Job runs the 1.2.0 core image's
`/app/services/core/scripts/db-init.py` before scheduler startup.

```bash
kubectl get job/core-db-init -n "${NAMESPACE}" -o wide
kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-db-init \
  --sort-by=.metadata.creationTimestamp -o wide
```

Do not delete the Job or pods. Failed pods are retained for
`core.scheduler.dbInit.ttlSecondsAfterFinished` (3600 seconds by default) and
are removed before the next hook creation, so collect evidence promptly.

### Collect every failed attempt

The 1.2.0 production payload includes a deterministic collector:

```bash
sudo /opt/kamiwaza/scripts/collect-core-db-init-diagnostics.sh \
  "${COLLECTOR_DIR}" "${NAMESPACE}" "${RELEASE}"

# The collector deliberately requires a new or empty target. After it exits,
# make its secret-safe output operator-readable and merge only its allowlisted
# directories into the already-populated final bundle.
sudo chown -R "$(id -u):$(id -g)" "${COLLECTOR_DIR}"
cp -a "${COLLECTOR_DIR}/cluster/." "${EVIDENCE_DIR}/cluster/"
cp -a "${COLLECTOR_DIR}/db-init/." "${EVIDENCE_DIR}/db-init/"
cp -a "${COLLECTOR_DIR}/helm/." "${EVIDENCE_DIR}/helm/"
```

It records the Job, all attempt pods in creation order, all attempt logs,
namespace state and events, and Helm status/history. For a pod that never
started, the pod description and events are authoritative; an empty container
log alone is not evidence that migration code ran.

## 6. Verify the schema from the running core image

After an installer exit of zero, invoke the packaged schema-status CLI from the
running 1.2.0 core container. The command exits nonzero unless the database is
supported and at the code head.

```bash
kubectl exec -n "${NAMESPACE}" deployment/core-scheduler -c core -- \
  python /app/scripts/schema-status.py --json \
  >"${EVIDENCE_DIR}/schema/status.json"

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -AtF $'\t' \
  -c 'SELECT schema_name, version FROM kamiwaza_schema_version ORDER BY schema_name;' \
  >"${EVIDENCE_DIR}/schema/marker.tsv"

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -AtF $'\t' \
  -c 'SELECT version_num FROM alembic_version ORDER BY version_num;' \
  >"${EVIDENCE_DIR}/schema/revision.tsv"
```

Required result:

- `state` is `at_head`;
- `supported` is `true`;
- `migration_required` is `false`;
- the marker is `core` version `1.0`;
- there is exactly one database Alembic head and it equals the 1.2.0 code head.

Any other result is a stopped upgrade. Do not stamp a revision or edit the
marker manually.

## 7. Run smoke checks

Verify the actual production domain and record machine-readable results in
`smoke/results.json`.

```bash
kubectl get pods -n "${NAMESPACE}" -o wide
curl --fail --silent --show-error --insecure \
  "https://${DOMAIN}/api/ping" >/dev/null
curl --fail --silent --show-error --insecure \
  "https://${DOMAIN}/api/security/public/config" >/dev/null
```

The M1-20 release qualification also exercises authenticated login, a core API
read, and an extension/API smoke appropriate to the release. Record every
required check using the exact validator shape below; every `status` must be
`"pass"`:

```json
{
  "checks": [
    {"name": "api-ping", "status": "pass"},
    {"name": "public-security-config", "status": "pass"}
  ]
}
```

## Failure states and next action

| Observed state | Meaning | Required action |
| --- | --- | --- |
| Backup is empty, checksum cannot be produced, or `pg_restore --list` fails | There is no validated recovery artifact. | Stop before upgrade; correct backup storage or access and create a new validated backup. |
| Installer exits nonzero before `core-db-init` exists | Host, artifact, registry, or Helm preparation failed before schema execution. | Preserve installer logs and cluster/Helm state; contact Support before retrying. |
| `core-db-init` pod is Pending, `ImagePullBackOff`, or `CreateContainerConfigError` | Migration code did not start. | Collect pod descriptions and events; fix only the Support-approved infrastructure cause, then obtain retry approval. |
| `core-db-init` starts and exits nonzero | Migration or database validation failed. | Collect every attempt log and description. Do not delete the Job, stamp the DB, or rerun. Escalate to Support. |
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

The safe diagnostic rehearsal restores the dump into a newly created,
disposable database while the active `kamiwaza` database remains untouched:

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

This rehearsal proves dump restorability; it does not switch production.
Supported recovery is either a support-reviewed cutover to a clean database
restored from the verified pre-upgrade backup and run with a compatible old
binary, or a reviewed and tested forward fix with its own evidence. Preserve
the failed database and evidence first. Never drop the active database, delete
its PVC, edit marker rows, stamp revisions, or apply ad hoc DDL as a first
response. Record the
rehearsal database name, active database name, restore result, old-binary
compatibility result, and confirmation that the active database was untouched
in `recovery/restore-rehearsal.json`.

Old-binary compatibility is not inferred from schema queries. In the disposable
M1 environment, start the exact immutable 1.0.0 core image with its database URL
pointing only at `${RESTORE_DB}`, wait for its readiness check, and run its
authenticated core API smoke. Stop that disposable workload after the check;
never repoint a production 1.0.0 workload. Set `old_binary_compatible` to true
only when both readiness and the authenticated smoke pass. Record the result
using these exact fields:

```json
{
  "restored_database": "kamiwaza_restore_YYYYMMDDTHHMMSSZ",
  "active_database_untouched": true,
  "old_binary_compatible": true
}
```

## Evidence manifest

The shareable bundle is deterministic. It contains exactly these nonempty
files, no dump, no raw installer console, no environment dump, and no
Kubernetes Secret or ConfigMap:

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

`metadata.json` must include:

```json
{
  "schema_version": 1,
  "run_id": "core-db-1.0.0-to-1.2.0-YYYYMMDDTHHMMSSZ",
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

Before sharing, remove unexpected files and scan every text file. The following
scan reports only the file path and line number, never the matching value:

```bash
secret_locations=0
while IFS= read -r -d '' file; do
  if ! awk '
    BEGIN { IGNORECASE = 1; found = 0 }
    /[[:alpha:]][[:alnum:]+.-]*:\/\/[^\/[:space:]@:]+:[^@\/[:space:]]+@/ ||
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

## M1-20 release qualification

Before 1.2.0 is promoted, Kamiwaza Engineering/Release must run this runbook
against the exact release candidate in a disposable environment using a real
1.0.0 database. The automated M1 harness binds the run to the candidate SHA,
disposable kube context, disposable database URL, this runbook, and the
deterministic evidence directory. It validates backup integrity, schema head
and marker, smoke results, restore into a new database, old-binary
compatibility, allowlisted files, and the secret scan.

The release owner must publish the exact CI run URL and signed M1 evidence URL
in both `metadata.json` and the release record. A unit-test fixture, a different
candidate SHA, a mutable documentation URL, or a bundle missing external
signoff does not satisfy M1-20.
