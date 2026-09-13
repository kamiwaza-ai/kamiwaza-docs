---
id: database-schema-lifecycle
sidebar_position: 4
---

# Database Schema Lifecycle

Kamiwaza v1.0 adds a bounded database schema anchor for PostgreSQL-backed installs. This is a safety foundation for future migrations, not the full migration platform.

The v1.0 contract is:

- Fresh supported installs initialize the database through the normal deployment path.
- The core database is stamped as the supported v1.0 schema floor.
- Startup fails closed if the database advertises an unknown or newer schema version.
- Downgrading a stamped database below v1.0 is not supported.
- Full migration runner behavior is deferred to the v1.1 migration platform.

## Supported Initialization Path

For PostgreSQL-backed Kubernetes installs, the supported initialization gate is the `core-db-init` Helm hook. The hook runs the core image initializer at `/app/scripts/db-init.py` before scheduler startup.

During v1.0 initialization, the initializer creates or verifies the `kamiwaza_schema_version` table and records the core schema marker:

| Field | Expected value |
| --- | --- |
| `schema_name` | `core` |
| `version` | `1.0` |

The stamp operation is idempotent. Re-running the supported init path against a database already marked as `core=1.0` should leave the marker in place and continue.

## Baseline Snapshot

v1.0 also includes a frozen, PostgreSQL-compatible baseline snapshot for the core database schema. The snapshot is the canonical floor that future v1.1 migration tooling can use without reconstructing all pre-v1.0 schema history.

The baseline covers tables owned by the v1.0 core initialization path, including the schema marker table. Lite-mode SQLite metadata is excluded from this PostgreSQL baseline.

Normal post-v1.0 schema changes should not rewrite the accepted v1.0 baseline. Treat changes after the baseline as migration work for the migration platform.

## Failure Behavior

Kamiwaza must not blindly run schema initialization against a database owned by a newer or unrecognized binary. If the database contains a `kamiwaza_schema_version` row for `core` with a version other than `1.0`, v1.0 treats that state as unsupported and fails startup or initialization with an actionable error.

Common meanings:

| Database state | v1.0 behavior |
| --- | --- |
| No marker on a fresh supported install | Initialize schema and stamp `core=1.0` |
| Existing `core=1.0` marker | Continue; the marker is known |
| Existing `core` marker with a future or unknown version | Fail closed; do not run blind initialization |

If a deployment fails because the database is ahead of the running binary, do not downgrade the application onto that database. Restore the matching application version, restore from a compatible backup, or contact Kamiwaza support for the correct recovery path.

## Downgrades

Downgrading a database stamped by v1.0 to an application version below v1.0 is unsupported. Pre-v1.0 binaries do not understand the v1.0 schema anchor and should not be used as a rollback target for a stamped PostgreSQL database.

For rollback planning, keep backups aligned with the application release you are rolling back to. A database backup taken after the v1.0 stamp should be restored only with a version that understands that schema state.

## What Moves to v1.1

The v1.0 schema anchor is intentionally narrow. These items are not part of the v1.0 database lifecycle contract:

- full Alembic migration runner
- v1.0-to-v1.1 migration scripts
- downgrade or rollback migration tooling
- broad migration rehearsal CI
- operator live-upgrade runbook
- schema status API
- SQLite/lite-mode migration platform coverage

Those items belong to the v1.1 database migration platform.

## Operator Checks

After install or upgrade, operators can verify the anchor by inspecting the core PostgreSQL database for the marker row:

```sql
SELECT schema_name, version
FROM kamiwaza_schema_version
WHERE schema_name = 'core';
```

The expected v1.0 result is:

```text
schema_name | version
core        | 1.0
```

If the table or row is missing after a supported PostgreSQL install has completed successfully, collect the `core-db-init` job logs and contact Kamiwaza support before retrying with ad hoc database changes.
