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

If you do not have a license file, contact your Kamiwaza representative or request
one at https://www.kamiwaza.ai/license.

## Install the license file

**1. Create a Secret from the file.** The Secret must contain exactly one key named
`license.lic`:

```bash
kubectl create secret generic kamiwaza-license \
  --namespace kamiwaza \
  --from-file=license.lic=./license.lic
```

**2. Point the chart at the Secret.** In your values file:

```yaml
license:
  existingSecret: kamiwaza-license
```

Then install or upgrade as usual. Kamiwaza mounts the Secret as a whole directory at
`/app/licenses` (the `license.mountPath` default) and reads
`/app/licenses/license.lic`. Keep the directory mount: a `subPath` mount would never
receive a rotated license.

Installer-driven installs also require accepting the EULA (`--accept-eula` on the
installer, or `global.eula.accepted=true` for chart-only installs); the chart refuses
to render anything until acceptance is recorded.

### Enforcement

Supplying a license file does **not** by itself make a missing or invalid license
fatal. The check always runs at startup, but by default the platform runs in
**report-only** mode: it logs the result and continues, so an existing installation
can be upgraded before a license file is in place. To make the check fatal:

```yaml
license:
  existingSecret: kamiwaza-license
  enforce: true
```

With `enforce: true` (environment variable `KAMIWAZA_LICENSE_ENFORCE=1`), Kamiwaza
core refuses to start on any license problem listed under
[Troubleshooting](#troubleshooting). A passed commercial term is not one of them.

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

If no license headers are present, the platform started without a license (see the
startup message in the `core-scheduler` pod logs) or you are querying a path that
does not go through the Kamiwaza API.

## Rotate or renew a license

1. Replace the Secret's contents with the new file:

   ```bash
   kubectl create secret generic kamiwaza-license \
     --namespace kamiwaza \
     --from-file=license.lic=./license.lic \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. Change `license.rolloutKey` to any new value (a date works) so the scheduler pod
   restarts and re-reads the file:

   ```yaml
   license:
     existingSecret: kamiwaza-license
     rolloutKey: "2026-09-01"
   ```

3. For that upgrade, also set `KAMIWAZA_FORCE_SERVE_REDEPLOY=1` in the core
   environment. The scheduler normally leaves a healthy model-serving deployment
   alone, so without this the serving layer keeps reporting the **old** license
   state even though the new file was accepted. A renewal that "did not take" in the
   banner is almost always this step.

4. Re-check the `x-kamiwaza-license-*` headers.

## Troubleshooting

When the license check fails, the `core-scheduler` pod log contains one block that
starts with `License check failed (<condition>)`, names the file path it looked in,
and ends with a `Condition:` line you can search for. In report-only mode the block
is a warning and the platform continues; with enforcement on, core exits.

| Condition | Meaning | What to do |
|---|---|---|
| `license_file_missing` | No file at `/app/licenses/license.lic` | Create the Secret with key `license.lic` and set `license.existingSecret`, or request a license |
| `license_file_unreadable` | The file exists but could not be read | Check the Secret holds the complete file and is mounted as a directory, not a `subPath` |
| `license_tampered` | The signature does not verify | The file was modified or truncated in transit. Request a fresh copy; do not edit license files |
| `license_wrong_account` | Issued by a different vendor account | This file is not a Kamiwaza-issued license |
| `license_wrong_product` | Issued for a different Kamiwaza product | Check which product the file was issued for and request the right one |
| `license_suspended` | The license has been suspended by Kamiwaza | Contact Kamiwaza licensing support |
| `license_file_stale` | The signed file itself carries an expiry that has passed (distinct from the commercial term, which never blocks startup) | Request a re-issued file |
| `license_claims_invalid` | A field in the file is malformed, or the file uses a newer format than this Kamiwaza version understands | If the message names a schema version, upgrade Kamiwaza or request a file for your version; otherwise request a re-issued file |
| `license_gate_misconfigured` | The image itself is missing its built-in trust data | Redeploy a correctly published Kamiwaza image; changing the license file cannot fix this |

There is deliberately no `license_expired` condition: an ended commercial term is
reported through the headers and banner above, never through the startup check.

## Getting a license

Contact your Kamiwaza representative, or request a license at
https://www.kamiwaza.ai/license. Deliver the returned `license.lic` to the cluster
as described above; it does not need to be placed anywhere else.
