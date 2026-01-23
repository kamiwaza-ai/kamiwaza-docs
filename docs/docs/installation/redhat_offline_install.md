# Kamiwaza Installation Guide for Red Hat Enterprise Linux (Offline/Air-Gapped)

## Overview

This guide covers the offline installation of Kamiwaza for air-gapped RHEL environments where internet access is restricted or unavailable. For systems with internet access, see the [Online Installation Guide](./redhat_online_install.md).

The offline installer includes:

- **Pre-packaged NVM + Node.js** (version 22.11.0)
- **Frontend node_modules** (if available during build)
- **Docker images** (containerized services)
- **Python wheels** (pip dependencies)
- **System dependencies** (RPM packages)

These instructions have been tested for Kamiwaza Enterprise.

---

## Dependencies

The following dependencies are required:

- net-tools
- gcc-c++
- nodejs
- npm
- jq
- pkgconfig
- fontconfig-devel
- freetype-devel
- libX11-devel
- libXrender-devel
- libXext-devel
- libpng-devel
- libSM-devel
- pixman-devel
- libxcb-devel
- glib2-devel
- python3-devel
- libffi-devel
- gtk3-devel
- ca-certificates
- curl
- libcurl-devel
- cmake
- gnupg2
- iptables
- pciutils
- dos2unix
- unzip
- coreutils
- systemd
- wget
- make
- gcc
- openssl
- sqlite
- ncurses-libs
- readline
- libffi
- xz-libs
- expat
- tk
- zlib-devel
- bzip2-devel
- openssl-devel
- ncurses-devel
- sqlite-devel
- readline-devel
- tk-devel
- xz-devel
- expat-devel
- libuuid-devel
- yum-utils
- device-mapper-persistent-data
- lvm2
- git
- python3.12
- python3.12-pip
- python3.12-devel

For systems that can temporarily connect to the internet, these dependencies can be installed via the command:

```bash
sudo dnf install -y net-tools gcc-c++ nodejs npm jq pkgconfig fontconfig-devel freetype-devel libX11-devel libXrender-devel libXext-devel libpng-devel libSM-devel pixman-devel libxcb-devel glib2-devel python3-devel libffi-devel gtk3-devel ca-certificates curl libcurl-devel cmake gnupg2 iptables pciutils dos2unix unzip coreutils systemd wget make gcc openssl sqlite ncurses-libs readline libffi xz-libs expat tk zlib-devel bzip2-devel openssl-devel ncurses-devel sqlite-devel readline-devel tk-devel xz-devel expat-devel libuuid-devel yum-utils device-mapper-persistent-data lvm2 git python3.12 python3.12-pip python3.12-devel vim
```

---

## For Users: Installing Offline

### Step 1: Transfer Files to Target System

You should receive these files from your builder:
```
# Main installer package
kamiwaza_[version]_rhel9_x86_64.rpm

# Docker images					
kamiwaza_[version]_rhel9_x86_64_docker_images.tar.gz

# Docker image installation script
install_docker_images.sh

# Extension registry tarball (for installing extensions)
kamiwaza-registry-[date].tar.gz
```

Transfer them to a folder on your target system that is accessible by all users.


**Transfer Methods:**
- USB drive/removable media
- Secure file transfer (scp, rsync)
- Physical media delivery

### Step 2: Install Docker Images

```bash
sudo bash install_docker_images.sh <"path/to/images.tar.gz">
```

### Step 3: Enable and Start Docker

```bash
# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo chmod 666 /var/run/docker.sock
```

### Step 4: Install RPM Package

**IMPORTANT:** You must accept the Kamiwaza License Agreement to install Kamiwaza. By including `KAMIWAZA_ACCEPT_LICENSE=yes` in the installation command, you are agreeing to the Kamiwaza License Agreement.

To review the full license terms, visit: https://www.kamiwaza.ai/license

```bash
# Install the RPM package. Add your Kamiwaza license key between the quotation marks.
sudo -E KAMIWAZA_ACCEPT_LICENSE=yes -E KAMIWAZA_LICENSE_KEY="[LICENSE_KEY]" dnf install kamiwaza_[version]_rhel9_x86_64.rpm

# The installer will automatically detect offline mode and use bundled resources
```

