# Kamiwaza Offline Installation Guide for Red Hat Enterprise Linux

## Overview

This guide is for system administrators installing Kamiwaza on **Red Hat Enterprise Linux (RHEL)** in an **offline/air-gapped environment** with no internet access.

### What You Should Have Received

You should have received a Kamiwaza offline installation package containing:

1. **Kamiwaza RPM file** - `kamiwaza-<version>-offline.rpm` (~2-3GB)
2. This installation guide

The RPM package contains all necessary dependencies pre-packaged for offline installation.

---

## Pre-Installation: Verify Package Contents

### Step 1: Verify RPM File

```bash
# Check RPM file exists and size
ls -lh kamiwaza-*.rpm

# Expected output: File size ~2-3GB for offline installer
# Example: -rw-r--r-- 1 user user 2.8G Oct 13 12:00 kamiwaza-1.0.0-offline.rpm
```

### Step 2: Verify RPM Integrity

```bash
# Check RPM package is valid
rpm -K kamiwaza-*.rpm

# Expected output should show package is OK
```

### Step 3: Verify Offline Resources in RPM

```bash
# List all offline resources included in RPM
rpm -qlp kamiwaza-*.rpm | grep offline

# You should see these directories:
# /usr/share/kamiwaza/offline_nodejs/nvm-offline.tar.gz
# /usr/share/kamiwaza/offline_node_modules/...
# /usr/share/kamiwaza/offline_docker_images/docker_images.zip
# /usr/share/kamiwaza/offline_python_wheels/*.whl
```

### Step 4: Detailed Resource Verification

Run this verification script to check all required components:

```bash
#!/bin/bash
# save as: verify-offline-rpm.sh

RPM_FILE="kamiwaza-*.rpm"

echo "=========================================="
echo "Kamiwaza Offline RPM Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Check 1: RPM file exists
echo -n "1. RPM file exists: "
if ls $RPM_FILE 1>/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} - kamiwaza RPM not found"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 2: RPM is valid
echo -n "2. RPM package valid: "
if rpm -K $RPM_FILE 2>/dev/null | grep -q "OK"; then
    echo -e "${GREEN}✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} - RPM validation failed"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 3: NVM package
echo -n "3. NVM + Node.js package: "
if rpm -qlp $RPM_FILE 2>/dev/null | grep -q "offline_nodejs/nvm-offline.tar.gz"; then
    echo -e "${GREEN}✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} - NVM package missing"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# Check 4: Node modules
echo -n "4. Frontend node_modules: "
NODE_MODULES_COUNT=$(rpm -qlp $RPM_FILE 2>/dev/null | grep "offline_node_modules/" | wc -l)
if [ "$NODE_MODULES_COUNT" -gt 10 ]; then
    echo -e "${GREEN}✓${NC} ($NODE_MODULES_COUNT files)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} - Only $NODE_MODULES_COUNT files (may impact frontend)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Check 5: Docker images
echo -n "5. Docker images archive: "
if rpm -qlp $RPM_FILE 2>/dev/null | grep -q "offline_docker_images/.*\.zip"; then
    echo -e "${GREEN}✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} - Docker images not found (may need to pull images)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Check 6: Python wheels
echo -n "6. Python packages: "
WHEELS_COUNT=$(rpm -qlp $RPM_FILE 2>/dev/null | grep "offline_python_wheels/.*\.whl" | wc -l)
if [ "$WHEELS_COUNT" -gt 100 ]; then
    echo -e "${GREEN}✓${NC} ($WHEELS_COUNT packages)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} - Only $WHEELS_COUNT packages (expected ~247)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Check 7: RPM size
echo -n "7. RPM size appropriate: "
RPM_SIZE=$(ls -l $RPM_FILE | awk '{print $5}')
RPM_SIZE_GB=$((RPM_SIZE / 1024 / 1024 / 1024))
if [ "$RPM_SIZE_GB" -ge 1 ]; then
    echo -e "${GREEN}✓${NC} (${RPM_SIZE_GB}GB)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} - Size seems small (${RPM_SIZE_GB}GB)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo "Checks passed: $CHECKS_PASSED"
echo "Checks failed: $CHECKS_FAILED"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo -e "${GREEN}Ready for offline installation.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo "Please contact support for a complete offline package."
    exit 1
fi
```

**Run the verification:**
```bash
chmod +x verify-offline-rpm.sh
sudo bash verify-offline-rpm.sh
```

