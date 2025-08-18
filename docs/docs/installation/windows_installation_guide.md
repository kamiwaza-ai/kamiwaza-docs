# Kamiwaza Windows Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 11
- **Memory**: 8GB RAM minimum (16GB+ recommended)
- **GPU**: NVIDIA 50 series and Intel Arc Supported (requires drivers)
- **Storage**: 20GB free disk space
- **Architecture**: x64 (64-bit) processor
- **Administrator Access**: Required for initial setup

### Recommended for Optimal Performance
- **Memory**: 32GB+ RAM for large workloads
- **GPU**: NVIDIA GeForce RTX series or Intel Arc GPU (for hardware acceleration)
- **Storage**: SSD with 50GB+ free space

## Prerequisites Setup

### Step 1: Enable WSL (Windows Subsystem for Linux)

If WSL is not already installed on your system:

1. Open PowerShell as Administrator
   - Right-click Start button → "Windows PowerShell (Admin)"
2. Install WSL
   ```powershell
   wsl --install
   ```
3. Restart your computer when prompted
4. Verify WSL installation
   ```powershell
   wsl --version
   ```

### Step 2: Install Ubuntu 24.04 WSL Distribution

1. Create directory for WSL distribution
   ```powershell
   mkdir C:\WSL\Ubuntu24.04
   ```

2. Download Ubuntu 24.04 WSL image
   ```powershell
   Invoke-WebRequest -Uri "https://cloud-images.ubuntu.com/wsl/releases/24.04/current/ubuntu-noble-wsl-amd64-wsl.rootfs.tar.gz" -OutFile "C:\WSL\ubuntu-24.04.tar.gz"
   ```

3. Import the distribution
   ```powershell
   wsl --import Ubuntu-24.04 C:\WSL\Ubuntu24.04 C:\WSL\ubuntu-24.04.tar.gz --version 2
   ```

   **Note**: If the Ubuntu-24.04 distribution already exists, skip to Step 3.

### Step 3: Verify GPU Access (If Applicable)

Ensure your Ubuntu 24.04 WSL distribution has GPU access:

**For NVIDIA GPUs:**
```bash
wsl -d Ubuntu-24.04
nvidia-smi
```

**For Intel Arc GPUs:**
```bash
wsl -d Ubuntu-24.04
clinfo | grep GPU
```

**Note**: Kamiwaza currently supports only NVIDIA GPUs and Intel Arc GPUs for hardware acceleration. For Intel Arc GPU setup instructions, please refer to the separate Intel Arc WSL GPU virtualization documentation.

### Step 4: Install Windows Terminal (Optional but Recommended)

Download from Microsoft Store or GitHub releases

## Download and Installation

### Step 1: Download Kamiwaza Installer

Contact your Kamiwaza representative to obtain the installer download link or file:
- **File**: `KamiwazaInstaller-[version]-[arch].msi`
- **Size**: Approximately 150-300MB

### Step 2: Run the Installer

1. Locate the downloaded MSI file in your Downloads folder
2. Left click to run and follow the installation wizard

**Configuration Options:**
- **Email Address**: Your registered email address
- **License Key**: Provided by Kamiwaza support
- **Installation Mode**:
  - **Lite** - Basic installation (recommended for most users)
  - **Full** - Complete installation with all features
- **Dedicated Memory**: Select RAM allocation for Kamiwaza
  - **Recommended**: 50%-75% of total system RAM
  - **Example**: 16GB system → Select 12GB allocation

### Step 3: Installation Process

The installer will automatically:
- Detect your existing Ubuntu-24.04 WSL distribution
- Reserve network ports (61100-61299)
- Detect GPU hardware (NVIDIA RTX, Intel Arc only)
- Configure WSL environment with optimized settings
- Install Kamiwaza platform in dedicated WSL instance
- Setup GPU acceleration (if compatible hardware detected)

**Expected Installation Time:**
- **Standard Installation**: 15-30 minutes
- **First-time WSL Setup**: Add 10-15 minutes
- **Large Package Downloads**: May take longer on slower connections

### Step 4: GPU Driver Restart (If Applicable)

If GPU acceleration was configured, you'll be prompted:
```
=== SYSTEM RESTART RECOMMENDED ===
Would you like to restart your computer now? (y/N):
```

- **Recommended**: Type `y` and press Enter to restart
- **Alternative**: Type `n` to restart manually later

## Access Your Installation

### Option 1: WSL Command Line Access (Primary Method)

Access the Kamiwaza WSL environment and start the platform:
```bash
wsl -d kamiwaza
kamiwaza start
```

### Option 2: Start Menu Shortcuts

After installation, find these shortcuts in Start Menu → "Kamiwaza":
- **Install Kamiwaza** - Initial setup and installation
- **Start Platform** - Launch Kamiwaza platform
- **Cleanup WSL** - Complete removal tool

### Option 3: Direct Browser Access

Once running, access Kamiwaza at:
- **URL**: `https://localhost`

## Platform Management

### Basic Commands

From PowerShell or Command Prompt:
```bash
# Start Kamiwaza
wsl -d kamiwaza -- kamiwaza start

# Stop Kamiwaza  
wsl -d kamiwaza -- kamiwaza stop

# Restart Kamiwaza
wsl -d kamiwaza -- kamiwaza restart

# Check status
wsl -d kamiwaza -- kamiwaza status
```

## Troubleshooting

### Common Issues

#### Installation Fails with "WSL not found"
- Ensure WSL is installed: `wsl --install`
- Restart computer after WSL installation
- Verify with: `wsl --version`

#### Ubuntu-24.04 Distribution Not Found
- Verify the distribution was imported correctly
- Check existing distributions: `wsl --list --verbose`
- Re-run the import command if necessary

#### Memory Allocation Errors
- Reduce memory allocation in installer
- Ensure sufficient free RAM on system
- Close other memory-intensive applications

#### GPU Detection Issues
- Ensure latest GPU drivers are installed
- Verify WSL2 (not WSL1) is being used: `wsl --list --verbose`
- Check Windows version supports GPU passthrough
- Confirm GPU compatibility (NVIDIA or Intel Arc only)

#### Network Access Problems
- Check Windows Firewall settings
- Verify ports 61100-61299 are available
- Try accessing `https://localhost` instead of `http://`

## Getting Help

### Check Installation Logs

**WSL logs:**
```bash
wsl -d kamiwaza -- journalctl -t kamiwaza-install
```

**Windows logs:**
- Check Event Viewer → Applications

Installation and other logs should also be located on your Windows device at: `C:\Users\[USER]\AppData\Local\Kamiwaza\logs`

### GPU Status Check
```bash
wsl -d kamiwaza -- /usr/local/bin/kamiwaza_gpu_status.sh
```

### Support Contact
- **Technical Support**: [Insert support email/portal]
- **Documentation**: [Insert documentation link]
- **License Issues**: [Insert license support contact]

## Uninstallation

To completely remove Kamiwaza:

### Option 1: Use Windows Settings
1. Settings → Apps → Find "Kamiwaza Installer" → Uninstall

### Option 2: Use Start Menu shortcut
1. Start Menu → Kamiwaza → "Cleanup WSL (Uninstall)"

### Option 3: Manual cleanup if needed
```bash
wsl --unregister kamiwaza
```

---

**Version**: Compatible with Kamiwaza Installer v0.5.0  
**Last Updated**: August 7th, 2025  
**Support**: [INSERT_SUPPORT_CONTACT] 