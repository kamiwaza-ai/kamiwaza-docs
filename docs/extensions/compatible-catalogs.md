---
title: Compatible Extension Catalogs
sidebar_label: Version Compatibility
---

# Compatible Extension Catalogs

:::caution Unreleased, coordinated rollout required
This describes the `compat-v1` implementation across Core, the SDK publisher,
shared publishing workflow, deploy tooling, and Kajiya. Install the companion
changes before enabling it. Existing catalog defaults remain unchanged; this
page does not announce availability in a released Core version.
:::

## Declare a Core requirement

Use the existing `kamiwaza_version` field in `kamiwaza.json`, independently of
an extension's own `version`. For example, these metadata fields describe
extension 0.4.0 requiring Core 1.3.1 or newer:

```json
{
  "name": "example-extension",
  "version": "0.4.0",
  "kamiwaza_version": ">=1.3.1"
}
```

This is a metadata excerpt, not a complete extension manifest. `kz_ext_version`
separately constrains the SDK CLI and does not declare Core compatibility.

Core requirements accept numeric `major.minor[.patch]` versions with `>=`, `>`,
`<=`, `<`, `==`, `!=`, bare equality, and comma-separated AND clauses, such as
`>=1.3.0,<1.4.0`. Missing, null, empty, and whole `*` requirements preserve
unrestricted legacy compatibility. Invalid syntax, nonstring values, empty comma
clauses, `~=`, and partial wildcards such as `==1.*` are rejected. Core
prerelease/build text is outside this numeric requirement grammar.

## Select the highest compatible release

For each exact extension name, Core filters by its running numeric version and
selects the highest compatible extension release. Apps and services share the
apps catalog; tools use the tools catalog. Selection uses Python
`packaging.version.Version`, including development, prerelease, and post-release
ordering; `1.0` and `1.0.0` identify the same release. Keep preview releases in the
intended stage catalog: a later prerelease can rank above an older final release.

For example, suppose a catalog contains these extension releases:

| Extension release | Core requirement |
| --- | --- |
| 0.3.0 | `>=1.3.0` |
| 0.4.0 | `>=1.3.1` |
| 0.5.0 | `>=1.4.0` |

Core 1.3.0 selects 0.3.0, Core 1.3.1 selects 0.4.0, and Core 1.4.0 selects 0.5.0.
If extension 0.6.0 is subsequently published with `>=1.3.1`, Core 1.3.0 keeps
0.3.0 while both newer Core versions select 0.6.0. A name with no compatible
release is ignored. These are selection examples, not release certifications.

Identical duplicate declarations collapse. Different payloads for the same
normalized extension version reject the entire name, even if one declaration
is incompatible. Online sync quarantines malformed records and reports filtered
entries, including superseded releases, incompatibilities, and conflicts.
Missing extension versions retain the legacy 1.0.0 default; explicitly invalid
versions do not.

Selection applies to cached listings and fresh sync. Existing template identity,
local-overlay, active-deployment, and no-downgrade policies still govern updates;
a selected catalog row is not an unconditional replacement of local state.
A sync can advance the persisted template to a newly selected release while an
already running workload continues using its deployed release. A new deployment
of a stored template with an explicit incompatible or malformed requirement is
blocked, including after a Core rollback. Unconstrained legacy templates remain deployable.

Setting `enable_template_version_filtering=false` skips the Core-requirement
eligibility check during catalog selection. It still selects the highest valid
extension release deterministically, and does not disable the independent
compatibility guard for new deployments.

## Publish and enable the separate generation

Configure a named publish profile called `isolated` with your test registry,
catalog endpoint, bucket, and scoped credentials, then opt in with
`kz-ext publish --stage isolated --catalog-schema compat-v1`. The required
`--stage` selects that SDK publish profile; it is separate from Core's reader-stage
setting below. The shared `.github/workflows/extension-build.yml` workflow accepts
`catalog-schema: compat-v1` and checks the SDK's `catalog-capabilities` output for
generation support and `compat-v1-cas` before both image builds and publication.
Defaults remain legacy v3; v2 publishing remains available. CI's latest-run policy
can skip unpublished commits; history retention applies to releases that reached
the catalog, not every commit submitted to CI.

The new generation stores apps/services and tools under
`garden/compat-v1/apps.json` and `garden/compat-v1/tools.json`. Each distinct
name/version is retained, including older maintenance releases and unconstrained
fallbacks. `--force` replaces only the matching release. The publisher preserves
compatibility metadata and uses conditional object writes to avoid overwriting
concurrent changes; unsupported conditional operations fail closed.

Configure upgraded Core readers with
`KAMIWAZA_EXTENSION_CATALOG_VERSION=compat-v1`. Connector definitions retain their
separate legacy contract and are still read from `garden/v3/connectors.json`.
Do not point old readers or legacy writers at the new generation. Scope publishing
credentials to the intended prefix and qualify against an isolated catalog before
production rollout; no production migration is automatic. For an isolated source,
set `KAMIWAZA_EXTENSION_STAGE=LOCAL` (uppercase; lowercase `local` falls back to
PROD) and `KAMIWAZA_EXTENSION_LOCAL_STAGE_URL` to a trusted HTTPS catalog root or a
`file:///absolute/catalog/root` accessible to Core workers. Core intentionally
rejects plain HTTP catalog origins; install the test CA trust when using private
HTTPS.

## Offline bundles and verification

Deploy's `scripts/update-offline-extension-catalog.py` selects a compact catalog
for `--target-core-version` before embedding it in the offline chart. With
`--source-catalog-version compat-v1`, it reads full release history but still
writes compact `garden/v3` output. Configure readers for the generation actually
served: `compat-v1` for full history, `v3` for this selected offline snapshot.

Kajiya's `scripts/import-extension-catalog.sh` selects only from releases supplied
to the bundle; it does not expand a pinned set from an online catalog. It resolves
the complete supplied catalog before writes and aborts on malformed releases or
conflicting declarations.

The modern Kajiya importer requires Core's authenticated
`GET /api/apps/remote/compatibility` endpoint, which returns the running
`kamiwaza_version`. Upgrade Core first, **even for modern bundles using
`garden/v3`**. An absent endpoint or unusable version aborts before template
mutations; there is no guessed version or live override. The combination
`--dry-run --no-auth --target-kamiwaza-version 1.3.1` is for offline inspection
only and does not bypass authentication for live imports.

The explicit frozen 0.13.5/v3 bundle lane preserves its legacy importer without
runtime discovery. Its trusted `bundle-manifest.json` must contain the exact
`import_policy` object
`{"lane":"frozen-0.13.x","kamiwaza_version":"0.13.5","catalog_version":"v3"}`.
The entrypoint validates this marker before dispatching to the frozen importer;
it is not an operator version override or an HTTP-error fallback. Unmarked
bundles still require discovery, and malformed policies abort before contacting
Core.

Verify the reported runtime version, selected remote rows, persisted template
identity after repeat sync, ignored future-only releases, and the identity of an
actually deployed artifact. A synthetic Core version qualifies the selection
algorithm; compatibility metadata alone does not certify an extension/Core pair
or replace a certified extension set.

## Recover after a Core rollback

Catalog sync does not downgrade a persisted template. If its requirement now
blocks a new deployment, preferably restore a compatible Core version. For an
explicit replacement, plan an interruption, preserve needed workload and data
configuration, retire dependent deployments, then delete the template through
the admin API and sync or import a compatible release. Active dependencies block
deletion; deleting the template can also remove stopped deployment records. The
replacement can receive a new template ID. This procedure does not automatically
migrate workloads or data, and sync alone is insufficient.
