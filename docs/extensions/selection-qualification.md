---
title: Extension Selection Qualification
sidebar_label: Selection Qualification
---

# Explicit extension selection qualification

This change was exercised on an isolated full Kamiwaza installation with k0s/KKS,
PostgreSQL, Keycloak, SpiceDB, the normal API/frontend, and task-owned Moto catalog
storage. No production Cloudflare catalogs were written.

The installed candidate uses simulated canonical Core identities 1.3.0, 1.3.1,
and 1.4.0. These are actual instance/API/browser/workload tests, **not** tests of
released binaries bearing those versions or certification of those combinations.

## Automated regression coverage

- Combined Garden, semantic-version, database, Istio routing, setup/audit and route-auth coverage: **4,316 passed, 8 skipped**.
- SDK extension suite: **2,303 passed, one BSD-sed platform skip**.
- Shared-workflow contracts: **233 passed**. Active Kajiya workflow contracts: **38 passed**, plus 8 baseline identity tests. Deploy baseline/publication tests: **147 passed**, plus **20 tenant namespace contract tests**.
- Focused frontend deployment/selection suites: 106 passed before final review;
  final garden component suite: 18 passed. Production webpack build passed.
- Shared SemVer corpus covers numeric ordering, prereleases, build identities,
  malformed identities, and legacy normalization consistently across Core/SDK/Deploy.
- Canonical migration `20260916_016` adds durable catalog state and widens template
  version storage. SQLite initialization is separately exercised.

## Working-instance cases

| Simulated Core | Shipped fixture | Latest compatible fixture | New extension |
| --- | --- | --- | --- |
| 1.3.0 | 0.3.0 | 0.7.0 | 1.0.0 |
| 1.3.1 | 0.4.0 | 0.8.0 | 1.1.0 |
| 1.4.0 | 0.5.0 | 0.9.0 | 1.1.0 |

Each case exercised availability refresh without selection changes, explicit
updates, exact update-all preview/confirmation, atomic stale-preview rejection,
baseline selection rollback, separate Add, deployment of selected exact artifacts,
and removal without deleting an existing deployment. Existing workload UIDs,
specs, resolved image digests, and HTTP version responses were compared.

Additional executed checks include persistent selections across Core restarts,
real catalog outage with retained availability, immutable SDK publication under
conditional-write conflicts, rejection of payload/digest rewrites, nonadmin 403s,
terminal withdrawal after omission/republication, and admin-only governance changes.
The actual PostgreSQL barrier test checks selection/overlay admission ordering in
an isolated schema and removes that schema afterward.

The real UI exercised Update, Choose version/baseline rollback, Add, and confirmed
Update all. The read-only account sees selected/latest state without mutation
controls. Release notes are omitted. Legacy/imported duplicate version labels
carry distinct provenance and identity.

Existing-deployment recovery was exercised through Core's internal recovery path:
a deployment originally on 0.9 was recreated while the installation selection was
0.5. It retained its database identity, frozen runtime-artifact hash, exact image
and HTTP version while receiving a new Kubernetes workload UID. This is an
internal recovery test; there is no public restart endpoint implied by it.

## Evidence and qualification checkpoints

The fresh offline installation and repeated three-version matrix passed. The
matrix ran on Core source commit `f19983b8a778015b9547f76820b75c4e3a15b2a7`.
Subsequent review fixes received targeted live checks and source-hash verification;
the [Core implementation PR](https://github.com/kamiwaza-internal/kamiwaza/pull/2842)
records each checkpoint separately and links the retained machine-readable
receipt. The full matrix is not relabeled as a later-commit run.
Credentials, tokens and private database backups are excluded from those artifacts.

## Known validation limits

These tests exercise purpose-built extension fixtures on an isolated instance.
License enforcement was disabled in the isolated test installation. These tests
do not certify third-party extension behavior, data migrations, or actual
released Core builds. The publisher preserves immutable catalog payloads and
uses digest-qualified artifacts; registry operators must retain those artifacts.
