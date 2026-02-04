# Kamiwaza Installation Guide for Red Hat Enterprise Linux

## Overview

This guide covers the standard installation of Kamiwaza on Red Hat Enterprise Linux 9 systems with internet access. This is the recommended installation method for most users.

**For air-gapped environments without internet access**, see the [Offline Installation Guide](./redhat_offline_install.md). The offline installation is supported but requires additional preparation steps and is intended for restricted environments only.

These instructions have been tested for Kamiwaza Enterprise on RHEL 9.

---

## Prerequisites

Before installing Kamiwaza, ensure you have:

- **Red Hat Enterprise Linux 9** installed
- **Root or sudo access** to the system
- **Internet connectivity** for downloading packages and dependencies
- **Docker Engine** installed (see Step 2 below)

Review the full [System Requirements](system_requirements.md) for hardware, storage, and GPU requirements.

---

## Step 1: Install System Dependencies

Install the required system packages:

```bash
sudo dnf install -y net-tools gcc-c++ nodejs npm jq pkgconfig fontconfig-devel \
  freetype-devel libX11-devel libXrender-devel libXext-devel libpng-devel \
  libSM-devel pixman-devel libxcb-devel glib2-devel python3-devel libffi-devel \
  gtk3-devel ca-certificates curl libcurl-devel cmake gnupg2 iptables pciutils \
  dos2unix unzip coreutils systemd wget make gcc openssl sqlite ncurses-libs \
  readline libffi xz-libs expat tk zlib-devel bzip2-devel openssl-devel \
  ncurses-devel sqlite-devel readline-devel tk-devel xz-devel expat-devel \
  libuuid-devel yum-utils device-mapper-persistent-data lvm2 git python3.12 \
  python3.12-pip python3.12-devel vim
```

---

## Step 2: Install Docker

Docker is required to run Kamiwaza. Follow the official Docker installation guide for Red Hat Enterprise Linux:

