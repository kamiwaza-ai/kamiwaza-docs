# Online Installation

The online installer is the recommended way to install Kamiwaza on an internet-connected host. It is a single self-contained script that bundles the deploy payload, playbooks, and Helm chart dependencies. Host tools are installed from your OS package manager, and the Kamiwaza platform images are pulled from Keygen.

**Supported hosts:**

- Ubuntu 22.04
- Ubuntu 24.04
- RHEL-compatible 9.x
- macOS

## Prerequisites

- A **Kamiwaza Prod license key**. The installer script is publicly downloadable, but a license key is required to pull the platform images. Contact your Kamiwaza representative if you do not have one.
- A host that meets the [System Requirements](system_requirements.md).
- Outbound DNS and HTTPS access to:
  - your OS package repositories,
  - `raw.pkg.keygen.sh` (installer and fallback artifacts),
  - `oci.pkg.keygen.sh` (platform images).
- Inbound TCP 443 on the host (or an SSH tunnel to host port 443 — see [Accessing the UI](#accessing-the-ui)).
- A DNS name to serve Kamiwaza from, or a matching entry in the host's `/etc/hosts` file.

> The customer install path requires **only** a Kamiwaza Prod license key. Do not provide GHCR, Quay, Docker Hub, or Chainguard credentials for an online install.

## Step 1: Download and Verify the Installer

Choose and record an explicit published installer version. Do not use an
unrecorded `latest` alias for a production install. The example uses the
currently published 1.0.1 artifact; the release owner must change it to the
exact approved candidate when a later installer is published:

```bash
KAMIWAZA_VERSION="1.0.1"
case "$KAMIWAZA_VERSION" in
  *[!0-9A-Za-z._-]*|'') echo "invalid version" >&2; exit 1 ;;
esac
base_url="https://raw.pkg.keygen.sh/kamiwaza/kamiwaza-online-installer/@kamiwaza-online-installer/${KAMIWAZA_VERSION}"

for file in kamiwaza-online-install.sh kamiwaza-online-install.sh.sha256; do
  curl -fsSLO "${base_url}/${file}"
done

sha256sum -c kamiwaza-online-install.sh.sha256

chmod +x kamiwaza-online-install.sh
```

Keep the version, resolved download URL, checksum file, and verified SHA-256 in
the installation record. A checksum fetched from a different version does not
verify the selected installer.

On macOS, replace the verification command with:

```bash
shasum -a 256 -c kamiwaza-online-install.sh.sha256
```

## Step 2: Run the Installer

> **Upgrading an existing production database?** Follow the
> [Core database upgrade runbook](../runbooks/core-database-upgrade-1.2.md)
> before invoking the installer. The runbook requires the exact release
> candidate, a pre-mutation backup, schema gates, stop rules, and recovery
> evidence. Do not use the example download above for an upgrade unless it
> matches the exact artifact specified by the runbook.

Run the installer on the target host, supplying your license key, domain, and an initial admin password:

```bash
KEYGEN_LICENSE_KEY="<kamiwaza-prod-license-key>" \
./kamiwaza-online-install.sh \
  --domain <domain> \
  --admin-password "<initial-admin-password>" \
  -y 2>&1 | tee kamiwaza-online-install.log
```

- **On Linux**, the installer re-executes itself through `sudo -E` when it needs elevated privileges.
- **On macOS**, run as the target admin user rather than as root. The installer uses Homebrew and Podman state scoped to that user and prompts through `sudo` only for privileged setup steps.

Before extracting its payload or installing any prerequisites, the installer validates that your license can access the required Keygen images and exits immediately if it cannot. On a supported Linux host without `curl`, it first installs only `curl` and the CA certificate package needed for that check; the remaining prerequisites are not installed until the license check succeeds.

> Passing the license key through the `KEYGEN_LICENSE_KEY` environment variable keeps it out of the installer's command-line arguments, where it could otherwise be visible in `ps` output or logs. You can also use `KAMIWAZA_KEYGEN_LICENSE_KEY` or the `--keygen-license-key` option. If you also want to keep the key out of your interactive shell history, set the variable from somewhere other than the command line — for example a `.env` file you source, or your shell profile — following your environment's own conventions for handling secrets.

## Optional raw image preload

The installer normally uses `k0s-podman`, and the charts pull inference images from the authenticated registry when a model is deployed. The `--keygen-raw-image-packages` option applies only to the legacy Kind runtime. It preloads a space- or comma-separated replacement list of raw image archives into the Kind nodes.

The default list is `kamiwaza-opensearch kamiwaza-vllm kamiwaza-kaizen-agent kamiwaza-kaizen-backend kamiwaza-omniparse`. A custom list replaces that default, so include every default package that the installation still needs.

The plural `--keygen-raw-image-packages` option is the current installer interface. The singular form shown in older release documentation is not a supported current installer option.

This release provides the following hardware-specific raw package basenames:

| Hardware and engine | Package basename |
| --- | --- |
| NVIDIA with CUDA 12, llama.cpp | `kamiwaza-llamacpp-cuda12` |
| NVIDIA with CUDA 13, llama.cpp | `kamiwaza-llamacpp-cuda13` |
| NVIDIA amd64, Ampere or newer, vLLM | `kamiwaza-vllm` |
| NVIDIA ARM64, including DGX Spark, vLLM | `kamiwaza-vllm-cuda-arm64` |
| AMD CDNA, llama.cpp | `kamiwaza-llamacpp-rocm-cdna` |
| AMD RDNA, including gfx1151, llama.cpp | `kamiwaza-llamacpp-rocm-rdna` |

For gfx1151, the generic RDNA package replaces the earlier hardware-specific bridge and is the Strix Halo path validated for this release.

For example, this Kind installation replaces the default amd64 vLLM archive with the ARM64 vLLM archive while retaining the other default packages:

```bash
KEYGEN_LICENSE_KEY="<kamiwaza-prod-license-key>" \
./kamiwaza-online-install.sh \
  --keygen-raw-image-packages "kamiwaza-opensearch kamiwaza-vllm-cuda-arm64 kamiwaza-kaizen-agent kamiwaza-kaizen-backend kamiwaza-omniparse" \
  --domain <domain> \
  --admin-password "<initial-admin-password>" \
  -y \
  -e k8s_runtime=kind
```

Because a custom raw-image list replaces the defaults, retain the Kaizen agent and backend packages when installing Kaizen. If your NVIDIA host uses Secure Boot, also see [NVIDIA Secure Boot](nvidia-secure-boot.md).

## Common Options

```bash
./kamiwaza-online-install.sh [installer options] [install args]
```

Frequently used **install arguments**:

- `--domain <value>`: Public base domain for Kamiwaza.
- `--admin-password <value>`: Initial admin password.
- `-y`, `--yes`: Non-interactive install.
- `-e k8s_runtime=kind`: Select the legacy Kind runtime when using the optional raw-image preload.

Frequently used **installer options**:

- `--keygen-license-key <key>`: Keygen license key used for image pulls. Prefer the `KEYGEN_LICENSE_KEY` environment variable so the key does not appear in the installer's command-line arguments.
- `--keygen-raw-image-packages <list>`: Replace the raw image package preload list for a Kind installation. Supply a space- or comma-separated list; the option has no effect on the default `k0s-podman` runtime. See [Optional raw image preload](#optional-raw-image-preload).
- `--keep-extract`: Preserve the extracted payload after the install.
- `--phase1-only`: Stop after host prerequisites and cluster bootstrap.

## Logs

By default the installer writes to:

- **Linux:** `/var/log/kamiwaza_install_online.log`
- **macOS:** `~/Library/Logs/kamiwaza_install_online.log`

Override the log path with `KAMIWAZA_ONLINE_INSTALL_LOG`:

```bash
KAMIWAZA_ONLINE_INSTALL_LOG=/tmp/kamiwaza-online.log \
KEYGEN_LICENSE_KEY="<key>" \
./kamiwaza-online-install.sh --domain <domain> --admin-password "<password>" -y
```

## Verifying the Installation

The installer writes kubeconfig access for the invoking user. Confirm the cluster is up:

```bash
kubectl get pods -A
```

All pods should be `Running`, `Ready`, or `Completed`. To capture host and cluster state:

```bash
kubectl get nodes -o wide
kubectl get pods -A
```

Then confirm the API responds:

```bash
curl -k "https://<domain>/api/security/public/config"
```

## Accessing the UI

Open Kamiwaza in a browser at:

```text
https://<domain>/login
```

Log in with `admin` and the password you passed to `--admin-password`.

### Certificates

By default the installer serves Kamiwaza over TLS with a self-signed certificate, so your browser will show a security warning the first time you open the site. This is expected for a fresh install — continue past the warning to reach the login page. For production, configure a certificate that your clients already trust so the connection validates without a warning.

## Next Steps

- [Quickstart](../quickstart.md) — confirm the service is running and take your first steps.
- [Two-Node Deployment](two-node-deployment.md) — run inference across a pair of nodes.
- [Uninstalling Kamiwaza](uninstall.md).
