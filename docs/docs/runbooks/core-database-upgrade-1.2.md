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
- A confirmed maintenance window that covers a **possible Core API outage**.
  While the 1.2.0 Ray head is up and the schema is behind, the head is held out
  of `core-api` and the API serves nothing. Whether that window has any length
  is a race the chart does not order, and on a measured run it had none at all.
  Plan for the outage; do not conclude anything from its absence. See
  [What normal looks like](#what-normal-looks-like-during-the-upgrade) before
  you begin.
- External writers quiesced for the backup and upgrade window.
- **Durable storage for the Ceph OSD**, verified before anything else — every
  PVC in the cluster, including both PostgreSQL instances, depends on it. See
  [Durable storage for the OSD](#durable-storage-for-the-osd).
- **A host snapshot taken immediately before [step 4](#4-run-the-supported-installer-once)**.
  This is the only route to a second attempt: the [recovery boundary](#recovery-boundary)
  forbids every in-runbook alternative. See
  [Snapshot the host before step 4](#snapshot-the-host-before-step-4).
- The site's existing domain, runtime, storage, GPU, and installer options
  recorded and preserved for the 1.2.0 invocation.
- A Kamiwaza Support contact who can review a failure before any retry.

Record the exact installed release/chart/core image versions, cluster context,
namespace, intended 1.2.0 artifact, and candidate SHA. The CI and signed M1
evidence URLs are release-engineering inputs, not values a customer operator
must create. If the database is below the 1.0.0 source floor, stop and request
the required intermediate upgrade procedure.

### Durable storage for the OSD

Confirm this first, because it decides whether any of the protection below is
worth anything. The Ceph OSD's backing store must live on **durable** storage —
a managed or otherwise persistent disk. It must never be an instance-store or
temporary resource disk. Every PVC in a Kamiwaza cluster is `ceph-block`, so the
OSD holds the platform's entire persistent state: both PostgreSQL instances, all
etcd members, Neo4j, Kafka, and OpenSearch.

The trap is specific and easy to walk into. The default OSD path commonly lands
on a filesystem too small for the sizing requirement, which forces relocation,
and the volume with room to spare is frequently the cloud's ephemeral one. Know
which one that is on your platform:

| Platform | Ephemeral volume — never put the OSD here |
| --- | --- |
| Azure | The temporary resource disk, usually mounted at `/mnt` |
| AWS | Instance-store volumes |
| GCP | Local SSDs |

**First find what actually backs the OSDs on this cluster.** There is no single
field that answers this, and the wrong one is easy to reach for:
`spec.dataDirHostPath` is Rook's configuration and daemon-state directory, *not*
the OSD data store. Reading it instead would inspect the wrong filesystem —
frequently a durable `/var/lib/rook` — while the real OSD sits on the ephemeral
disk you are trying to detect. Read `spec.storage`, which is where the backing
device, PVC template, or file-backed image is declared:

```bash
kubectl get cephcluster -A -o json \
  | jq '.items[] | {ns: .metadata.namespace, name: .metadata.name, storage: .spec.storage}'
```

(Use `-o json | jq` rather than `-o jsonpath` here: a jsonpath expression
renders a CR's nested object in Go's `map[deviceFilter:… useAllDevices:…]`
form, which is awkward to read against the table below.)

Interpret the result:

| What `spec.storage` shows | What backs the OSD | What to check |
| --- | --- | --- |
| `devices` / `deviceFilter` / `useAllDevices` | A raw block device on the node | The device itself — is it a managed disk or an instance-store device? |
| `storageClassDeviceSets` | PVCs from another storage class | That storage class's underlying disk type |
| A host path (file-backed OSD) | A file on a node filesystem | The mount holding that file — the case below |

For the file-backed case — the shape the reporting host had — export the backing
file's path from `spec.storage` and resolve its mount. **Export it yourself; the
block deliberately does not supply a default**, because any default here would
be a guess about the very thing being measured:

```bash
export OSD_IMAGE_PATH=   # <- paste the backing file's path from spec.storage

findmnt -T "${OSD_IMAGE_PATH:?set this to the OSD backing file from spec.storage}"

# Azure marks its ephemeral resource disk with a sentinel file. Report only if
# it is there: a bare `ls` would exit nonzero and print "No such file or
# directory" on AWS, on GCP, and on any Azure host without it -- reading as a
# failed prerequisite on a perfectly good installation.
if test -e /mnt/DATALOSS_WARNING_README.txt; then
  echo "WARNING: /mnt is Azure's ephemeral resource disk on this host."
  echo "         The OSD must not live on it, and it cannot be snapshotted."
fi
```

Two deliberate choices in those three lines. The value is left **empty** so the
guard actually fires if you paste without substituting — a plausible-looking
default such as `/var/lib/rook/...` would make the guard unreachable and hand
back a confident reading of `dataDirHostPath`'s filesystem, which is the wrong
one this section exists to steer you off. And the guard is attached to
`findmnt` rather than sitting on a line of its own: a bare
`: "${OSD_IMAGE_PATH:?…}"` prints its message but **does not stop an
interactive shell** — bash aborts only non-interactive ones, and these blocks
are written to be pasted into a terminal. The next line would run regardless,
and `findmnt -T ""` reports the mount holding your *current directory* and exits
0: a confident, wrong, clean-looking answer on the check that decides whether
any of the protection below is worth anything.

`findmnt` also needs `-T`. Without it, `findmnt` matches only exact mount points
and returns nothing at all for a path inside one — silence that reads like a
clean result.

Whichever shape the cluster uses, the question is the same: **is the device
holding OSD data a managed/persistent disk, or an instance-store one?** Answer it
for every OSD, not just the first.

If the OSD is on ephemeral storage, **stop**. The cloud destroys that volume on
stop, deallocate, resize, or host migration, and it cannot be snapshotted — so
the snapshot below cannot protect this data, and the VM must not be stopped or
deallocated for any reason, including taking one. Relocate the OSD onto durable
storage before proceeding with the upgrade.

### Snapshot the host before step 4

Take a full host snapshot immediately before [step 4](#4-run-the-supported-installer-once),
and treat that step as the point of no return. The
[recovery boundary](#recovery-boundary) rules out every alternative — there are
no downgrade migrations, a Helm rollback does not roll the schema back, and
restoring a logical dump over the active database is prohibited. Without a
snapshot there is no faithful 1.0.0 baseline to return to: a dump restore plus a
Helm rollback still leaves 1.2.0 CRDs, hook state, and extension records behind.

**Capture every disk holding state, not only the OS disk.** On Azure, that means
a restore point collection over the whole VM:

```bash
# Resolve the id in its own statement and check it. A `${VM:?…}` written inside
# the `$( )` below would kill only the subshell: the outer `az` would still run,
# with an empty --source-id.
VM_ID=$(az vm show \
  -g "${RG:?export the resource group holding the VM}" \
  -n "${VM:?export the VM name}" --query id -o tsv)

if test -n "${VM_ID}"; then
  az restore-point collection create -g "${RG}" \
    --collection-name kamiwaza-pre-upgrade --source-id "${VM_ID}"
  az restore-point create -g "${RG}" \
    --collection-name kamiwaza-pre-upgrade --name pre-step4
else
  echo "stop: could not resolve the VM id" >&2
  false
fi
```

On AWS the equivalent is a multi-volume snapshot of the instance
(`aws ec2 create-snapshots --instance-specification InstanceId=...`); on GCP,
a machine image (`gcloud compute machine-images create`). On bare metal, use
whatever storage-layer snapshot the array provides, and confirm it covers the
OSD's device from [the check above](#durable-storage-for-the-osd).

A snapshot taken while the VM is running is crash-consistent, which is
sufficient here: PostgreSQL recovers from its WAL when the snapshot is restored.
**Do not stop or deallocate the VM to take one** — on a host whose OSD is on
ephemeral storage that is destructive, and it buys nothing on a host where it
is not.

## What normal looks like during the upgrade

Read this section before starting. A gated workload and a broken one look
alike from the outside, and the single most likely way to turn a healthy
upgrade into a failed one is to react to the gate as though it were a fault.

### The Core API may stop serving, on purpose — and may not

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

#### How long the outage lasts is a race, and it is often zero

The window above is bounded by two events the chart does not order relative to
each other. `core-db-init` is a `post-install,post-upgrade` hook, while the new
1.2.0 Ray head is rolled **asynchronously** by the KubeRay operator once the
RayCluster CR updates. Nothing sequences the migration ahead of or behind the
head's creation, so the overlap between "1.2.0 head is up" and "schema is
behind" can be long, short, or empty.

Empty is a perfectly ordinary outcome. On a successful measured run:

| Event | Time (UTC) |
| --- | --- |
| Release upgrade begins (Helm revision 31) | 02:49:06 |
| `core-db-init` created | 02:49:26 |
| `core-db-init` completed (`v1_marker_only -> at_head`) | 02:51:11 |
| New 1.2.0 Ray head created | 02:52:06 |
| New head Ready 3/3 | 02:52:21 |

`core-db-init` finished 55 seconds before the 1.2.0 head was even created, so
the head came up against an already-at-head schema and went Ready in 15
seconds. It was never observed at `2/3`, `core-api` never had an empty endpoint
list, and the 1.0.0 head served throughout. That run was a success, not a gate
that failed to engage.

Read the 1800-second figure in [Wait windows](#wait-windows) accordingly: it
bounds how long `core-db-init` itself may legitimately run, **not** how much
downtime to expect. Observed downtime can be anywhere from none to roughly that
long.

#### Confirm the gate is armed, rather than inferring it from an outage

Because a fast success and a gate that never engaged look identical from the
outside — no outage, in both cases — do not use the presence or absence of
downtime as evidence either way. Check the gate positively instead:

```bash
# The schema-readiness container exists in the head pod and is running.
kubectl get pods -n "${NAMESPACE}" \
  -l ray.io/cluster=core-raycluster,ray.io/node-type=head \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.containerStatuses[*]}{.name}={.ready}{" "}{end}{"\n"}{end}'

# Resolve the NEWEST head pod. Both the 1.0.0 and 1.2.0 heads carry these
# labels while the upgrade is in flight, and only the 1.2.0 one has the gate --
# so an unsorted `items[0]` can hand you the old head and a
# "container not found" that reads exactly like a missing gate.
HEAD_POD=$(kubectl get pod -n "${NAMESPACE}" \
  -l ray.io/cluster=core-raycluster,ray.io/node-type=head \
  --sort-by=.metadata.creationTimestamp \
  -o jsonpath='{.items[-1:].metadata.name}')

# Newest is not yet the same as 1.2.0. KubeRay creates the replacement head
# asynchronously, and until it does, the newest -- and only -- pod matching the
# selector is still the 1.0.0 head, which has no schema-readiness container by
# definition. Read the images before reading anything into a missing container:
# a 1.0.0 image here means the replacement head has not been created yet, which
# is an ordinary window to wait out, not a gate to escalate.
kubectl get pod -n "${NAMESPACE}" "${HEAD_POD}" \
  -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'

# Query with the interpreter the container definitionally has. The
# schema-readiness container runs `python -m kamiwaza.node.readiness_server`,
# and slim Python images frequently ship no curl -- `exec: "curl": executable
# file not found` is a missing tool, NOT a missing gate.
#
# Catch HTTPError: a readiness endpoint reporting "schema is behind" answers
# 503, which urlopen raises on. That is the gate WORKING, and an uncaught
# traceback here would read as a broken probe at the exact moment the probe is
# telling you what you asked.
kubectl exec -n "${NAMESPACE}" \
  "${HEAD_POD:?no Ray head pod found — the gate cannot be confirmed}" \
  -c schema-readiness -- \
  python -c 'import urllib.request, urllib.error, sys
try:
    r = urllib.request.urlopen("http://127.0.0.1:7788/healthz/schema", timeout=5)
    print("%s %s" % (r.status, r.read().decode()))
except urllib.error.HTTPError as e:
    print("%s %s" % (e.code, e.read().decode()))
except Exception as e:
    print("probe could not run: %r" % (e,)); sys.exit(1)'
```

**Any HTTP status back from `/healthz/schema` means the gate is armed** — 200
says the schema is at head, 503 says it is behind and the gate is holding. Both
are the gate working. Read the status, not merely the absence of an error.

The gate is *not* armed only when the `schema-readiness` container is absent
from a head pod **that is running the 1.2.0 image**. That is a chart/image
problem to escalate, and any smoke test that passed during the upgrade proved
nothing about schema safety. Two things look identical to a check that skips the
image and must not be escalated as a missing gate:

- **The newest head is still the 1.0.0 one.** The replacement head has not been
  created yet, so the container is absent exactly as expected. Wait and
  re-check — the roll is asynchronous, as
  [the section above](#how-long-the-outage-lasts-is-a-race-and-it-is-often-zero)
  describes.
- **The probe could not run at all.** A missing interpreter, a connection
  refused, or the `probe could not run:` line above tell you the check failed,
  not that the gate is missing.

### Expected observations

| Observation | Meaning | Action |
| --- | --- | --- |
| Ray head pod `Running` but **not Ready**, with its READY column one container short (`2/3` where the mesh sidecar is present), while `core-db-init` is pre-head | Correct. The gate is holding. | Wait. Continue to observe `core-db-init`. |
| `core-api` has no endpoints, and requests to it fail or return 503, during that same window | Correct, and it follows directly from the line above. | Wait. Do not restart anything. |
| Ray head becomes Ready and `core-api` endpoints reappear shortly after `core-db-init` succeeds | Correct. The gate has reopened. | Continue to [step 6](#6-verify-the-schema-from-the-running-core-image). |
| `core-postgres-0` is recreated during the upgrade — a young pod age where you expected an old one | Correct. The platform sync rolls the PostgreSQL StatefulSet; the data lives on its volume and is unaffected by the roll. `core-db-init` runs as its own hook against the pre-roll Postgres. | Continue. The volume is what preserves the data. [Step 6](#6-verify-the-schema-from-the-running-core-image) then verifies the schema, which is the condition this runbook gates on — judge the roll by that, not by pod age. |
| The core schema marker still reads `core` / `1.0` after a successful upgrade | Correct — see [step 6](#6-verify-the-schema-from-the-running-core-image). The marker records the schema **contract** the database satisfies, which 1.2.0 does not change. There is no `1.2` marker value and you will never see one. | Continue. Judge success by `state`, `supported`, `migration_required`, and the head revisions. |
| No outage at all: the head is never seen short a container and `core-api` never loses its endpoints | Correct, and common. `core-db-init` finished before the 1.2.0 head was created. | Continue. Do not read this as a gate that failed to engage — [confirm the gate positively](#confirm-the-gate-is-armed-rather-than-inferring-it-from-an-outage) instead. |
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

Note the scope of this procedure's restart prohibitions: they forbid
**operator-initiated** restarts during diagnosis — deleting the Ray head pod,
bouncing `core-postgres-0`, rolling a deployment to "clear" a gate. They say
nothing about the platform's own rollouts. The upgrade recreates
`core-postgres-0` as a matter of course, and that is not a restart you caused or
should react to.

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
# NAMESPACE is for this runbook's kubectl commands only. It must NOT reach the
# installer in step 4 -- see "Keep NAMESPACE out of the installer's environment"
# there. The step 4 blocks strip it explicitly, so exporting it here is safe.
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

Supplied by the release owner (a qualification run cannot derive these), with
one exception called out in the table — on the online path `INTENDED_ARTIFACT`
is completed by the run itself, because half of it does not exist until the
upgrade has pulled its images:

| Variable | What it is | First needed |
| --- | --- | --- |
| `KAMIWAZA_M1_RUN_ID` | The harness run this evidence belongs to | step 1 |
| `CANDIDATE_SHA` | The full 1.2.0 candidate commit the run is pinned to | step 1 |
| `MAINTENANCE_TICKET` | The change record authorizing this run | step 1 |
| `INTENDED_ARTIFACT` | The exact 1.2.0 payload installed — offline, the candidate's `release_origination.md` checksum; online, the installer checksum plus the resolved core image digest. Both are composed in [what `intended_artifact` has to record](#what-intended_artifact-has-to-record). | metadata |
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

## Working inside the database pod

Every remaining step drives PostgreSQL through `kubectl exec`. Two of its
behaviours have each, on a real run, produced a failure that looked like
something else entirely — one an unrecoverable-looking hang, the other a silent
no-op reported as success. Read this before step 3 rather than diagnosing them
mid-window.

### Never feed a large redirect into `kubectl exec -i`

`kubectl exec -i` does not reliably deliver EOF once a redirected file has been
consumed, so a command that reads until end of input never returns.
`pg_restore --list <dump` is the case this procedure used to contain, and it
hangs indefinitely.

The damage outlives the command. The wedged invocation leaves a stuck streaming
connection from konnectivity-agent to the kubelet on port 10250, with the
unread bytes sitting in its receive queue, and from that point **every**
`kubectl exec` into that pod fails with a dial timeout. On the host where this
was observed, restarting konnectivity-agent was not sufficient; the kubelet
itself had to be restarted.

Note what is *not* broken when this happens: the dump. The `pg_dump` that
preceded it exited 0 and wrote a complete file. It is the table-of-contents
check that hangs, not the backup.

Copy the file into the pod and restore from a path instead — this is the shape
[Stage the dump into the pod](#stage-the-dump-into-the-pod) uses, with
`POD_DUMP` defined there:

```bash
kubectl cp -c postgres "${BACKUP_FILE}" \
  "${NAMESPACE}/core-postgres-0:${POD_DUMP}" &&
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    pg_restore --list "${POD_DUMP}" >/dev/null
```

The `&&` is load-bearing: on its own line the table-of-contents read would still
run after a failed copy, against whatever the path held before.

`kubectl cp` needs `tar` in the target container — it streams the file as a tar
archive and extracts it inside. The `postgres` container has it, but confirm
once before the maintenance window rather than discovering it mid-restore, since
every staged copy this procedure makes — the one in step 3 and the two re-runs
of it before the reset and rehearsal restores — goes through `kubectl cp`:

```bash
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- sh -c 'command -v tar'
```

The `sh -c` wrapper is required. `kubectl exec -- command -v tar` execs `argv`
directly with no shell, and `command` is a shell *builtin* with no binary on
disk — so that form always fails with
`exec: "command": executable file not found in $PATH` no matter how present
`tar` is. Reading that as a missing `tar` is the same false negative this
section warns about elsewhere.

**`kubectl cp` also needs room for a second copy of the dump, inside the pod.**
This is space the prerequisites do not otherwise account for: the
["enough storage outside the data volume"](#prerequisites) requirement covers
the operator host, and the 120% check in step 3 measures the filesystem holding
`data_directory`. The staging path is neither — `/tmp` in the container is
usually the node's writable layer, so a large database can fail at the copy, or
fill the node root mid-window, while satisfying every documented capacity check.
Step 3's [Stage the dump into the pod](#stage-the-dump-into-the-pod) block runs
that check, once the dump exists to size it against, and copies only if it
passes. It sizes itself from `BACKUP_FILE`, so re-run **that block, and only
that block**, before the reset and rehearsal copies — both happen after a pod
roll, and the earlier staging copy is gone by then. Re-running the `pg_dump`
above it would overwrite `${BACKUP_FILE}`.

If it stops, stage somewhere with known capacity instead of `/tmp`: `export
POD_DUMP=/path/the/postgres/container/can/write/kamiwaza-1.0.0.dump` **before**
re-running the block, and remove the file when the restore is done. The value is
a *file* path; the block measures the directory holding it. It honours a
`POD_DUMP` you have already exported, so the relocation survives the re-run
within the same shell.

If you have already wedged a pod, recover the node rather than the database:
restart konnectivity-agent, and restart the kubelet if `kubectl exec` still
times out afterwards. **Do not restart `core-postgres-0`** — the fault is in the
exec transport, not in PostgreSQL, and restarting the database pod neither
clears it nor is a safe reflex during an upgrade.

### The inverse trap: `kubectl exec` *without* `-i` runs nothing and exits 0

The same mechanism has a second, worse face. Without `-i`, stdin is never
attached, so a heredoc supplied to the container is never delivered: `psql`
reads EOF immediately, executes **zero** statements, and exits 0.

This is not hypothetical. A heredoc'd block of `ALTER DATABASE` / `DROP
DATABASE` / `CREATE DATABASE` ran no statements and reported success. The
`pg_restore` that followed — which takes its input as an argument, and therefore
*did* run — then reported 643 "already exists" errors. The natural reading is
that something re-created the schema. Nothing had: the drop never happened. One
block, two commands, only one of them honouring stdin.

The tell is that `psql` prints nothing whatsoever and returns 0. Genuine
administrative SQL always prints something (`ALTER DATABASE`, `DROP DATABASE`).
Silence plus `rc=0` means no statement ran.

**Use `-c` per statement as the default for administrative SQL**, and always
with `-v ON_ERROR_STOP=1`. Multiple `-c` arguments run in sequence and are *not*
wrapped in a single transaction — which is what makes statements like `DROP
DATABASE` legal in this form, where a heredoc would fail on them even if its
input were delivered.

The form is safe to run as written — it only reads:

```bash
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT current_database(), current_user" \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'kamiwaza'"
```

**`ON_ERROR_STOP=1` is not optional.** Without it `psql` reports a failed
statement, carries on to the next one, and still **exits 0** — so a sequence
whose first half failed looks like a success to the `test`/`&&` that follows it.
With it, `psql` stops at the first error and exits nonzero.

The destructive rename-and-recreate that uses this same form lives in
[If Support approves a reset to the 1.0.0 baseline](#if-support-approves-a-reset-to-the-100-baseline).
**Do not run it from here.** It requires Support approval, a completed
[step 3](#3-back-up-and-validate-the-database) backup, and the readiness gate
documented alongside it.

Reserve `-i` for input you pipe deliberately and keep small; never combine it
with a redirect of a dump-sized file.

One related way this stayed invisible: **piping to `tail` makes `$?` the exit
status of `tail`**, which is essentially always 0. Check the status of the
command itself — `${PIPESTATUS[0]}` in bash — or do not pipe at all when the
exit status is the thing you are gating on.

### Keep pasted commands short

Long multi-line blocks corrupt on paste. A multi-line `kubectl exec` assignment
pasted into a terminal arrived mashed together and left bash waiting at a `PS2`
continuation prompt — which looks exactly like another hang, and which is
especially confusing alongside the trap above, because the shell may be
displaying garbled *later* lines while execution is actually stuck on an
earlier one.

Keep each `kubectl exec` assignment short enough to paste as one line, or put
the block in a `.sh` file and run that instead of pasting it.

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
```

### Stage the dump into the pod

The dump has to exist inside the pod for the table-of-contents read below, and
again for the reset and rehearsal copies much later in this runbook. Those later
sections send you back **here, to this block only** — never to the `pg_dump`
above, which would overwrite `${BACKUP_FILE}`.

Coming back here in a **new shell** — which is the usual case, since both later
copies happen after a pod roll — first re-export the two variables this block
reads, to the values the earlier steps already used:

```bash
export NAMESPACE="kamiwaza"
export BACKUP_FILE="/path/from/step-1/backup/kamiwaza-1.0.0.dump"
```

**Do not re-run [step 1](#1-create-the-evidence-workspace) to get them.** It
mints a fresh `RUN_ID` from the current timestamp, so `PRIVATE_DIR` — and with
it `BACKUP_FILE` — would point at a new, empty evidence directory rather than
the one holding your backup. Read the real path off the step 1 workspace on
disk. Without these, the block below stops with an empty byte count rather than
a message naming what is missing.

Copy the dump in and check its table of contents from a path. Never redirect it
into `kubectl exec -i`: that wedges the node's exec transport for every later
command, per [Working inside the database
pod](#working-inside-the-database-pod).

```bash
# Staging path inside the pod. If /tmp is short on room, `export POD_DUMP=...`
# to a writable file path with known capacity **before** running this block --
# the capacity check below measures the directory holding it. The export carries
# the relocation to the rest of THIS shell's commands; a later re-copy in a new
# shell has to re-run this block, which is exactly what the `:?` guards at those
# sites tell you to do.
export POD_DUMP="${POD_DUMP:-/tmp/kamiwaza-1.0.0.dump}"

# Clear any staging copy left by an earlier attempt, before measuring anything.
# Nothing below may be allowed to read a stale file: a copy that this block
# refuses, or that fails outright (a full target, no `tar` in the pod, an exec
# transport error), would otherwise leave the TOC read and the restore check
# validating an old dump -- so a host backup that was never staged reads as
# verified. Removing it first also keeps the free-space figure below honest,
# rather than counting a doomed retry's own leftovers against it.
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  rm -f "${POD_DUMP}"

# Confirm the pod has room for the staging copy, and copy -- and read the TOC --
# only if it does. This filesystem is neither the operator host nor the
# PostgreSQL data volume, so neither the prerequisites nor the 120% check below
# covers it.
#
# Sized from the dump on this host rather than from BACKUP_SIZE_BYTES, so the
# same block can be re-run before the reset and rehearsal copies -- both of
# which happen after a pod roll, often in a new shell.
DUMP_BYTES=$(stat -c '%s' "${BACKUP_FILE:?path to the dump on this host}")
POD_TMP_FREE=$(kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  df -PB1 "$(dirname "${POD_DUMP}")" | awk 'NR == 2 {print $4}')

if test -n "${DUMP_BYTES}" && test -n "${POD_TMP_FREE}" \
  && test "${POD_TMP_FREE}" -ge "${DUMP_BYTES}"; then
  # One `&&` chain, not three statements. In an interactive shell -- which is
  # what you are pasting into -- a failed statement does not stop the ones after
  # it, so an unchained sequence would let the TOC read report success against a
  # stale file the copy never replaced. The leading `test ! -e` catches the case
  # where the `rm` above silently failed (read-only staging dir, permissions).
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    test ! -e "${POD_DUMP}" &&
    kubectl cp -c postgres "${BACKUP_FILE}" "${NAMESPACE}/core-postgres-0:${POD_DUMP}" &&
    kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
      pg_restore --list "${POD_DUMP}" >/dev/null
else
  echo "stop: dump is '${DUMP_BYTES}' bytes, $(dirname "${POD_DUMP}") has '${POD_TMP_FREE}' free" >&2
  false
fi
```

With the staging copy in place and its table of contents readable, record the
backup metadata and prove the archive actually restores:

```bash
POSTGRESQL_VERSION=$(kubectl exec -n "${NAMESPACE}" \
  core-postgres-0 -c postgres -- \
  psql -U core -d kamiwaza -Atqc 'SHOW server_version;')
BACKUP_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Refuse to print the stanza unless every field was actually collected. An
# earlier revision printed it unconditionally, so a `kubectl exec` that failed
# with a dial timeout produced `postgresql_version=` — a record that reads as a
# successful backup whose Postgres version merely went unrecorded. A printed
# stanza is not proof that the commands behind it ran.
#
# The guards are CHAINED to the printf on purpose. As separate statements they
# would not gate anything in an interactive shell: a failing `test` returns 1
# and the next line runs regardless. Only `errexit` would stop it, and you are
# pasting these into a shell that does not have it set.
#
# For the same reason, this stanza still prints after the staging copy above was
# refused and its `false` ran. That is not a contradiction: the stanza describes
# ${BACKUP_FILE}, the host dump, which did succeed. It says nothing about the
# in-pod staging copy. Act on the `stop:` line regardless.
if test -n "${BACKUP_SIZE_BYTES}" \
  && test -n "${BACKUP_SHA256}" \
  && test -n "${POSTGRESQL_VERSION}"; then
  printf 'size_bytes=%s\nsha256=%s\npostgresql_version=%s\nbackup_timestamp=%s\n' \
    "${BACKUP_SIZE_BYTES}" "${BACKUP_SHA256}" \
    "${POSTGRESQL_VERSION}" "${BACKUP_TIMESTAMP}"
else
  echo "stop: backup metadata incomplete; a kubectl exec above failed" >&2
  false
fi

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
    kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
      pg_restore -U core --exit-on-error --no-owner --no-privileges \
      -d "${BACKUP_CHECK_DB}" "${POD_DUMP}" || exit 1
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

`${POD_DUMP}` is a staging copy inside the pod's filesystem, not a backup. The
authoritative copy is `${BACKUP_FILE}` on the operator host. The pod is
recreated by any StatefulSet roll — including the one the upgrade itself
performs — and anything staged in it is gone afterwards, so **re-run [Stage the
dump into the pod](#stage-the-dump-into-the-pod) before any later step that
needs the dump in the pod**. Re-run that whole block, not a bare `kubectl cp`:
the capacity check, the stale-copy removal, and the chained table-of-contents
read are what make the staged copy trustworthy. Remove the staging copy once the
validation above has passed:

```bash
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  rm -f "${POD_DUMP}"
```

## 4. Run the supported installer once

> **Point of no return.** Take the host snapshot now if you have not already —
> see [Snapshot the host before step 4](#snapshot-the-host-before-step-4).
> Past this point the [recovery boundary](#recovery-boundary) offers no way back
> to a 1.0.0 baseline without one.

Use the same supported production path as a clean installation. Preserve the
exact invocation and exit status. The examples below omit real credentials;
provide them using your approved secret-handling process and do not add them to
the evidence bundle.

### Keep `NAMESPACE` out of the installer's environment

Both invocations below run through `env -u NAMESPACE`. That is not decoration.

[Step 1](#1-create-the-evidence-workspace) has you `export NAMESPACE="kamiwaza"`
for this runbook's `kubectl` commands. The installer's post-install
`make patch-coredns` step runs `scripts/patch-coredns.sh`, which reads
`NAMESPACE` as something else entirely — its **ingress-service namespace
override** — and prefers a pre-set value over its provider default of
`istio-system`. Following this runbook and then running step 4 in the same
shell, which is exactly what it prescribes, therefore sends the script looking
for `istio-ingressgateway` in `kamiwaza`, where it does not exist:

```
=== CoreDNS Patch: <domain> -> istio-ingressgateway.kamiwaza ClusterIP (provider: istio) ===
  Attempt 1/30: waiting for istio-ingressgateway service (retry in 10s)...
ERROR: istio-ingressgateway.kamiwaza has no ClusterIP after 30 attempts
make[1]: *** [Makefile:427: patch-coredns] Error 1
```

Five minutes of retries, then a nonzero installer exit — **after** the database
migration, the Ray head roll, and every Helm release have already succeeded. The
platform is fine; the install reports failure. Observed on a real validation
run, and initially misfiled as an installer defect before the collision was
traced.

`env -u NAMESPACE` removes the variable for the installer process only, so the
runbook's own `kubectl` steps keep working before and after. It does not depend
on the operator remembering to `unset`, and it survives being pasted out of
order.

One caveat on the offline path, which runs it as `sudo -E env -u NAMESPACE
<installer>`: the sudo target becomes `/usr/bin/env`, not the installer. This
runbook already assumes full `sudo` with `setenv`, so it is fine as written —
but on a site whose sudoers allowlists the installer path specifically, that
form is denied where a direct `sudo -E <installer>` would be permitted. There,
`unset NAMESPACE` in the shell before the `sudo` line instead, and re-export it
afterwards for the remaining `kubectl` steps.

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
test -n "${INSTALLER_SHA256}"
export INSTALLER_SHA256
```

The `test` and the `export` are deliberate, for the same reason as the baseline
capture above: this value is consumed after the upgrade, and an empty or
shell-local one becomes a bundle that is refused hours later — or worse, one
that ships an empty installer checksum the placeholder guard cannot catch.

Then run the verified candidate once. `--keep-extract` retains the exact
candidate's deploy payload so its diagnostics collector remains available at
the documented path. The subshell preserves the caller's existing `errexit`
setting while still capturing a failed installer:

```bash
: "${KEYGEN_LICENSE_KEY:?export KEYGEN_LICENSE_KEY from the approved license source}"

(
  set +e
  # The license key is a shell assignment prefix, not an argument to `env`, so
  # it never appears in any process's argv -- `env`'s own included, where
  # /proc/<pid>/cmdline and execve audit rules would both pick it up.
  KEYGEN_LICENSE_KEY="${KEYGEN_LICENSE_KEY}" env -u NAMESPACE \
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
  sudo -E env -u NAMESPACE /opt/kamiwaza/scripts/install-prod.sh \
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

While this Job is running, the Ray head **may** be `Running` but not Ready, with
`core-api` showing no endpoints. That is the schema-readiness gate holding, not a
fault. It is equally normal to see none of it: whether the 1.2.0 head is up
before the Job finishes is a race, and it is frequently won by the Job — see
[how long the outage lasts](#how-long-the-outage-lasts-is-a-race-and-it-is-often-zero).
Neither observation is a finding on its own; confirm the gate positively rather
than inferring it from downtime. If the head is holding, do not restart it,
delete its pod, or roll back the release in response — it rejoins `core-api` on
its own within about ten seconds of the schema reaching head.

Do not delete the Job or pods. The completed Job and its pods are retained for
`core.scheduler.dbInit.ttlSecondsAfterFinished` (3600 seconds by default) and
are removed before the next hook creation, so collect evidence promptly.

### Collect upgrade diagnostics

Run the 1.2.0 production payload's deterministic collector on both success and
failure paths. Support diagnosis and M1 qualification both require its cluster,
db-init, and Helm outputs even when the upgrade succeeds.

Name the two collector binaries explicitly. The collector resolves `kubectl`
and `helm` once, up front, and a tool it cannot resolve is a hole in the bundle
that ends the run at exit 1 — it no longer proceeds and reports success with
the Helm half missing. Resolve the paths in your own shell so they are correct
on any host, and check them before the collector needs them:

```bash
# `type -P`, not `command -v`: the latter also resolves aliases and shell
# functions, printing something that is not a filesystem path and passing the
# checks below only to be rejected by the collector a step later.
KUBECTL_PATH="$(type -P kubectl)" || KUBECTL_PATH=''
HELM_PATH="$(type -P helm)" || HELM_PATH=''
test -x "${KUBECTL_PATH}"
test -x "${HELM_PATH}"
```

`test -x` is the same requirement the collector enforces — an executable
regular file, reached by a path — so a failure here is the finding it would
report a step later. Install or locate the missing tool before running the
collector rather than accepting a bundle without it.

Point `COLLECTOR_DIR` at a path no earlier run has touched: the collector
refuses a target that already exists and is non-empty, so re-pointing a second
run at the first run's directory ends at exit 2 rather than collecting
anything.

This is the only invocation. If your cluster access requires root, add `sudo`
to the collector line below and read
[running it under `sudo`](#if-you-run-the-collector-under-sudo) first — the
ownership reclaim that follows the invocation is already part of this block, so
there is no separate root-only recipe to splice in.

```bash
COLLECTOR_RC=0
COLLECTOR_COMMAND_FAILURES=0
COLLECTOR_EVIDENCE_COMPLETE=0

"${COLLECTOR_COMMAND}" \
  "${COLLECTOR_DIR}" "${NAMESPACE}" "${RELEASE}" \
  --kubectl-bin "${KUBECTL_PATH}" --helm-bin "${HELM_PATH}" || COLLECTOR_RC=$?

# Reclaim the bundle before anything reads it. The collector runs under
# `umask 077` and `chmod 700`s its output, so a root-run leaves it root-owned
# and unreadable to you — and the exit-1 path below is precisely when you need
# to read manifest.txt. `-O` is false only when the directory is not yours, so
# this is a no-op when you ran the collector as yourself.
#
# Excluding exit 2 is what keeps a recursive, root-privileged chown pointed at
# this run's own output: exit 2 is the one outcome where the collector created
# nothing, and it is what you get for a COLLECTOR_DIR that already existed and
# was non-empty. Any other status means this tree is ours to reclaim.
if [[ "${COLLECTOR_RC}" -ne 2 && -d "${COLLECTOR_DIR}" && ! -O "${COLLECTOR_DIR}" ]]; then
  sudo chown -R "$(id -u):$(id -g)" "${COLLECTOR_DIR}"
fi

if [[ "${COLLECTOR_RC}" -eq 2 ]]; then
  # Exit 2 is refused before this run writes anything, so it produced no
  # manifest to consult — any file already at that path belongs to an earlier
  # run. The argument or the target path is what needs correcting.
  printf 'stop: collector refused the invocation (exit 2); fix the argument or use a new COLLECTOR_DIR\n' >&2
elif [[ "${COLLECTOR_RC}" -ne 0 ]]; then
  printf 'stop: diagnostics bundle is incomplete (exit %s); %s names what is missing\n' \
    "${COLLECTOR_RC}" "${COLLECTOR_DIR}/manifest.txt" >&2
else
  # The collector deliberately requires a new or empty, non-symlink target.
  # Merge evidence before classifying failures observed in the cluster.
  cp -a "${COLLECTOR_DIR}/cluster/." "${EVIDENCE_DIR}/cluster/"
  cp -a "${COLLECTOR_DIR}/db-init/." "${EVIDENCE_DIR}/db-init/"
  cp -a "${COLLECTOR_DIR}/helm/." "${EVIDENCE_DIR}/helm/"
  # manifest.txt is the key to everything above it: without it, a reader who
  # was not present cannot tell a file the cluster had nothing to say about
  # from one the cluster refused to produce.
  cp -a "${COLLECTOR_DIR}/manifest.txt" "${EVIDENCE_DIR}/manifest.txt"

  # Exit zero says both collectors produced evidence, not that every command
  # succeeded. The failures are the manifest lines marked result=failed.
  # Capture grep's status rather than branching on it directly: grep exits 1
  # for "no failures" but 2 for "could not read the manifest", and treating
  # those alike would report a clean bundle for one nobody could open.
  # FAILED_LINES, not LINES — the shell keeps its own LINES.
  FAILED_LINES=''
  MANIFEST_GREP_RC=0
  FAILED_LINES=$(grep ' result=failed ' "${COLLECTOR_DIR}/manifest.txt") \
    || MANIFEST_GREP_RC=$?
  if [[ -n "${FAILED_LINES}" ]]; then
    printf '%s\n' "${FAILED_LINES}" >&2
    COLLECTOR_COMMAND_FAILURES=1
  elif [[ "${MANIFEST_GREP_RC}" -gt 1 ]]; then
    printf 'stop: %s could not be read (grep exit %s)\n' \
      "${COLLECTOR_DIR}/manifest.txt" "${MANIFEST_GREP_RC}" >&2
    COLLECTOR_COMMAND_FAILURES=1
  fi

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

`--output-dir`, `--namespace`, and `--release` are also accepted as flags; the
positional `DIR [NAMESPACE] [RELEASE]` form above is still supported. Every
option also takes the `--option=value` form, which is how to pass a value that
legitimately begins with `-`.

`--output-dir` **replaces** the positional evidence directory rather than
supplementing it, so passing both is a usage error naming the two forms.
Accepting both would make the first positional mean `DIR` in one invocation
and `NAMESPACE` in another, and a mistyped flag would then write the bundle to
a directory named for the namespace. Either of these is complete, and mixing
them is not:

```bash
"${COLLECTOR_COMMAND}" "${COLLECTOR_DIR}" "${NAMESPACE}" "${RELEASE}" \
  --kubectl-bin "${KUBECTL_PATH}" --helm-bin "${HELM_PATH}"

"${COLLECTOR_COMMAND}" --output-dir "${COLLECTOR_DIR}" \
  --namespace "${NAMESPACE}" --release "${RELEASE}" \
  --kubectl-bin "${KUBECTL_PATH}" --helm-bin "${HELM_PATH}"
```

Those two lines show argument shape only. Run the canonical block earlier in
this section rather than either of them on its own — a bare collector line
loses the `COLLECTOR_RC` capture and the ownership reclaim that block performs.
That block uses the positional form; either form is fine there, but do not edit
it into a mixture of the two.

Both binary options need a path to an executable regular file containing a
`/`: a bare name would be re-resolved through `PATH` when the command runs, so
the binary that executes need not be the one that was checked.
A *non-empty* value that fails either test is not a usage error — the tool is
simply unresolvable, and the run ends at exit 1 with `result=not-collected`
naming it. An *empty* value is rejected as a usage error, at exit 2, before the
evidence tree exists — which is why the pre-check above gates on `test -x`
rather than passing whatever it found straight through.

Then apply the installer gate:

```bash
if [[ "${INSTALL_RC}" -ne 0 ]]; then
  printf 'stop: installer failed with exit %s; do not continue to schema checks\n' \
    "${INSTALL_RC}" >&2
fi
test "${INSTALL_RC}" -eq 0
```

If Support approves a retry, start again with a new `RUN_ID`, `EVIDENCE_DIR`,
and `COLLECTOR_DIR`. Never reuse or overwrite the first attempt's evidence.

### If you run the collector under `sudo`

Add `sudo` to the collector line in the block above. Do not copy that line out
into a snippet of its own: the surrounding block initializes `COLLECTOR_RC`,
captures the collector's status into it, reclaims ownership, and gates on the
three counters. A standalone root invocation carries none of that, and its exit
status is silently lost — an incomplete bundle then reads as a complete one.

`sudo` replaces `PATH` with `secure_path`. On RHEL 9 that keeps `/usr/bin`,
where the packaged `kubectl` lives, but not `/usr/local/bin`, where `helm` is
installed — so `helm` is the half that disappears, and the run ends at exit 1
naming it. That is what `--kubectl-bin` / `--helm-bin` are for: their values are
expanded by your own shell before `sudo` runs, so they carry through intact.

The reclaim step matters most on the paths where something already went wrong.
It runs on every outcome, not just success, because the exit-1 branch tells you
to read `manifest.txt` — a file a root-run leaves at mode 600, owned by root.

`KUBECTL_BIN` / `HELM_BIN` environment variables do the same job, but only for
non-`sudo` invocations: `env_reset` strips them, and default RHEL 9 sudoers
refuses `sudo KUBECTL_BIN=... `. `sudo -E` preserves the environment where
sudoers grants `setenv` — the installer step above relies on exactly that — but
it does not help here, because `secure_path` still replaces `PATH` even under
`-E`. Carrying your own `PATH` through instead —
`sudo env "PATH=$PATH" ...` — also works, but it defeats `secure_path`: any
user-writable directory on your `PATH` can then supply the `kubectl`, `helm`,
or `bash` that runs as root. Prefer the explicit paths above on production
hosts. `env_reset` drops more than `PATH` — `KUBECONFIG` goes with it and
`HOME` becomes root's — so if the kubeconfig you want is not root's default,
carry it through `env` rather than as a `sudo` variable assignment:
`sudo env "KUBECONFIG=$KUBECONFIG" "${COLLECTOR_COMMAND}" ... --kubectl-bin ...`.

### Reading the manifest and the exit status

Read `manifest.txt` on every run, not only on a failure. After four header
lines (`collector=`, `collected_at=`, `namespace=`, `release=`), each
`command=` line carries that command's exit status plus an explicit `result=`:

| `result=` | Meaning |
| --- | --- |
| `collected` | Ran, succeeded, produced output; `bytes=` counts it. |
| `collected-empty` | Ran and succeeded, but there was nothing to report. |
| `failed` | Ran and failed. `bytes=` counts the command's error text, not evidence. |
| `not-collected` | Never ran; `reason=` says why (the tool was unresolvable). Its `status=127` is a stand-in, not a command's exit code. |

That distinction is the point of the manifest: it tells a reader who was not
present whether an absent answer means "nothing to report", "the cluster
refused", or "never asked". Treat a `failed` line's output as an error message,
never as evidence.

That reader is usually Support or the release owner rather than you, which is
why the merge step above copies `manifest.txt` into `${EVIDENCE_DIR}` and both
bundle lists carry it. Left behind on the operator host, the taxonomy above
would describe a file its intended audience never receives.

Exit status is symmetric across both halves of the bundle. `COLLECTOR_RC` of 1
means the bundle is **incomplete** — `kubectl` or `helm` was unresolvable, or
resolved but had every one of its invocations fail — and `manifest.txt` names
what is missing. `COLLECTOR_RC` of 2 is a usage error or an evidence path that
is unsafe to write (an existing non-empty directory, a symbolic link, or a
non-directory); correct the argument or choose a new `COLLECTOR_DIR` and re-run.
Each of those *path* refusals names the offending path, so a first attempt
that failed does not leave you deducing why the corrected one is also refused.

Whether the refusal also prints a `rm -rf` depends on what is in the way, and
the asymmetry is deliberate. When the directory holds an earlier run of this
collector — identified by its own `manifest.txt` — the refusal prints the
exact removal command, quoted so a path containing spaces pastes as-is. A
non-empty directory the collector did **not** write is never offered for
removal, however plainly it is in the way; point `COLLECTOR_DIR` at a new path
instead. That case is the mistyped `--output-dir`, and the collector may be
run under `sudo`, so it will not hand a root shell a deletion
command for data it did not create — **and neither should you.** Move or
remove such a directory yourself, deliberately and outside this runbook, or
leave it alone.

Even for a bundle the collector did write, removal is only right when you do
not intend to keep it. If the first attempt collected anything worth
preserving — in particular anything you hand-copied into the collector
bundle's own `${COLLECTOR_DIR}/installer` — choose a new `COLLECTOR_DIR` rather than clearing the old one.

Exit zero means both collectors produced evidence — it does **not** mean every
command succeeded. A run where some commands failed (a Job that does not exist,
an RBAC denial on one resource) still exits zero, prints
`warning: N collection command(s) failed` to stderr, and marks each one
`result=failed`; that is the case `COLLECTOR_COMMAND_FAILURES` catches, and it
is still a stop for Support review. `COLLECTOR_EVIDENCE_COMPLETE` must be 1 for
M1 qualification.

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

**The success condition is the transition `v1_marker_only -> at_head`, together
with a single expected head revision.** That is what `core-db-init` reports, and
it is how this procedure states success throughout. There is no schema value
`1.2` — not in `kamiwaza_schema_version`, not in `alembic_version` (whose
revisions are dated identifiers such as `20260801_007`), not from the runner,
and not from `schema-status.py`. Anyone expecting to read `1.2` somewhere will
read `1.0` instead and call a successful upgrade failed.

Required result:

- `state` is `at_head`. `core-db-init` reports the transition it performed as
  `v1_marker_only -> at_head`; this step observes only the `at_head` end of it,
  since the procedure does not run `schema-status.py` before the upgrade;
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

**Say plainly what this means: without a pre-step-4 host snapshot there is no
path back to a 1.0.0 baseline from inside this runbook.** Every in-procedure
mechanism is ruled out above — there are no downgrade migrations, a Helm
rollback leaves the schema where it is, and restoring the dump over the live
database is prohibited. A dump restore plus a Helm rollback is not equivalent
either: it leaves 1.2.0 CRDs, hook state, and extension records in place. If you
reach a failed upgrade with no snapshot, the remaining options are a
Support-owned forward fix or a rebuild — decide that with Support rather than
improvising. Take the snapshot before step 4 precisely so this paragraph never
applies to you.

### If Support approves a reset to the 1.0.0 baseline

A Support-approved reset rolls the release back and restores the dump into a
freshly created database. Two things about that sequence have already misled an
operator on a real run, both worth knowing before you start it.

**Wait for PostgreSQL before restoring.** A `helm rollback` to the 1.0.0
revision rolls the Postgres StatefulSet exactly as an upgrade does. A restore
attempted immediately afterwards fails against a database that is still coming
down:

```
psql: FATAL:  the database system is shutting down
pg_restore: error: connection to server ... FATAL: the database system is shutting down
```

An operator whose upgrade has just failed, restoring a dump they took
themselves, sees `pg_restore` fail and reasonably concludes **the backup is
bad**. That is the worst available wrong conclusion at that moment: it sends
them hunting for another recovery route while holding a perfectly good one. The
dump is intact. Gate the restore on readiness and it succeeds on the first
attempt:

```bash
PG_READY=0
for _ in $(seq 1 60); do
  if kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
       psql -U core -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then
    PG_READY=1
    break
  fi
  sleep 5
done
test "${PG_READY}" -eq 1 \
  || { echo "stop: PostgreSQL not ready after 300s; do not continue" >&2; false; }
```

**The `PG_READY` flag is the point of the block, not decoration.** A bare
`for … && break; sleep 5; done` ends with `sleep` as its last command, so on
timeout the whole loop reports success and nothing marks the failure at all.
The final `test` is what turns a timeout into a visible `stop:` line and a
nonzero status.

It cannot physically prevent the next paste — nothing in an interactive shell
can. **Read its output before continuing**, and if you are scripting this,
chain the sequence below onto it with `&&` so the timeout actually stops the
run.

On the affected host this returned after about 10 seconds — short enough that a
human typing the next command by hand usually misses the window, and short
enough that a scripted step hits it almost every time.

**Re-copy the dump after the roll.** The rollback recreates `core-postgres-0`,
so anything staged into its filesystem with `kubectl cp` beforehand is gone.
Copy it in again after the readiness gate, not before the rollback.

**Preserve the failed database before you remove it.** The rest of this section
is the one Support-approved exception to *"Preserve the failed database and
evidence first"* below — but the exception is to *replace* it, not to destroy
it. Renaming keeps the failed 1.2.0 state (and any post-upgrade writes) available
for diagnosis at no cost, and it is the only copy that exists:

```bash
# Lower-cased on purpose. An unquoted SQL identifier is folded to lower case by
# PostgreSQL, and RUN_ID always contains upper case (the `T` and `Z` of its
# timestamp) -- so building the name in mixed case would store
# `..._20260814t055333z` while every later lookup searched for
# `..._20260814T055333Z` and silently found nothing.
FAILED_DB="kamiwaza_failed_$(printf '%s' "${RUN_ID:?RUN_ID from step 1 is required}" \
  | tr -c 'A-Za-z0-9' '_' | tr 'A-Z' 'a-z')"

# Check the suffix separately: the `:?` above dies inside `$( )` only, so an
# unset RUN_ID would leave the bare, still-valid identifier `kamiwaza_failed_`
# and rename the database to it.
if test "${FAILED_DB}" = "kamiwaza_failed_"; then
  echo "stop: RUN_ID is unset; refusing to rename to a bare name" >&2
  false
else
  echo "preserving the failed database as: ${FAILED_DB}"
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    psql -U core -d postgres -v ON_ERROR_STOP=1 \
    -c "ALTER DATABASE kamiwaza WITH ALLOW_CONNECTIONS false" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
          WHERE datname = 'kamiwaza' AND pid <> pg_backend_pid()" \
    -c "ALTER DATABASE kamiwaza RENAME TO ${FAILED_DB}" \
    -c "ALTER DATABASE ${FAILED_DB} WITH ALLOW_CONNECTIONS true"
fi
```

The rename sits **inside** the `if`, not after a preceding `test`. That is the
difference between a guard and a comment: a bare `test … || { echo; false; }`
on its own line prints and returns 1, and the next pasted command runs anyway —
so the destructive rename would still execute with the bare name. This page
uses the same enclosing form for the [backup metadata stanza](#3-back-up-and-validate-the-database);
follow it for anything destructive.

The final `ALLOW_CONNECTIONS true` is what makes the preservation worth
anything: the connection block set two statements earlier survives the rename,
so without it the database you kept for diagnosis cannot be connected to.

Record the original database's settings before creating its replacement — a
`CREATE DATABASE` that inherits cluster defaults silently produces a baseline
whose encoding or collation differs from the one you backed up. Capture them
into shell variables rather than transcribing by hand:

```bash
# Tab-delimited, not space: a locale name containing a space would otherwise
# split across the wrong variables and still pass a non-empty check.
IFS=$'\t' read -r DB_ENCODING DB_COLLATE DB_CTYPE < <(
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    psql -U core -d postgres -AtF $'\t' -c \
    "SELECT pg_encoding_to_char(encoding), datcollate, datctype
       FROM pg_database WHERE datname = '${FAILED_DB}'")

test -n "${DB_ENCODING}" && test -n "${DB_COLLATE}" && test -n "${DB_CTYPE}" \
  || { echo "stop: could not read the failed database's settings" >&2; false; }
printf 'encoding=%s collate=%s ctype=%s\n' \
  "${DB_ENCODING}" "${DB_COLLATE}" "${DB_CTYPE}"
```

**If this stops, you are past the rename**, so there is no `kamiwaza` database
at the moment it fails — do not read that as a lost database. `${FAILED_DB}`
holds everything, and connections to it were re-enabled above. Two known causes:
the database uses PostgreSQL 16's ICU provider, where `datcollate` and
`datctype` can be NULL (read `daticulocale` / `datlocprovider` instead), or the
`FAILED_DB` name does not match. Resolve the values by hand from
`\l+ ${FAILED_DB}` and continue; nothing below depends on this block having
succeeded automatically.

Then create the replacement with those exact values and restore into it, one
`-c` per statement for the reasons in
[Working inside the database pod](#working-inside-the-database-pod):
`ALTER DATABASE … RENAME` and `CREATE DATABASE` cannot run inside a transaction
block, separate `-c` arguments are not wrapped in one, and a heredoc would both
fail *and* silently execute nothing while returning 0. The
`pg_terminate_backend` step above is required in practice — platform pods
reconnect during a rollback and hold the database open:

```bash
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  psql -U core -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE kamiwaza OWNER core
        ENCODING '${DB_ENCODING}'
        LC_COLLATE '${DB_COLLATE}' LC_CTYPE '${DB_CTYPE}'
        TEMPLATE template0"

# Re-stage first: the rollback rolled the pod, so any earlier staging copy is
# gone. Re-run ONLY step 3's "Stage the dump into the pod" block -- it exports
# POD_DUMP and checks the pod has room. Do NOT re-run the `pg_dump` block above
# it: `kamiwaza` was just dropped and re-created empty a few lines up, so a
# re-dump would write an empty archive over ${BACKUP_FILE} -- the only remaining
# 1.0.0 backup -- and `test -s` would still pass.
#
# No POD_DUMP default here on purpose. In a new shell the guard below aborts
# until you have re-run that block; in this same shell POD_DUMP is still
# exported and the guard passes, which is why re-running the staging block
# rather than relying on the guard is what actually re-checks capacity.
#
# That block already performed the copy and read the archive's table of
# contents, so this does not copy again -- re-uploading a multi-gigabyte dump
# would only add a second chance to fail. It asserts the staged copy is present
# and non-empty, chained to the restore so a missing one stops here.
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  test -s "${POD_DUMP:?re-run step 3 Stage the dump into the pod first, which exports POD_DUMP and stages the copy}" &&
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    pg_restore -U core --exit-on-error --no-owner --no-privileges \
    -d kamiwaza "${POD_DUMP}"
```

`TEMPLATE template0` is required whenever the encoding or locale differs from
the cluster default; it is harmless when they match.

`ON_ERROR_STOP=1` is what makes the sequence fail loudly. Without it `psql`
reports a failed statement and still exits 0, so a rename or create that did not
happen looks like success — and the `pg_restore` that follows lands on top of
whatever survived, producing "already exists" errors that read as a corrupt
dump. That is the same misdiagnosis this whole section exists to prevent.
`--exit-on-error` does the same job for the restore.

If the sequence aborts between the `ALTER … ALLOW_CONNECTIONS false` and the
rename, the database is left refusing every connection. Undo it with
`ALTER DATABASE kamiwaza WITH ALLOW_CONNECTIONS true` before diagnosing further.
After the rename has succeeded the same block re-enables connections under the
new name, so use `${FAILED_DB}` in place of `kamiwaza` from that point on.

Verify the result before declaring the reset done: `alembic_version` absent,
`kamiwaza_schema_version` reading `core | 1.0`, the expected table count, and no
`core-db-init` Jobs left in the namespace. Keep `kamiwaza_failed_*` until Support
confirms it is no longer needed; drop it only then, and only with their sign-off.

Customer operators stop here and preserve the verified backup. Any restore,
old-binary compatibility test, or production cutover requires a Support-owned
recovery plan; it is not a routine continuation of a failed upgrade. Skip the
Engineering-only rehearsal below and prepare the
[Customer support bundle](#customer-support-bundle).

For release qualification only, Engineering runs the following diagnostic
rehearsal in the disposable M1 environment. It restores the dump into a newly
created database while the active `kamiwaza` database remains untouched:

```bash
# Mixed case is safe here, unlike the reset path's FAILED_DB: `createdb` quotes
# the identifier for you, and every later use passes it to `-d`, never as a bare
# SQL identifier that PostgreSQL would fold. Do not "correct" this to match.
export RESTORE_DB="kamiwaza_restore_${RUN_ID//[^A-Za-z0-9]/_}"

kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  createdb -U core "${RESTORE_DB}"

# Re-stage first: the upgrade rolled the pod, so any earlier staging copy is
# gone. Guarded because this section runs long after step 3, often in a new
# shell -- re-run ONLY step 3's "Stage the dump into the pod" block. It
# exports POD_DUMP and checks the pod has room. Do NOT re-run the `pg_dump`
# block above it: that would overwrite ${BACKUP_FILE}, the 1.0.0 backup, with a
# dump of the already-upgraded database.
#
# No POD_DUMP default here on purpose. In a new shell the guard below aborts
# until you have re-run that block; in this same shell POD_DUMP is still
# exported and the guard passes, which is why re-running the staging block
# rather than relying on the guard is what actually re-checks capacity.
#
# That block already performed the copy and read the archive's table of
# contents, so this does not copy again -- re-uploading a multi-gigabyte dump
# would only add a second chance to fail. It asserts the staged copy is present
# and non-empty, chained to the restore so a missing one stops here.
kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
  test -s "${POD_DUMP:?re-run step 3 Stage the dump into the pod first, which exports POD_DUMP and stages the copy}" &&
  kubectl exec -n "${NAMESPACE}" core-postgres-0 -c postgres -- \
    pg_restore -U core --exit-on-error --no-owner --no-privileges -d "${RESTORE_DB}" \
    "${POD_DUMP}"
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
manifest.txt
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
manifest.txt
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
record, exactly as [Offline upgrade](#offline-upgrade) instructs. That path pins
every image to an exact, non-floating tag taken from the manifest, so the
manifest identifies the payload on its own. Record it by checksum rather than by
path — the manifest is not in the evidence file list, so a local path stops
identifying anything once the workspace is gone:

```bash
RELEASE_ORIGINATION_SHA256=$(sha256sum "${PREREQ_DIR}/release_origination.md" \
  | awk '{print $1}')
test -n "${RELEASE_ORIGINATION_SHA256}"

export INTENDED_ARTIFACT="release-origination=sha256:${RELEASE_ORIGINATION_SHA256}"
```

**Online.** Record **both** the installer's SHA-256 **and** the core image
digest the install actually resolved. Either alone is insufficient. The
installer is immutable once built, so its checksum identifies the payload
exactly — but that payload carries no Kamiwaza code. It pulls images at install
time, and the online chart resolves the core image through a floating tag with
`pullPolicy: Always`, so the tag can move between the moment you verify the
installer checksum and the moment the image is pulled.

Capture the resolved digest after the upgrade, with the same label selector used
in [Capture the metadata now](#capture-the-metadata-now-not-at-the-end), widened
to every matching pod so that a disagreement between pods is detectable rather
than invisible:

```bash
: "${INSTALLER_SHA256:?export INSTALLER_SHA256 from the online installer verification in step 4}"

CORE_POD_COUNT=$(kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-scheduler \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' \
  | sed '/^$/d' | wc -l)

CORE_IMAGE_IDS=$(kubectl get pods -n "${NAMESPACE}" \
  -l app.kubernetes.io/name=core-scheduler \
  -o jsonpath='{range .items[*]}{.status.containerStatuses[?(@.name=="core")].imageID}{"\n"}{end}' \
  | sed '/^$/d')

# Every selected pod must have reported an imageID. A pod still pending or
# starting has not resolved the tag yet, and accepting the digest now would
# finalize evidence a later-starting pod could contradict. Wait for the rollout
# to complete, then re-run this block.
test "$(printf '%s\n' "${CORE_IMAGE_IDS}" | wc -l)" -eq "${CORE_POD_COUNT}"

INSTALLED_CORE_DIGEST=$(printf '%s\n' "${CORE_IMAGE_IDS}" | sort -u)
test -n "${INSTALLED_CORE_DIGEST}"

# Exactly one distinct digest is required. More than one means the tag moved
# during the install and the pods are not running the same code. That is a
# stopped upgrade: preserve the evidence and escalate to Kamiwaza Support per
# the stop rules. Do not record a digest, do not pick one of them, and do not
# re-run the installer — a retry needs Support's approval.
test "$(printf '%s\n' "${INSTALLED_CORE_DIGEST}" | wc -l)" -eq 1

export INTENDED_ARTIFACT="installer=sha256:${INSTALLER_SHA256};core-image=${INSTALLED_CORE_DIGEST}"
```

`INSTALLER_SHA256` is exported when you verify the installer in
[Online upgrade](#online-upgrade); the `:?` above stops the run here rather than
letting an unset value ship a bundle whose installer field is empty. The two
fields are semicolon-delimited and each is `name=value`, so the pair stays
parseable in the single `intended_artifact` string the bundle contract allows.

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
: "${INTENDED_ARTIFACT:?export it per 'What intended_artifact has to record'}"
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