**Expected output:**
```
==========================================
Kamiwaza Offline RPM Verification
==========================================

1. RPM file exists: ✓
2. RPM package valid: ✓
3. NVM + Node.js package: ✓
4. Frontend node_modules: ✓ (8,432 files)
5. Docker images archive: ✓
6. Python packages: ✓ (247 packages)
7. RPM size appropriate: ✓ (2GB)

==========================================
Verification Summary
==========================================
Checks passed: 7
Checks failed: 0
✓ All critical checks passed!
Ready for offline installation.
```

---

## System Prerequisites

### Required Before Installation

#### 1. Operating System
- **RHEL 9.6+** or **RHEL 10.x**

#### 2. System Requirements
```bash
# Check OS version
cat /etc/os-release

# Check available disk space (need at least 50GB free)
df -h /

# Check RAM (recommended 16GB+)
free -h

# Check CPU cores (recommended 4+)
nproc
```

#### 3. Dependencies Already Installed

The following should already be installed on your RHEL system:

```bash
# Verify required system packages
rpm -qa | grep -E "python3.12|tar|unzip|gzip"

# If missing, install from RHEL DVD/repo:
sudo dnf install -y python3.12 tar unzip gzip
```

#### 4. User Permissions

```bash
# Must run installation as root or with sudo
sudo -v

# Check you have root access
sudo whoami
# Should output: root
```

---

## Installation Procedure

### Step 1: Prepare Installation Directory

```bash
# Create temporary directory for installation
sudo mkdir -p /tmp/kamiwaza-install
cd /tmp/kamiwaza-install

# Copy RPM file here (if not already present)
# cp /path/to/kamiwaza-*.rpm .
```

### Step 2: Install RPM with Offline Flag

```bash
# Install in offline mode (NO NETWORK ACCESS)
sudo rpm -ivh kamiwaza-*.rpm --postinst-args="--offline"
```

**What happens during installation:**

1. **Package extraction** - RPM contents extracted to system
2. **User creation** - `kamiwaza` user created
3. **NVM installation** - NVM + Node.js 22.11.0 installed
4. **Python setup** - Virtual environments created, packages installed
5. **Frontend setup** - Node modules installed
6. **Docker images** - Pre-packaged images loaded
7. **Service configuration** - Systemd services configured
8. **Permissions** - All files properly configured

### Step 3: Monitor Installation

The installation takes approximately **15-30 minutes** depending on system speed.

**In another terminal, monitor progress:**
```bash
# Watch installation logs
sudo tail -f /var/log/kamiwaza-postinst-debug.log
```

**Look for these key messages:**
```
[INFO] OFFLINE MODE: Installing NVM from pre-packaged tarball...
[INFO] ✓ NVM offline package extracted successfully
[INFO] OFFLINE MODE: Using pre-installed Node.js from NVM offline cache
[INFO] OFFLINE MODE: Skipping pip upgrade to avoid network access
[INFO] ✓ Offline Python wheels installed successfully (no network access)
[INFO] OFFLINE MODE: Installing frontend node_modules in offline mode
[INFO] OFFLINE MODE: Loading offline Docker images
[INFO] ✓ Loaded XX Docker images from offline cache
```

**Warning signs to watch for:**
```
WARNING: Retrying after connection broken...
ERROR: Network is unreachable
```
⚠️ If you see these, the offline mode may not be working correctly.

---

## Post-Installation Verification

### Step 1: Verify Installation Completed

```bash
# Check installation log for success
sudo tail -20 /var/log/kamiwaza-postinst-debug.log

# Should see:
# === Kamiwaza RPM offline installation complete! ===
```

### Step 2: Verify Kamiwaza User

```bash
# Check kamiwaza user exists
id kamiwaza

# Expected output:
# uid=1001(kamiwaza) gid=1001(kamiwaza) groups=1001(kamiwaza),docker
```

### Step 3: Verify NVM and Node.js

```bash
# Check NVM installed
sudo su - kamiwaza -c 'source ~/.nvm/nvm.sh && nvm --version'
# Expected: 0.39.0 or similar

# Check Node.js version
sudo su - kamiwaza -c 'node --version'
# Expected: v22.11.0

# Check npm version
sudo su - kamiwaza -c 'npm --version'
# Expected: 10.x.x
```

### Step 4: Verify Python Packages

```bash
# Activate virtual environment and check packages
sudo su - kamiwaza
source /opt/kamiwaza/kamiwaza/venv/bin/activate
pip list | wc -l
# Expected: ~247 packages

# Check specific critical packages
pip show fastapi ray pydantic
# Should show package details for each

exit  # Exit from kamiwaza user
```

### Step 5: Verify Docker

```bash
# Check Docker installed and running
sudo systemctl status docker

# Check Docker images loaded
sudo docker images | grep -E "kamiwaza|traefik|milvus|qdrant"
# Should show multiple Kamiwaza-related images
```

