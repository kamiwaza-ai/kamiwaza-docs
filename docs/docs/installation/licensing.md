# License File Installation

Every Kamiwaza installation runs with a signed **license file** issued by Kamiwaza.
This page covers installing the file on a cluster, confirming the platform sees it,
rotating it, and what the startup messages mean. It applies to every install path
(online, offline, and chart-only). The license *key* used to download images (see
[Online Installation](online_install.md)) is a separate credential from the license
*file* described here.

## What the license file is

- A single file, `license.lic`, issued to your organization by Kamiwaza.
- Signed. The platform verifies the signature at startup with a key built into the
  Kamiwaza images. Nothing is sent to Kamiwaza and no network access is needed to
  validate it, so it works in air-gapped environments.
- Carries who the license was issued to, the edition, and an optional expiry date
  for the commercial term.

Do not edit the file. Any change to its contents, including a stray newline added
during copy-paste, invalidates the signature.

If you do not have a license file, contact your Kamiwaza representative or get in
touch at https://www.kamiwaza.ai/contact.

## Install the license file

**1. Create a Secret from the file.** The Secret must contain exactly one key named
`license.lic`:

```bash
kubectl create secret generic kamiwaza-license \
  --namespace kamiwaza \
  --from-file=license.lic=./license.lic
```

**2. Point the chart at the Secret.** Which key you use depends on which chart you
install. The platform installers and Helmfile deploy the `kamiwaza` umbrella chart,
where core's values are nested under `core:`:

```yaml
core:
  license:
    existingSecret: kamiwaza-license
```

Installing `charts/core` on its own instead? Use the same block without the `core:`
nesting. Everywhere below that shows a `core:` key, the same rule applies.

Then install or upgrade as usual. Kamiwaza mounts the Secret as a whole directory at
`/app/licenses` (the `core.license.mountPath` default) and reads
`/app/licenses/license.lic`. Keep the directory mount: a `subPath` mount would never
receive a rotated license.

Separately from the license file, the chart requires the EULA to be accepted before
it renders anything: set `global.eula.accepted: true` in your values (the platform
installers record this for you when they run; if a chart install stops with an EULA
message, this value is what it is asking for).

### Enforcement

**A license is required.** Kamiwaza core runs the check at startup and refuses to
start on any license problem listed under [Troubleshooting](#troubleshooting). A
passed commercial term is not one of them — see
[Verify the license is active](#verify-the-license-is-active).

This is the chart default (`core.license.enforce: true`, which sets the environment
variable `KAMIWAZA_LICENSE_ENFORCE=1`); you do not need to set it.

Fresh installs take this immediately. An **already-installed release keeps whatever
it last rendered until you upgrade the chart**, so an existing cluster does not begin
enforcing at the moment you read this — it begins at its next chart upgrade.

There is one exception, and it exists only to make upgrades possible. An
installation that predates licensing has no Secret to read, so it would stop on
its next restart. To upgrade such an install onto a licensed image before its
license file is in place:

```yaml
core:
  license:
    enforce: false
```

Core then runs the same check, logs the condition, and continues. **This is an
upgrade affordance, not a supported way to run Kamiwaza.** Set
`core.license.existingSecret` and remove `enforce: false` as soon as you have the
file.

`core.license.enforce` is deliberately independent of `core.license.existingSecret`
in both directions:
supplying a license does not switch enforcement on, and removing one does not
switch it off.

## Verify the license is active

Every API response from the platform carries two headers:

| Header | Values |
|---|---|
| `x-kamiwaza-license-state` | `valid`, `expiring` (term ends within 30 days), or `expired` |
| `x-kamiwaza-license-expires` | The term end date as `YYYY-MM-DD`; absent when the license has no expiry |

```bash
curl -sI https://<your-kamiwaza-host>/api/ | grep -i x-kamiwaza-license
```

The web UI shows the same information: an amber banner when the term ends within
30 days (dismissible), and a red banner once it has ended. **An expired commercial
term never stops the platform.** The banner is the only effect; contact your
Kamiwaza representative to renew.

If no license headers are present, you are most likely querying a path that does not
go through the Kamiwaza API. The other possibility is an install running with
`enforce: false` that started without a license — check the startup message in the
`core-scheduler` pod logs.

## Rotate or renew a license

1. Replace the Secret's contents with the new file:

   ```bash
   kubectl create secret generic kamiwaza-license \
     --namespace kamiwaza \
     --from-file=license.lic=./license.lic \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. Change `rolloutKey` to any new value (a date works) so the scheduler pod
   restarts and re-reads the file:

   ```yaml
   core:
     license:
       existingSecret: kamiwaza-license
       rolloutKey: "2026-09-01"
   ```

3. Make sure the model-serving layer is redeployed on that restart. The chart does
   this by default (`core.rayServe.forceRedeployOnStartup: true`, which sets
   `KAMIWAZA_FORCE_SERVE_REDEPLOY=1` for core). If you have set it to `false`, turn it
   back on for this upgrade: the scheduler otherwise leaves a healthy serving
   deployment alone, and the serving layer keeps reporting the **old** license state
   even though the new file was accepted. A renewal that "did not take" in the banner
   is almost always this.

4. Re-check the `x-kamiwaza-license-*` headers.

## Troubleshooting

When the license check fails, the `core-scheduler` pod log contains one block that
starts with `License check failed (<condition>)`, names the file path it looked in,
and ends with a `Condition:` line you can search for. Core then exits, and the API
stops serving with it: on refusal the platform also retires the Ray Serve
application, so you lose the API as well as the scheduler. If the install is using
the `enforce: false` upgrade affordance described above, the same block is logged as
a warning and the platform continues.

| Condition | Meaning | What to do |
|---|---|---|
| `license_file_missing` | No file at `/app/licenses/license.lic` | Create the Secret with key `license.lic` and set `core.license.existingSecret`, or request a license |
| `license_file_unreadable` | The file exists but could not be read | Check the Secret holds the complete file and is mounted as a directory, not a `subPath` |
| `license_tampered` | The signature does not verify | The file was modified or truncated in transit. Request a fresh copy; do not edit license files |
| `license_wrong_account` | Issued by a different vendor account | This file is not a Kamiwaza-issued license |
| `license_wrong_product` | Issued for a different Kamiwaza product | Check which product the file was issued for and request the right one |
| `license_suspended` | The license has been suspended by Kamiwaza | Contact Kamiwaza licensing support |
| `license_file_stale` | The signed file itself carries an expiry that has passed (distinct from the commercial term, which never blocks startup) | Request a re-issued file |
| `license_claims_invalid` | A field in the file is malformed, or the file uses a newer format than this Kamiwaza version understands | If the message says the file's schema version is above the maximum this build supports, upgrade Kamiwaza or request a file issued for your version; for any other detail, request a re-issued file — upgrading will not help |
| `license_gate_misconfigured` | The image itself is missing its built-in trust data | Redeploy a correctly published Kamiwaza image; changing the license file cannot fix this |

There is deliberately no `license_expired` condition: an ended commercial term is
reported through the headers and banner above, never through the startup check.

## Getting a license

Contact your Kamiwaza representative, or get in touch at
https://www.kamiwaza.ai/contact. Deliver the returned `license.lic` to the cluster
as described above; it does not need to be placed anywhere else.
