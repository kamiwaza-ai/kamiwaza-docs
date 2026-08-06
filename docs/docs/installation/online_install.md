# Online Installation

The online installer is the recommended way to install Kamiwaza 1.0.1 on an internet-connected host. It is a single self-contained script that bundles the deploy payload, playbooks, and Helm chart dependencies. Host tools are installed from your OS package manager, and the Kamiwaza platform images are pulled from Keygen.

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

Download the installer and its checksum, verify the checksum, then make the installer executable:

```bash
base_url="https://raw.pkg.keygen.sh/kamiwaza/kamiwaza-online-installer/@kamiwaza-online-installer/1.0.1"

for file in kamiwaza-online-install.sh kamiwaza-online-install.sh.sha256; do
  curl -fsSLO "${base_url}/${file}"
done

sha256sum -c kamiwaza-online-install.sh.sha256

chmod +x kamiwaza-online-install.sh
```

On macOS, replace the verification command with:

```bash
shasum -a 256 -c kamiwaza-online-install.sh.sha256
```

## Step 2: Run the Installer

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

## GPU and Inference Images

Large inference images are not all downloaded during installation. To enable GPU-accelerated inference, add the one image package that matches your hardware with `--keygen-raw-image-package`:

| Hardware | Package |
| --- | --- |
| NVIDIA with CUDA 12 | `kamiwaza-llamacpp-cuda12` |
| NVIDIA with CUDA 13 | `kamiwaza-llamacpp-cuda13` |
| AMD CDNA | `kamiwaza-llamacpp-rocm-cdna` |
| AMD RDNA | `kamiwaza-llamacpp-rocm-rdna` |
| AMD gfx1151 | `kamiwaza-llamacpp-rocm-gfx1151` |
| NVIDIA vLLM (Ampere or newer) | `kamiwaza-vllm` |

For example, to install on an NVIDIA CUDA 12 host:

```bash
KEYGEN_LICENSE_KEY="<kamiwaza-prod-license-key>" \
./kamiwaza-online-install.sh \
  --keygen-raw-image-package kamiwaza-llamacpp-cuda12 \
  --domain <domain> \
  --admin-password "<initial-admin-password>" \
  -y
```

The installer always includes the required core and Kaizen agent images. If your NVIDIA host uses Secure Boot, also see [NVIDIA Secure Boot](nvidia-secure-boot.md).

## Common Options

```bash
./kamiwaza-online-install.sh [installer options] [install args]
```

Frequently used **install arguments**:

- `--domain <value>`: Public base domain for Kamiwaza.
- `--admin-password <value>`: Initial admin password.
- `-y`, `--yes`: Non-interactive install.

Frequently used **installer options**:

- `--keygen-license-key <key>`: Keygen license key used for image pulls. Prefer the `KEYGEN_LICENSE_KEY` environment variable so the key does not appear in the installer's command-line arguments.
- `--keygen-raw-image-package <name>`: Preload one optional image package (see [GPU and Inference Images](#gpu-and-inference-images)). Repeat for each package you need.
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

When upgrading an existing 1.0.0 production database to 1.2.0, follow the
[Core database upgrade runbook](../runbooks/core-database-upgrade-1.2.md)
before invoking the installer. It defines the required backup, schema gate,
stop rules, recovery boundary, and evidence bundle.

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
