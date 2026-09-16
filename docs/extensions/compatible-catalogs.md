---
title: Compatible Extension Catalogs
sidebar_label: Version Compatibility
---

# Compatible Extension Catalogs

:::caution Unreleased, coordinated rollout required
This page describes the coordinated extension-selection changes to Core, the SDK
publisher, shared publishing workflow, and Helm catalog packaging. It does not
announce availability in an existing released Core build. Install the companion
changes before enabling the new catalog generation.
:::

## Availability and selection

An installation keeps three distinct records:

| Record | Meaning | What changes it |
| --- | --- | --- |
| Shipped baseline | Exact extension releases packaged with this Core release | A separately identified Core release baseline |
| Available releases | Retained published releases and their compatibility/status | Catalog refresh or explicit offline import |
| Local selection | Release used for subsequent deployments | Explicit administrator action |

A connected installation can discover compatible extension releases published
after its Core release, including entirely new extensions. It does not need a
new Core release for each discovery. **Check for updates** refreshes availability;
it does not change selections or deployments. An unavailable online source does
not erase locally retained records or replace a selected release.

The shipped baseline remains an immutable reference. Baseline membership and
release provenance must be distinguished from a publisher's declaration of
compatibility. Declaring a version range does not certify every combination in
that range.

## Administrator selection controls

The catalog shows the selected release and latest compatible release separately,
for example: `DDE Tool | Selected: 1.1.0 | Available: 1.1.2`.

- **Update** selects the displayed compatible target for new deployments.
- **Choose version** selects a retained compatible release, including the shipped
  baseline or a later compatible release.
- **Update all** previews the exact changes to existing selections and requires
  confirmation. It does not add newly discovered extensions. A stale or invalid
  proposal must be reviewed again; confirmation cannot silently choose a different
  release.
- Newly discovered extensions appear separately with **Add**.
- Extensions outside the shipped baseline support **Remove selection**. This
  removes their selection for new deployments and preserves existing deployments.

Selection changes require administrator privileges, enforced by both the API and
UI. Other authorized users can inspect availability. Release notes are omitted
until the catalog provides a supported target.

**Applies to new deployments.** Existing deployments retain their effective
artifacts and settings, including when they restart. Selection rollback does not
roll back running services, their databases, or their data. It does not require
deleting templates or retiring existing workloads.

The legacy image-only **Upgrade running deployments** operation does not support
catalog-managed deployment snapshots. It rejects those deployments instead of
creating a mismatch between the running workload and its restart configuration.
Use a separately planned deployment replacement when changing running services.

A missing, withdrawn, or incompatible selected release remains visible with its
status. A release omitted from an online listing can still be explicitly chosen
from retained immutable bytes; it is labeled unlisted and is not proposed by
Update all. Explicit withdrawal is a separate blocked state. Core must not
substitute a different release. Resolve the condition or
explicitly choose a permitted release before creating a new deployment.
Withdrawal remains blocked even if a later listing omits or relists the release;
there is no automatic reinstatement. Changing the online source retires the old
source's update candidates while retaining their bytes for explicit selection.
Invalid or conflicting online rows are quarantined with a visible warning so they
do not prevent discovery of valid new releases. Explicit imports remain atomic.

Selection changes preserve the installation's risk floor and resource sizing,
but invalidate approval of the previous artifact. An administrator must review
the newly selected artifact where local governance requires approval. Managed
catalog releases cannot be replaced through developer overlays; use a separate
custom template name for local builds.

## Declare a Core requirement

Use `kamiwaza_version` in `kamiwaza.json`, independently of the extension's own
`version`. These fields describe extension 1.1.2 requiring Core 1.3.1 or newer:

```json
{
  "name": "example-extension",
  "version": "1.1.2",
  "kamiwaza_version": ">=1.3.1"
}
```

This is a metadata excerpt, not a complete manifest. `kz_ext_version` separately
constrains the SDK CLI.

Requirements accept numeric `major.minor[.patch]` versions with `>=`, `>`, `<=`,
`<`, `==`, `!=`, bare equality, and comma-separated AND clauses, such as
`>=1.3.0,<1.4.0`. Missing, null, empty, and whole `*` requirements preserve legacy
unrestricted semantics; they are not certification evidence. Malformed clauses,
nonstring values, `~=`, and partial wildcards such as `==1.*` are rejected.