### Step 6: Verify Kamiwaza Installation

```bash
# Check Kamiwaza directory
ls -la /opt/kamiwaza/kamiwaza/

# Check critical files exist
ls -l /opt/kamiwaza/kamiwaza/venv/
ls -l /opt/kamiwaza/kamiwaza/frontend/node_modules/
ls -l /home/kamiwaza/.nvm/
```

### Step 7: Run Installation Verification Script

```bash
#!/bin/bash
# Save as: verify-installation.sh

echo "=========================================="
echo "Kamiwaza Installation Verification"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

CHECKS=0
PASSED=0

# Check 1: Kamiwaza user
echo -n "1. Kamiwaza user exists: "
if id kamiwaza &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 2: Installation directory
echo -n "2. Installation directory: "
if [ -d "/opt/kamiwaza/kamiwaza" ]; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 3: NVM installed
echo -n "3. NVM installed: "
if [ -f "/home/kamiwaza/.nvm/nvm.sh" ]; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 4: Node.js version
echo -n "4. Node.js 22.11.0: "
NODE_VER=$(sudo -u kamiwaza bash -c 'source ~/.nvm/nvm.sh && node --version' 2>/dev/null)
if [ "$NODE_VER" = "v22.11.0" ]; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (found: $NODE_VER)"
fi
CHECKS=$((CHECKS + 1))

# Check 5: Python venv
echo -n "5. Python virtual environment: "
if [ -d "/opt/kamiwaza/kamiwaza/venv" ]; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 6: Python packages
echo -n "6. Python packages installed: "
PKG_COUNT=$(sudo -u kamiwaza bash -c 'source /opt/kamiwaza/kamiwaza/venv/bin/activate && pip list 2>/dev/null | wc -l')
if [ "$PKG_COUNT" -gt 100 ]; then
    echo -e "${GREEN}✓${NC} ($PKG_COUNT packages)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (only $PKG_COUNT packages)"
fi
CHECKS=$((CHECKS + 1))

# Check 7: Frontend node_modules
echo -n "7. Frontend dependencies: "
if [ -d "/opt/kamiwaza/kamiwaza/frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 8: Docker running
echo -n "8. Docker service: "
if sudo systemctl is-active --quiet docker; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

# Check 9: Docker images
echo -n "9. Docker images loaded: "
IMAGE_COUNT=$(sudo docker images | grep -v REPOSITORY | wc -l)
if [ "$IMAGE_COUNT" -gt 5 ]; then
    echo -e "${GREEN}✓${NC} ($IMAGE_COUNT images)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (only $IMAGE_COUNT images)"
fi
CHECKS=$((CHECKS + 1))

# Check 10: Kamiwaza command
echo -n "10. Kamiwaza command available: "
if command -v kamiwaza &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC}"
fi
CHECKS=$((CHECKS + 1))

echo ""
echo "=========================================="
echo "Results: $PASSED/$CHECKS checks passed"
echo "=========================================="

if [ "$PASSED" -eq "$CHECKS" ]; then
    echo -e "${GREEN}✓ Installation verified successfully!${NC}"
    echo "You can now start Kamiwaza with: kamiwaza start"
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo "Please review the installation logs:"
    echo "  sudo journalctl -t kamiwaza-postinst"
    exit 1
fi
```

**Run verification:**
```bash
chmod +x verify-installation.sh
sudo bash verify-installation.sh
```

---

## Starting Kamiwaza

### Step 1: Start Kamiwaza Services

```bash
# Start Kamiwaza
kamiwaza start

# This will:
# 1. Start etcd
# 2. Start CockroachDB
# 3. Start Ray cluster
# 4. Start Docker containers (Traefik, Milvus, etc.)
# 5. Start Kamiwaza API
# 6. Start Frontend
```

### Step 2: Monitor Startup

```bash
# Check status
kamiwaza status

# Watch logs
sudo journalctl -u kamiwaza.service -f
```

### Step 3: Verify Services Running

```bash
# Check all services
kamiwaza status

# Expected output:
# ✓ etcd: Running
# ✓ CockroachDB: Running
# ✓ Ray: Running
# ✓ Docker: Running
# ✓ Kamiwaza API: Running
# ✓ Frontend: Running

# Check Docker containers
sudo su kamiwaza
docker ps -a 

# Should see containers for:
# - traefik
# - milvus
# - qdrant (if applicable)
# - other Kamiwaza services
```

### Step 4: Access Kamiwaza

```bash
# Check API is responding
curl -k https://localhost/api/ping

# Expected response:
# {"status":"pong","timestamp":1234567890.123}

# Access Web UI
# Open browser to: https://<server-ip>/
```

---

## Troubleshooting

