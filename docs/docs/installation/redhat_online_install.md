# Kamiwaza Installation Guide for Red Hat Enterprise Linux (Online)

## Overview

This guide covers the standard installation of Kamiwaza on Red Hat Enterprise Linux systems with internet access. For air-gapped environments without internet access, see the [Offline Installation Guide](./redhat_offline_install.md).

These instructions have been tested for Kamiwaza Enterprise.

---

## Step 1: Download Prerequisites

Install the required system dependencies:

```bash
sudo dnf install -y net-tools gcc-c++ nodejs npm jq pkgconfig fontconfig-devel freetype-devel libX11-devel libXrender-devel libXext-devel libpng-devel libSM-devel pixman-devel libxcb-devel glib2-devel python3-devel libffi-devel gtk3-devel ca-certificates curl libcurl-devel cmake gnupg2 iptables pciutils dos2unix unzip coreutils systemd wget make gcc openssl sqlite ncurses-libs readline libffi xz-libs expat tk zlib-devel bzip2-devel openssl-devel ncurses-devel sqlite-devel readline-devel tk-devel xz-devel expat-devel libuuid-devel yum-utils device-mapper-persistent-data lvm2 git python3.12 python3.12-pip python3.12-devel vim
```

---

## Step 2: Install Docker and Enable It

Once you've installed Docker:

```bash
# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo chmod 666 /var/run/docker.sock
```

---

## Step 3: Install the RHEL9 RPM

**IMPORTANT:** You must accept the Kamiwaza License Agreement to install Kamiwaza. By including `KAMIWAZA_ACCEPT_LICENSE=yes` in the installation command, you are agreeing to the Kamiwaza License Agreement.

To review the full license terms, visit: https://www.kamiwaza.ai/license

```bash
# Install the RPM package. Add your Kamiwaza license key between the quotation marks.
sudo -E KAMIWAZA_ACCEPT_LICENSE=yes -E KAMIWAZA_LICENSE_KEY="[LICENSE_KEY]" dnf install kamiwaza_[version]_rhel9_x86_64.rpm

# The installer will automatically detect online mode and download required resources

# Note: Install logs will be found at:
sudo tail -f /var/log/kamiwaza-postinst-debug.log
```

**Note:** Don't include `-E KAMIWAZA_LICENSE_KEY` if you don't want to run an enterprise install.

---

## Step 4: Configure System Environment Variables

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

---

## Step 5: Verification

```bash
kamiwaza start
```

The first time you run this command, it will take longer to start Kamiwaza as it does initial setup. Once it is starting, you can monitor its progress by running:

```bash
kamiwaza status
```

Once all services are confirmed to be running, Kamiwaza is started.

---

## File Locations

| Component | Installed Location | Purpose |
|-----------|-------------------|---------|
| Main Application | `/opt/kamiwaza/` | Core application files |
| Configuration | `/opt/kamiwaza/kamiwaza/` | Runtime configuration |
| Data Storage | `/var/lib/kamiwaza/` | Models, databases, logs |
| Service Scripts | `/usr/bin/kamiwaza*` | Command-line tools |
| Log Files | `/var/log/kamiwaza/` | Application logs |

---

## Network Ports

| Service | Port | Purpose |
|---------|------|---------|
| Web Interface | 3000 | Main UI |
| API Server | 8000 | REST API |
| Ray Dashboard | 8265 | Ray monitoring |
| Ray Client | 10001 | Ray cluster comm |
| Traefik | 80/443 | Reverse proxy |