Extension releases use semantic version precedence. New publication uses complete
`major.minor.patch` versions; prerelease identifiers order according to SemVer,
and build metadata does not increase precedence. Legacy imported choices retain
their original content and provenance rather than being silently rewritten.
Automatic update proposals and development baseline projection exclude prereleases.
Administrators can explicitly choose compatible retained prereleases. If distinct
build identities tie for latest precedence, choose an exact release explicitly.

For example:

| Extension release | Core requirement | Discoverable on |
| --- | --- | --- |
| 1.1.0 | `>=1.3.0` | 1.3.0, 1.3.1, 1.4.0 |
| 1.1.2 | `>=1.3.1` | 1.3.1, 1.4.0 |
| 1.2.0 | `>=1.4.0` | 1.4.0 |

An installation selecting 1.1.0 keeps that selection when 1.1.2 or 1.2.0 becomes
available. Its administrator decides whether to update. These are compatibility
examples, not results from qualification of released builds.

## Immutable publication

Configure a scoped publish profile for an isolated registry and catalog, then
publish with `kz-ext publish --stage isolated --catalog-schema compat-v1`.
The SDK profile stage is separate from Core's reader-stage setting.

The history-preserving generation uses `garden/compat-v1/apps.json` for apps and
services, and `garden/compat-v1/tools.json` for tools. Publication retains earlier
versions, including maintenance releases, and preserves compatibility metadata.
Conditional object writes protect concurrent publishers.

A published release identity and its payload are immutable. Republishing identical
content is idempotent. Changing artifacts, compatibility requirements, or other
release metadata requires a new version; `--force` cannot overwrite an existing
`compat-v1` release. Runtime image references must be digest-pinned, including
external/prebuilt services and declared supporting images. A pinned catalog entry
with a mutable image tag does not satisfy artifact immutability. Registry retention
must keep referenced artifacts available; Core never substitutes a newer image
when an exact artifact is missing.

The shared extension workflow requires the SDK's conditional-write and immutable
publication capabilities for `compat-v1`. Legacy v2/v3 publication remains a
separate contract. Do not point older writers at the immutable generation or assume
that existing Core releases gain these capabilities without the coordinated update.

## Shipped catalog and offline use

Helm supplies the packaged baseline independently of the connected availability
source. Online catalogs and operator-imported catalogs do not redefine which
releases shipped with Core. Snapshot generation preserves multiversion availability
separately from the exact baseline projection.

Offline installations use their shipped baseline and explicitly imported available
releases. Importing availability does not silently select releases. Administrators
use the same explicit selection controls afterward. Restart and repeated Helm
initialization preserve selections, including removed selections.
Combined offline imports must preserve both the `releases` array and the
`template_types` mapping from `available-releases.json`; the mapping identifies
apps, services, and tools without rewriting immutable release payloads.

An absent, invalid, or mismatched shipped baseline produces a visible initialization
error. Core preserves existing selections and deployments, and refuses selection
changes until the matching immutable baseline is repaired. A fresh installation
waiting for its baseline initializes once after repair; later repairs cannot
resurrect an explicitly removed selection.

Chart publication requires `--expected-core-version` independently of the chart
candidate version and verifies the frozen baseline before running Helm. Active
Kajiya chart preparation obtains that expected version from the locked Core Git
blob and records its hash. Qualification must still check the exact installed
image's runtime version, particularly when a nightly image producer predates the
locked source. Packaging never relabels or regenerates the shipped set silently.

Migration captures existing imported choices before any availability refresh can
change them. It preserves local/developer templates separately. Legacy mutable
artifacts retain legacy provenance; migration does not retrospectively prove their
immutability or reconstruct lost historical deployment content.

For a private test source, Core's LOCAL catalog mode accepts a trusted HTTPS root
or a `file:///absolute/catalog/root` accessible to Core workers. Plain HTTP catalog
origins are rejected. Keep production catalogs untouched when qualifying a new
publisher or reader.

The active installation path is Helm/KKS. These selection controls do not require
modifying legacy Kajiya bundle-import behavior or replacing canonical owner
manifests with another writable inventory.

## Verify behavior

Qualification should demonstrate discovery without selection changes, explicit
administrator updates, an exact update-all preview, selection rollback, persistence
across restart, offline import, and preserved migrated choices. Inspect actual
artifact digests of both new and existing deployments, including existing
workloads after restart/reconciliation. Include nonadministrator denial and
conflicting release-publication tests.

When testing with straw Core identities such as 1.3.0, 1.3.1, and 1.4.0, report
those as simulated compatibility-version tests on the actual installed build.
They are not proof that those released Core builds were installed or certified.
