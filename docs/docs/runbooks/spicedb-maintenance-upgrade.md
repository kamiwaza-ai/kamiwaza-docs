---
id: spicedb-maintenance-upgrade
title: SpiceDB maintenance upgrade
sidebar_label: SpiceDB maintenance upgrade
description: Draft maintenance and upgrade procedure for the first release that makes SpiceDB the default ReBAC backend.
drafted_by: ai
---

# SpiceDB maintenance upgrade

:::note Unreleased procedure

This draft applies to the first Kamiwaza release that makes SpiceDB the default
relationship-based access control (ReBAC) backend. That release has not yet been
assigned a version here. It does not describe the defaults or upgrade procedure
of a previously released version. Confirm the selected release and its supported
upgrade path with Kamiwaza before scheduling this change.

:::

## Draft release note

SpiceDB becomes the default authorization backend for installations with ReBAC
enabled. The supported install and upgrade procedure requires a maintenance
window with a service outage while authorization data is prepared and verified.
The Core SQL database retains the stored relationships; SpiceDB evaluates graph permissions.
Existing explicit backend selections remain configuration choices, and a graph
outage does not automatically switch the default configuration to PostgreSQL.

Plan maintenance for subsequent graph-authoritative API replica starts too,
including planned restarts and scale-out. Each starting replica repeats
preparation and can pause authorization writes and sign-in requests that
synchronize identity-provider data. This procedure does not promise upgrades or
replica replacement without an outage.

## Plan the maintenance window

Agree on the outage, the customer change owner, the Kamiwaza Support contact, and
the point at which an incomplete upgrade must move to recovery. Keep customer
traffic closed until every validation step below passes.

Rehearse the selected release against a representative copy of the site's data
and configuration. Record time for backup and restore validation, any remaining
image transfer or import, installation, authorization preparation, replica
startup, and application checks. Reserve additional time for diagnosis and the
agreed recovery procedure. Stage verified artifacts before the outage when the
installation method supports it.

Sites using mostly the supplied ReBAC relationships have less custom
authorization data to inspect and migrate. This is useful planning context, not
a measured duration or guarantee. Tenant count, existing graph data, pending
changes, resource limits, storage performance, and replica count affect the work.
Concurrent replica starts serialize preparation; adding replicas can extend the
window.

The proposed chart defaults provide failure limits, not expected completion
times:

| Boundary | Default limit | Meaning |
| --- | --- | --- |
| Schema availability | 900 seconds (15 minutes) | Wait for the required SpiceDB schema. |
| One cutover attempt | 600 seconds (10 minutes) | Acquire writer exclusion, validate SQL data, recover pending work, reconcile, and verify. |
| SQL completion barrier and SpiceDB bootstrap Jobs | 3,900 seconds (65 minutes) | Kubernetes execution deadline for the relevant release-managed Jobs. |
| Application Helm operation | 4,200 seconds (70 minutes) | Installer wait limit; site overrides may differ. |

Do not add these values to produce a maintenance estimate or treat a timeout as
proof that a process stopped. Confirm the selected package's effective values
and use the rehearsal to schedule the window. If a limit is insufficient, review
the cause and all dependent limits with Kamiwaza before changing it.

## Before maintenance

1. Confirm the exact source release, target release, installation method, chart
   values, image versions, cluster context, namespace, and desired replica counts.
   Use the selected release's supported
   [online](../installation/online_install.md) or
   [offline](../installation/offline_install_runbook.md) installation procedure.
   Do not reuse an older installer or infer release inputs from this draft.
2. Record backend selections for every namespace. Preserve explicit overrides
   unless the upgrade plan deliberately changes them. Confirm whether SpiceDB
   is managed by the installation or supplied externally, and verify its
   credentials, datastore, connectivity, and CA trust for both application
   workloads and initialization Jobs. Keep credentials in the supported Secret
   mechanism.
3. Confirm with Kamiwaza Support whether the selected release's read-only SQL
   authorization preflight can read the installed database schema, and obtain
   the supported invocation. The incoming Core package requires compatible,
   initialized SQL tables. If SQL migration must happen first, plan the supported
   all-PostgreSQL preparation phase during maintenance, then run preflight before
   enabling graph authority. Otherwise, run it before the window. For an
   existing SpiceDB or shadow deployment, also run the complete graph identity
   preflight. Resolve incompatible tuples and identity formats before cutover;
   preserve the reports.
4. Review supported group grants, nested membership, mission grants, workroom
   sharing, and group clearance grants reported by preflight. Graph evaluation
   can make stored grants effective for members where the previous SQL evaluator
   did not expand them. A passing compatibility check does not establish
   unchanged access decisions. Identify representative allowed and denied users
   and resources for the final access checks.
5. Confirm a restorable backup and a recovery plan for the site's complete
   persistent state, including the Core database and any existing SpiceDB
   datastore. Record how the compatible prior software and configuration would
   be restored. Plan the final backup after writers are stopped so that the
   recovery point matches the upgrade boundary.

## Maintenance procedure

### 1. Close traffic and stop competing work

Announce maintenance and use the site's approved ingress or access controls to
stop new customer and internal client requests. Drain requests already in
progress. Pause scheduled jobs, ingestion, automation, operator job triggers, and
other background work that can change authorization data or launch services.
Closing browser access alone does not stop these writers.

