# Online Installation

The online installer is the recommended way to install a published Kamiwaza
release on an internet-connected host. It is a single self-contained script
that bundles the deploy payload, playbooks, and Helm chart dependencies. Host
tools are installed from your OS package manager, and the Kamiwaza platform
images are pulled from Keygen.

**Supported hosts:**

- Ubuntu 22.04
- Ubuntu 24.04
- RHEL-compatible 9.x

macOS production installation is not currently supported (ENG-10839). macOS
developer installs remain available through the source-based Lima workflow.

## Prerequisites

- A **Kamiwaza Prod license key**. The installer script is publicly downloadable, but a license key is required to pull the platform images. Contact your Kamiwaza representative if you do not have one.
- A host that meets the [System Requirements](system_requirements.md).
- **Free disk space, on the right filesystem**. The installer provisions cluster storage under `/var/lib` as **preallocated** loopback images, so the space is consumed at install time rather than as you use it. Confirm the space is free on the **volume that actually backs `/var`** — on hosts with LVM or separate partitions (most cloud RHEL and Ubuntu images ship this way), a large total disk does **not** help if `/var` is a small separate volume. At default settings a single-node host needs:
  - **`/var` ≥ 1.1 TB** — the install consumes roughly **890 GB** here: the Rook/Ceph OSD image (**700 GB**, `storage_host_prep_virtual_block_size`), the TopoLVM volume group backing stateful PVCs (**150 GB**, `storage_host_prep_topolvm_vg_size`), and roughly 40 GB of container images under `/var/lib/k0s`. Size the volume so that 890 GB leaves you under the ~85% disk-pressure threshold described below: 890 GB on a 1 TB volume is 89% and still inside the eviction range, so **1.1 TB** (≈81%) is the practical floor.
  - **`/` ≥ 30 GB** — installed tooling under `/opt` and `/usr/local`, plus general headroom.

  **On a smaller host, reduce the OSD image** rather than provisioning 1.1 TB. Passing `-e storage_host_prep_virtual_block_size=80G` — the same 80 GB OSD size the offline install guide recommends — brings the requirement down to **350 GB on `/var`**:

  ```bash
  KEYGEN_LICENSE_KEY="<kamiwaza-prod-license-key>" \
  ./kamiwaza-online-install.sh \
    --domain <domain> \
    --admin-password "<initial-admin-password>" \
    -y \
    -e storage_host_prep_virtual_block_size=80G
  ```

  Size the OSD image for the models you intend to store — it backs the in-cluster model registry. With the 80 GB override a single-node install consumes roughly 270 GB of `/var`; leave headroom above that, because Kubernetes starts evicting pods once the filesystem passes ~85% full.

  **Most cloud images need their volumes grown first** — they commonly ship `/` and `/var` small (often 2 GB / 10 GB) with the bulk of the disk unpartitioned. Check `lsblk` for your device, partition index, and volume-group names before running the commands below. The example uses the **RHEL-compatible** cloud-image layout (`rootvg`/`rootlv`/`varlv`):

  ```bash
  sudo growpart /dev/nvme0n1 4
  sudo pvresize /dev/nvme0n1p4
  sudo lvextend -r -L 100G /dev/rootvg/rootlv
  sudo lvextend -r -L 400G /dev/rootvg/varlv   # 400 GB covers the 80G-OSD override; size to ≥ 1.1 TB for the default OSD
  ```

  Ubuntu 22.04/24.04 cloud images use the `ubuntu-vg`/`ubuntu-lv` layout and typically ship a single root volume with **no separate `/var`**, so grow the root LV instead (and adjust the `growpart` partition index for your disk).

  If `/var` is too small the install fails in one of three ways, none of which mentions disk space directly:

  - early, at `storage_host_prep` with an `fs-virtual-block free space` error;
  - during image import, with `no space left on device`;
  - or roughly ten minutes in, with `Progress deadline exceeded` on the `cert-manager` deployments and `FailedScheduling: 1 node(s) had untolerated taint(s)` on their pods. That last one is the kubelet disk-pressure taint, not a cert-manager fault.

  Grow the backing logical volume or partition (or mount adequate storage at `/var`) **before** you begin.

- Outbound DNS and HTTPS access to:
  - your OS package repositories,
  - `raw.pkg.keygen.sh` (installer and fallback artifacts),
  - `oci.pkg.keygen.sh` (platform images).
- Inbound TCP 443 on the host (or an SSH tunnel to host port 443 — see [Accessing the UI](#accessing-the-ui)).
- A DNS name to serve Kamiwaza from, or a matching entry in the host's `/etc/hosts` file.

> The customer install path requires **only** a Kamiwaza Prod license key. Do not provide GHCR, Quay, Docker Hub, or Chainguard credentials for an online install.

## Step 1: Download and Verify the Installer

Download the installer and its checksum, verify the checksum, then make the installer executable:

Choose and record an explicit version that has been published to the online
installer channel. Do not assume that the documentation version is already
available as an installer artifact, and do not use an unrecorded `latest` alias
for a production install. The release owner must supply the version explicitly:

```bash
: "${KAMIWAZA_VERSION:?set KAMIWAZA_VERSION to a published installer version}"
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

> **If you sized the host to the 350 GB floor rather than 1.1 TB**, add `-e storage_host_prep_virtual_block_size=80G` to the command above. Without it the installer provisions the default 700 GB OSD image and fails at host prep. See [Prerequisites](#prerequisites).

The installer runs k0s directly on the Linux host and uses Podman for supporting
container workflows. It re-executes itself through `sudo -E` when it needs
elevated privileges. Do not pass a Kubernetes runtime argument.

Before extracting its payload or installing any prerequisites, the installer validates that your license can access the required Keygen images and exits immediately if it cannot. On a supported Linux host without `curl`, it first installs only `curl` and the CA certificate package needed for that check; the remaining prerequisites are not installed until the license check succeeds.

> Passing the license key through the `KEYGEN_LICENSE_KEY` environment variable keeps it out of the installer's command-line arguments, where it could otherwise be visible in `ps` output or logs. You can also use `KAMIWAZA_KEYGEN_LICENSE_KEY` or the `--keygen-license-key` option. If you also want to keep the key out of your interactive shell history, set the variable from somewhere other than the command line — for example a `.env` file you source, or your shell profile — following your environment's own conventions for handling secrets.

## Inference images

Supported k0s installs pull inference images from the authenticated registry when a model is deployed; no raw-image preload or Kubernetes runtime argument is required. Select a model engine compatible with the host hardware. If an NVIDIA host uses Secure Boot, also see [NVIDIA Secure Boot](nvidia-secure-boot.md).

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
- `--keep-extract`: Preserve the extracted payload after the install.
- `--phase1-only`: Stop after host prerequisites and cluster bootstrap.

## Logs

By default the installer writes to `/var/log/kamiwaza_install_online.log`.

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