### Issue 1: "Network unreachable" Errors

**Symptoms:**
```
WARNING: Retrying after connection broken...
[Errno 101] Network is unreachable
```

**Cause:** Offline mode not properly engaged

**Solution:**
```bash
# Verify you used --offline flag
rpm -ivh kamiwaza.rpm --postinst-args="--offline"
                                      ^^^^^^^^^^ Must include this!

# If already installed, reinstall:
sudo rpm -e kamiwaza
sudo rpm -ivh kamiwaza.rpm --postinst-args="--offline"
```

### Issue 2: "NVM not found"

**Symptoms:**
```
nvm.sh: No such file or directory
```

**Cause:** NVM offline package missing or not extracted

**Solution:**
```bash
# Verify NVM package in RPM
rpm -qlp kamiwaza.rpm | grep nvm-offline.tar.gz

# If missing, you need a complete offline RPM package
```

### Issue 3: "Docker images not found"

**Symptoms:**
```
docker: no such image
```

**Solution:**
```bash
# Check if images were loaded
sudo docker images

# If no images, check if zip was in RPM
rpm -qlp kamiwaza.rpm | grep docker_images.zip

# Manually load if needed (but shouldn't be necessary)
```

### Issue 4: "Python packages missing"

**Symptoms:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Check what was installed
source /opt/kamiwaza/kamiwaza/venv/bin/activate
pip list

# If packages missing, verify wheels were in RPM
rpm -qlp kamiwaza.rpm | grep "\.whl" | wc -l
# Should show ~247 packages
```

### Getting Help

If you encounter issues:

1. **Collect logs:**
```bash
sudo journalctl -t kamiwaza-postinst > kamiwaza-install.log
sudo kamiwaza status > kamiwaza-status.log
sudo docker ps -a > docker-status.log
```

2. **Check verification:**
```bash
sudo bash verify-installation.sh > verification-results.txt
```

3. **Contact support** with these files

---

## Complete Installation Checklist

### Pre-Installation
- [ ] RHEL 9.6+ or RHEL 10.x system
- [ ] At least 50GB free disk space
- [ ] 16GB+ RAM
- [ ] Root/sudo access
- [ ] kamiwaza-*.rpm file received
- [ ] Run `verify-offline-rpm.sh` - all checks passed

### Installation
- [ ] Run: `sudo rpm -ivh kamiwaza-*.rpm --postinst-args="--offline"`
- [ ] Monitor logs for completion (15-30 minutes)
- [ ] No "network unreachable" errors in logs

### Post-Installation
- [ ] Run `verify-installation.sh` - all checks passed
- [ ] Kamiwaza user exists
- [ ] Node.js v22.11.0 installed
- [ ] ~247 Python packages installed
- [ ] Docker images loaded
- [ ] All services configured

### Startup
- [ ] Run: `sudo kamiwaza start`
- [ ] All services show "Running" in status
- [ ] API responds to: `curl -k https://localhost/api/ping`
- [ ] Web UI accessible at: `https://<server-ip>/`

---

## Summary

### What You Need

1. **kamiwaza-<version>-offline.rpm** (~2-3GB)
2. **RHEL 9.6+/10.x** system
3. **Root access**
4. **NO internet connection required**

### Installation Command

```bash
sudo rpm -ivh kamiwaza-*.rpm --postinst-args="--offline"
```

### Verification Command

```bash
sudo bash verify-installation.sh
```

### Start Command

```bash
sudo kamiwaza start
```

### Access

- **API**: `https://localhost/api/ping`
- **Web UI**: `https://<server-ip>/`

---

## Complete Offline Package Contents

The offline RPM package includes everything needed:

| Component | Location in RPM | Purpose |
|-----------|----------------|---------|
| Kamiwaza binaries | `/opt/kamiwaza/kamiwaza/` | Main application |
| NVM + Node.js | `/usr/share/kamiwaza/offline_nodejs/` | JavaScript runtime |
| Frontend deps | `/usr/share/kamiwaza/offline_node_modules/` | Web UI dependencies |
| Python packages | `/usr/share/kamiwaza/offline_python_wheels/` | API dependencies (~247) |
| Docker images | `/usr/share/kamiwaza/offline_docker_images/` | Container images |
| Docker binaries | `/usr/share/kamiwaza/offline_docker/` | Container runtime |
| CockroachDB | `/usr/share/kamiwaza/offline_cockroach/` | Database |
| etcd | `/usr/share/kamiwaza/offline_etcd/` | Key-value store |
| CFSSL | `/usr/share/kamiwaza/offline_cfssl/` | Certificate tools |

**Total**: Everything needed for complete offline installation with zero internet access! 🎉