Using the release's supported maintenance controls, stop the older application
replicas and every older graph or shadow projector. Verify that their SQL
transactions and graph operations have completed and that their controllers or
automation will not restart them during the transition. Keep PostgreSQL,
SpiceDB, storage, and other dependencies needed by the installer available.

An older binary may write relationships without the new projection protocol.
It must not remain active after graph authority is enabled. If the supported
upgrade path requires old and new binaries to overlap, first use its explicit
PostgreSQL preparation stage for all namespaces, with older graph and shadow
projectors stopped. Enable graph authority only after the older binaries are
gone and preflight passes. This staged configuration is planned migration work;
it is not an automatic response to a SpiceDB failure.

Take and validate the final backup at this quiet boundary. Record the backup,
configuration, preflight reports, and the maintenance start time.

### 2. Run the supported installer

Run the selected release's installer with the approved site configuration.
Keep its initialization Jobs and new application resources enabled. Do not
scale every workload to zero or use a configuration that prevents the installer
from creating the new API replicas and bootstrap Jobs.

If the incoming preflight needs a newer SQL schema, first complete the supported
preparation phase with all namespaces explicitly on PostgreSQL and no SpiceDB
namespace overrides. Keep older graph and shadow projectors stopped. Run
preflight against the initialized schema and resolve its findings before the
graph-authoritative phase. Keep maintenance in effect across both phases.

Allow the complete installation sequence to finish, including SQL
initialization, SpiceDB datastore migration, schema initialization, baseline
seeding, and the final cutover after seeding. Check regular Jobs as well as Helm
hooks; a healthy older graph service or a successful schema wait does not prove
the migration Job succeeded.

Every new graph-authoritative API replica also prepares and verifies the graph
before becoming ready. An API replica becoming ready before final seeding does
not replace the final cutover check. Keep external traffic and paused background
work closed throughout this sequence.

If any stage fails, keep maintenance in effect and follow
[Failure and recovery](#failure-and-recovery). Do not bypass the failed stage or
repeat the installer without diagnosing the first failure.

### 3. Validate before reopening

Confirm all of the following against the selected release:

- The installer completed successfully, and the required SQL, datastore
  migration, schema, seed, and final cutover Jobs completed successfully.
- The intended API replicas are ready, workers and other authorization clients
  run the intended version and configuration, and no older writers or projectors
  remain active.
- Authorization reconciliation and readiness checks pass with no unresolved
  projection failures or missing projection receipts in the required graph
  scope. Runtime projection is active; a successful one-time cutover does not
  replace it.
- A representative administrator and standard user can sign in and use the
  resources their policies allow. Include the site's identity-provider
  synchronization configuration in these checks.
- A real policy-negative check denies a user access to a protected resource.
  A service-unavailable response is not evidence of a correct policy denial.
  Check membership and clearance cases identified during preflight.
- On a disposable resource with a suitable test user, create a grant through
  the normal application workflow, observe successful projection, and confirm
  that user's access. Revoke the grant, observe successful projection again,
  and confirm a policy denial from the same user's session. Retain the results
  and remove the test resource. This exercises ongoing projection after cutover.

Complete the [ReBAC validation checklist](../security/rebac-validation-checklist.md),
record the results and elapsed time, and obtain the change owner's confirmation
to end maintenance. Reopen traffic and resume paused work in a controlled order,
watching sign-in, authorization failures, and projection health.

## Later restarts and scale-out

Preparation repeats on every graph-authoritative API replica start, including
planned restarts and scale-out. Schedule those operations using the same
maintenance boundary and readiness checks. Existing replicas serving requests
do not make a concurrent preparation an operation without an outage.

An automatic or unplanned restart can begin preparation outside a scheduled
window. It can pause authorization writes, delay synchronized sign-in, and
require an outage while an operator restores a stable state. If preparation is
interrupted or does not finish, keep or establish maintenance and use the
recovery process below.

## Failure and recovery

Keep traffic closed and background work paused. Retain the first failed
installer output, Job status and logs, preflight reports, application startup
logs, database diagnostics, and the selected release inputs. Work with Kamiwaza
Support to identify the failed stage and affected tenant or relationship before
retrying.

An interrupted process or unreachable host can leave PostgreSQL retaining an
authorization lock until it detects the lost connection. A timeout or missing
pod does not prove that a previously issued graph write has finished. Before
any targeted cleanup of an orphaned database session, Support and the database
operator must identify its originating process or host, stop or isolate that
writer so it cannot resume graph writes, and establish that its issued graph
operations have completed. Only then may they release that exact orphaned
session. Do not terminate all database sessions or rely on a database timeout
to make graph operations safe.

After correcting the cause and establishing exclusive ownership, run the
selected release's full cutover recovery, then repeat all readiness and access
checks before reopening. Do not directly reset failed projection rows, delete
unknown graph relationships, skip identity-provider synchronization, or bypass
schema and cutover checks to get the service online.

If recovery requires rollback, keep maintenance in effect and follow the
previously agreed restore plan for compatible software, configuration, and
persistent data. Merely selecting PostgreSQL after a graph failure is not a
verified rollback. Do not reopen on a partial restore or an unverified backend
change.
An explicitly planned PostgreSQL rollback uses direct-tuple evaluation, so
group-, mission-, and workroom-inherited access can change. Include those cases
in the rollback access checks.