**[Docker Installation for RHEL](https://docs.docker.com/engine/install/rhel/)**

The installation steps typically include:

1. Remove any older Docker versions:
   ```bash
   sudo dnf remove docker docker-client docker-client-latest docker-common \
     docker-latest docker-latest-logrotate docker-logrotate docker-engine \
     podman runc
   ```

2. Set up the Docker repository:
   ```bash
   sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
   ```

3. Install Docker Engine:
   ```bash
   sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

4. Enable and start Docker:
   ```bash
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo chmod 666 /var/run/docker.sock
   ```

5. Verify Docker installation:
   ```bash
   docker --version
   docker compose version
   ```

---

## Step 3: Install the Kamiwaza RPM Package

Download and install the Kamiwaza RPM package for RHEL 9:

```bash
# Download the package
curl -LO https://packages.kamiwaza.ai/rpm/kamiwaza_v0.9.3_rhel9_x86_64.rpm
```

**IMPORTANT:** You must accept the Kamiwaza License Agreement to install Kamiwaza. By including `KAMIWAZA_ACCEPT_LICENSE=yes` in the installation command, you are agreeing to the Kamiwaza License Agreement.

To review the full license terms, visit: https://www.kamiwaza.ai/license

```bash

# Install the package
sudo -E KAMIWAZA_ACCEPT_LICENSE=yes dnf install ./kamiwaza_v0.9.3_rhel9_x86_64.rpm

# Alternatively, for Enterprise Mode, Install the package with Kamiwaza License Key
sudo -E KAMIWAZA_ACCEPT_LICENSE=yes -E KAMIWAZA_LICENSE_KEY="YOUR_LICENSE_KEY_HERE" dnf install ./kamiwaza_v0.9.3_rhel9_x86_64.rpm
```

**Note:** Omit the `-E KAMIWAZA_LICENSE_KEY` option if you are installing the Community Edition without an enterprise license.

The installer will automatically detect online mode and download required resources from the internet.

**Monitoring Installation Progress:**

While the installer runs, you can monitor the installation logs:

```bash
sudo tail -f /var/log/kamiwaza-postinst-debug.log
```

---

## Step 4: Configure System Environment Variables

After installation, configure Kamiwaza by editing `/etc/kamiwaza/env.sh` (requires sudo access):

**Required:**
```bash
export KAMIWAZA_ORIGIN=<the-full-url-to-access-app>
```

Be sure to include the protocol (e.g., `https://kamiwaza.example.com` or `https://192.168.1.100`).

**Optional (for non-production systems only):**

On non-production systems where self-signed certificates or insecure TLS is acceptable:

```bash
export AUTH_GATEWAY_TLS_INSECURE=true
```

> **Warning:** Do not use `AUTH_GATEWAY_TLS_INSECURE=true` in production environments.

---

## Step 5: Start and Verify Kamiwaza

Start the Kamiwaza service:

```bash
kamiwaza start
```

The first time you run this command, it will take longer to start as Kamiwaza performs initial setup and downloads required Docker images.

Monitor the startup progress:

```bash
kamiwaza status
```

Once all services show as running, Kamiwaza is ready to use.

**Access the Web Interface:**

Open your browser and navigate to the URL you configured in `KAMIWAZA_ORIGIN`:

```
https://your-configured-domain-or-ip
```

---

## Step 6: Create Users

After installation, you'll need to create user accounts to access Kamiwaza.

**Add kz-user to your PATH:**

```bash
# Add to current shell session
export PATH="/opt/kamiwaza/kamiwaza/bin:$PATH"

# Add to your shell profile for permanent access
echo 'export PATH="/opt/kamiwaza/kamiwaza/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**View kz-user documentation:**

```bash
# View all available commands
kz-user help

# Get help for specific commands
kz-user help add
```

**Example: Create users**

```bash
# Create an admin user
kz-user add admin --email admin@company.com --roles admin --random --safe

# List all users
kz-user list
```

**Note:** Passwords are displayed once and must be saved immediately. For bulk user creation and full documentation, see the [Security Admin Guide](../security/admin-guide#221-using-kz-user-cli-tool).

---

## File Locations

| Component | Installed Location | Purpose |
|-----------|-------------------|---------|
| Main Application | `/opt/kamiwaza/` | Core application files |
| Configuration | `/opt/kamiwaza/kamiwaza/` | Runtime configuration |
| Environment Config | `/etc/kamiwaza/env.sh` | System environment variables |
| Data Storage | `/var/lib/kamiwaza/` | Models, databases, logs |
| Service Scripts | `/usr/bin/kamiwaza*` | Command-line tools |
| Log Files | `/var/log/kamiwaza/` | Application logs |

---

## Network Ports

Ensure the following ports are accessible:

| Service | Port | Purpose |
|---------|------|---------|
| Web Interface | 3000 | Main UI |
| API Server | 8000 | REST API |
| Ray Dashboard | 8265 | Ray monitoring |
| Ray Client | 10001 | Ray cluster communication |
| Traefik | 80/443 | Reverse proxy |

---

## Next Steps

- **[GPU Setup Guide](gpu_setup_guide.md)** - Configure NVIDIA or AMD GPU support
- **[System Requirements](system_requirements.md)** - Review detailed hardware and software requirements
- **[Offline Installation](redhat_offline_install.md)** - For air-gapped environments

---

## Troubleshooting

### Docker Permission Errors

If you encounter permission errors when running Docker commands:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply group membership (choose one):
newgrp docker          # Apply in current terminal session
# OR log out and back in
# OR reboot

# Verify group membership
groups | grep docker
```

### Installation Logs

If installation fails, check the logs:

```bash
sudo tail -100 /var/log/kamiwaza-postinst-debug.log
```

### Service Status

Check if the Kamiwaza service is running:

```bash
sudo systemctl status kamiwaza
```

### Restart Kamiwaza

If you need to restart the service:

```bash
kamiwaza stop
kamiwaza start
```