**Note:** Don't include `-E KAMIWAZA_LICENSE_KEY` if you don't want to run an enterprise install.

**Tip:** While the installer says "Running scriptlet", use `sudo tail -f /var/log/kamiwaza-postinst-debug.log` to monitor logs.

### Step 5: Configure System Environment Variables

Edit `/etc/kamiwaza/env.sh`, which requires sudo access, to set the following environment variables:

**Required:**
```bash
export KAMIWAZA_ORIGIN=<the-full-url-to-access-app>
```
Be sure to include `https://` in your env variable.

**Optional (for non-production systems only):**
On non-production systems, where insecure TLS is acceptable, you may also set:
```bash
export AUTH_GATEWAY_TLS_INSECURE=true
```

### Step 6: Install Extensions

1. Before starting Kamiwaza, install the extensions from the registry tarball:

```bash
kamiwaza extensions install kamiwaza-registry-[date].tar.gz
```

Replace `kamiwaza-registry-[date].tar.gz` with the actual filename of the registry package you received.

2. Import the extensions images using the provided shell script:
```bash
bash /opt/kamiwaza/kamiwaza/scripts/import-extension-images.sh
```

### Step 7: Verification

```bash
kamiwaza start
```

The first time you run this command, it will take take longer to start Kamiwaza as it does initial setup. Once it is starting, you can monitor its progress by running:

```bash
kamiwaza status
```

Once are all services are confirmed to be running, Kamiwaza is started.

### Step 8: Verify Extensions

Use the following checklist to confirm the bundled extensions are ready:

Sign in to the Kamiwaza UI, open **App Garden → Extensions**, and confirm the extension catalog appears without network access.
Note: Extension logs get written to `/var/log/kamiwaza/extension-sync.log`.


### File Locations

| Component | Installed Location | Purpose |
|-----------|-------------------|---------|
| Main Application | `/opt/kamiwaza/` | Core application files |
| Configuration | `/opt/kamiwaza/kamiwaza/` | Runtime configuration |
| Data Storage | `/var/lib/kamiwaza/` | Models, databases, logs |
| Offline Resources | `/usr/share/kamiwaza/` | Bundled dependencies |
| Service Scripts | `/usr/bin/kamiwaza*` | Command-line tools |
| Log Files | `/var/log/kamiwaza/` | Application logs |

---

### Network Ports

| Service | Port | Purpose |
|---------|------|---------|
| Web Interface | 3000 | Main UI |
| API Server | 8000 | REST API |
| Ray Dashboard | 8265 | Ray monitoring |
| Ray Client | 10001 | Ray cluster comm |
| Traefik | 80/443 | Reverse proxy |


### Troubleshooting: Extension Configuration (Offline builds)

Offline bundles include the Kamiwaza Extension Registry so App Garden extensions remain available without external connectivity. The installer appends the following defaults to `/opt/kamiwaza/kamiwaza/env.sh`—verify they match your environment:

| Variable | Typical offline value | Purpose |
|----------|----------------------|---------|
| `KAMIWAZA_EXTENSION_STAGE` | `LOCAL` | Forces the platform to serve extensions from the bundled registry |
| `KAMIWAZA_EXTENSION_LOCAL_STAGE_URL` | `file:///opt/kamiwaza/extensions/kamiwaza-extension-registry` | Points to the unpacked registry assets on disk |
| `KAMIWAZA_EXTENSION_INSTALL_PATH` | `/opt/kamiwaza/kamiwaza/extensions` | Destination directory for the registry archive |

If the builder omitted these entries (or they differ), edit `/opt/kamiwaza/kamiwaza/env.sh` and update the existing `export` lines rather than appending duplicates. One approach:

```bash
sudo vim /opt/kamiwaza/kamiwaza/env.sh
```

Ensure the file contains exactly one copy of each export:

```bash
export KAMIWAZA_EXTENSION_STAGE=LOCAL
export KAMIWAZA_EXTENSION_LOCAL_STAGE_URL="file:///opt/kamiwaza/extensions/kamiwaza-extension-registry"
export KAMIWAZA_EXTENSION_INSTALL_PATH="/opt/kamiwaza/extensions"
```

Restart Kamiwaza to load any environment edits:

```bash
sudo systemctl restart kamiwaza
```

