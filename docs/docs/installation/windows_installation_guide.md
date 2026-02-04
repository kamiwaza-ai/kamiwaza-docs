# Windows Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 11
- **Memory**: 8GB RAM minimum (16GB+ recommended)
- **GPU**: NVIDIA modern GPUs and Intel Arc Supported (requires drivers)
- **Storage**: 20GB free disk space
- **Architecture**: x64 (64-bit) processor
- **Administrator Access**: The installer will request permission when needed

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

### Step 2: Install Docker Desktop

Docker is required for running Kamiwaza. If you do not already have Docker installed, download [Docker Desktop](https://www.docker.com/products/docker-desktop/) from the official website and follow the instructions.

Verify your Docker installation:
```
docker --version
```

### Step 3: Verify GPU Access (If Applicable)

**Note**: GPU verification will be performed automatically during installation. The installer will detect and configure GPU access for supported hardware.

**Supported GPUs:**
- NVIDIA GeForce RTX series (30, 40 and 50 series)
- Intel Arc GPUs

**Note**: Kamiwaza currently supports only NVIDIA GPUs and Intel Arc GPUs for hardware acceleration. For Intel Arc GPU setup instructions, please refer to the separate Intel Arc WSL [GPU virtualization documentation](gpu_setup_guide.md#intel-arc-gpu-setup).

### Step 4: Install Windows Terminal (Optional but Recommended)

Download from Microsoft Store or GitHub releases

## Download and Installation

### Step 1: Download Kamiwaza Installer

Download the Windows MSI installer:
- **Download**: [kamiwaza_installer_0.9.3_x86_64.msi](https://packages.kamiwaza.ai/msi/kamiwaza_installer_0.9.3_x86_64.msi)
- **Size**: Approximately 30-40MB

### Step 2: Run the Installer

1. Locate the downloaded MSI file in your Downloads folder
2. Double-click to run the installer
3. When prompted by Windows User Account Control, click "Yes" to allow the installer to make changes to your device
4. Follow the installation wizard

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
- Download and install Ubuntu 24.04 WSL distribution (if not present)
- Reserve network ports (61100-61299)
- Detect GPU hardware (NVIDIA RTX, Intel Arc only)
- Configure WSL environment with optimized settings
- Install Kamiwaza platform in dedicated WSL instance
- Setup GPU acceleration (if compatible hardware detected)

**Expected Installation Time:**
- **Standard Installation**: 15-30 minutes
- **First-time WSL Setup**: Add 10-15 minutes
- **Large Package Downloads**: May take longer on slower connections

### Step 4: GPU Driver Restart

If GPU acceleration was configured, you'll be prompted to restart your device. It is recommended to restart immediately to ensure proper GPU driver initialization.

## Access Your Installation

### Option 1: System Tray Access (Primary Method)

After installation, Kamiwaza will automatically launch and appear in your system tray. Right-click the Kamiwaza system tray icon to access the following options:

- **Show Kamiwaza Manager** - Open the main management interface
- **Kamiwaza Status** - Check current platform status
- **Start Kamiwaza** - Start the platform if stopped
- **Stop Kamiwaza** - Stop the running platform
- **Open Kamiwaza** - Launch the web interface
- **Exit** - Close the system tray application

### Option 2: WSL Command Line Access

Access the Kamiwaza WSL environment and start the platform:
```bash
wsl -d kamiwaza
kamiwaza start
```

### Option 3: Start Menu Shortcuts

After installation, find these shortcuts in Start Menu → "Kamiwaza":
- **Install Kamiwaza** - Initial setup and installation
- **Start Platform** - Launch Kamiwaza platform
- **Cleanup WSL** - Complete removal tool

### Option 4: Direct Browser Access

Once running, access Kamiwaza at:
- **URL**: `https://localhost`

## Platform Management

### Primary Method: System Tray

The easiest way to manage Kamiwaza is through the system tray icon. Right-click the Kamiwaza icon in your system tray to access all management options.

### Alternative Method: Command Line

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
- The installer will automatically download and install Ubuntu 24.04 if needed
- If installation fails, check existing distributions: `wsl --list --verbose`
- Re-run the installer if necessary

#### Memory Allocation Errors
- Reduce memory allocation in installer
- Ensure sufficient free RAM on system
- Close other memory-intensive applications

#### GPU Detection Issues
- Ensure latest GPU drivers are installed
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
- **Technical Support**: [Contact our support team](intro.md#need-help)
- **License Issues**: [Contact our support team](intro.md#need-help)

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

**Last Updated**: September 3th, 2025 