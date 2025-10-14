# Kamiwaza Offline Installation Guide for Red Hat Enterprise Linux

## Overview

Kamiwaza supports offline installation for air-gapped RHEL environments where internet access is restricted or unavailable. The offline installer includes:

- **Pre-packaged NVM + Node.js** (version 22.11.0)
- **Frontend node_modules** (if available during build)
- **Docker images** (containerized services)
- **Python wheels** (pip dependencies)
- **System dependencies** (RPM packages)

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
sudo dnf install -y net-tools gcc-c++ nodejs npm jq pkgconfig fontconfig-devel freetype-devel libX11-devel libXrender-devel libXext-devel libpng-devel libSM-devel pixman-devel libxcb-devel glib2-devel python3-devel libffi-devel gtk3-devel ca-certificates curl libcurl-devel cmake gnupg2 iptables pciutils dos2unix unzip coreutils systemd wget make gcc openssl sqlite ncurses-libs readline libffi xz-libs expat tk zlib-devel bzip2-devel openssl-devel ncurses-devel sqlite-devel readline-devel tk-devel xz-devel expat-devel libuuid-devel yum-utils device-mapper-persistent-data lvm2 git python3.12 python3.12-pip python3.12-devel
```

---

## For Users: Installing Offline

### Step 1: Transfer Files to Target System

You should receive these files from your builder:
```
kamiwaza-[version]-offline.rpm          # Main installer package
kamiwaza-requirements-export.zip        # Additional dependencies (optional)
```

**Transfer Methods:**
- USB drive/removable media
- Secure file transfer (scp, rsync)
- Physical media delivery

### Step 2: Basic Installation

```bash
# Install the RPM package
sudo rpm -i kamiwaza-[version]-offline.rpm

# The installer will automatically detect offline mode and use bundled resources
```

### Step 3: Configure Environment

After installation, configure the environment settings in `/etc/kamiwaza/env.sh`:

```bash
# Edit the environment configuration file
sudo nano /etc/kamiwaza/env.sh

# Add the following required settings:
export OFFLINE_MODE=true
export KAMIWAZA_LICENSE_KEY=""  # Add your license key here
```

**Important Notes:**
- `OFFLINE_MODE=true` enables offline installation mode, preventing internet downloads
- Replace `KAMIWAZA_LICENSE_KEY=""` with your actual license key provided by Kamiwaza
- This file is sourced automatically by Kamiwaza services on startup

### Step 4: Verification

```bash
kamiwaza status
```
or to watch status: 
```bash
kamiwaza status -w
```

Once confirmed, Kamiwaza is installed! 

### Step 5: Extension Configuration (Offline builds)

Offline bundles include the Kamiwaza Extension Registry so App Garden extensions remain available without external connectivity. The installer appends the following defaults to `/etc/kamiwaza/env.sh`—verify they match your environment:

| Variable | Typical offline value | Purpose |
|----------|----------------------|---------|
| `KAMIWAZA_EXTENSION_STAGE` | `LOCAL` | Forces the platform to serve extensions from the bundled registry |
| `KAMIWAZA_EXTENSION_LOCAL_STAGE_URL` | `file:///opt/kamiwaza/extensions/kamiwaza-extension-registry` | Points to the unpacked registry assets on disk |
| `KAMIWAZA_EXTENSION_INSTALL_PATH` | `/opt/kamiwaza/extensions` | Destination directory for the registry archive |

If the builder omitted these entries, add them manually before restarting services:

```bash
sudo tee -a /etc/kamiwaza/env.sh >/dev/null <<'EOF'
export KAMIWAZA_EXTENSION_STAGE=LOCAL
export KAMIWAZA_EXTENSION_LOCAL_STAGE_URL="file:///opt/kamiwaza/extensions/kamiwaza-extension-registry"
export KAMIWAZA_EXTENSION_INSTALL_PATH="/opt/kamiwaza/extensions"
EOF
```

Restart Kamiwaza to load any environment edits:

```bash
sudo systemctl restart kamiwaza
```

### Step 6: Verify Extensions

Use the following checklist to confirm the bundled extensions are ready:

1. **Registry assets present**
   ```bash
   ls /opt/kamiwaza/extensions/kamiwaza-extension-registry/garden/default/apps.json
   jq '.apps | length' /opt/kamiwaza/extensions/kamiwaza-extension-registry/garden/default/apps.json
   ```
   The `apps.json` file should exist and list the expected number of extensions.

2. **Extension services healthy**  
   Run `kamiwaza status` and look for an `extension-sync` (or similarly named) entry reporting `RUNNING`.  
   For container installs, you can also check logs:
   ```bash
   docker compose logs --tail=50 extension-sync
   ```
   For systemd-managed installs, inspect `/var/log/kamiwaza/extension-sync.log`.

3. **App Garden validation**  
   Sign in to the Kamiwaza UI, open **App Garden → Extensions**, and confirm the extension catalog appears without network access.

If any step fails, rerun the installer with the `--extension-path` option or reapply the registry archive, then repeat the verification steps above.


### File Locations

| Component | Installed Location | Purpose |
|-----------|-------------------|---------|
| Main Application | `/opt/kamiwaza/` | Core application files |
| Configuration | `/etc/kamiwaza/` | Runtime configuration |
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
