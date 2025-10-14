# Kamiwaza Offline Installation Guide for Red Hat Enterprise Linux

## Overview

Kamiwaza supports offline installation for air-gapped environments where internet access is restricted or unavailable. The offline installer includes:

- **Pre-packaged NVM + Node.js** (version 22.11.0)
- **Frontend node_modules** (if available during build)
- **Docker images** (containerized services)
- **Python wheels** (pip dependencies)
- **System dependencies** (RPM packages)

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

