# Windows Installation Guide

This document provides comprehensive instructions for installing Kamiwaza on Windows 11 using the official MSI installer.

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 11
- **Memory**: 8GB RAM minimum (16GB+ recommended)
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

1. **Open PowerShell as Administrator**
   - Right-click Start button → "Windows PowerShell (Admin)"

2. **Install WSL**
   ```powershell
   wsl --install
   ```

3. **Restart your computer** when prompted

4. **Verify WSL installation**
   ```powershell
   wsl --version
   ```

### Step 2: Install Windows Terminal (Optional but Recommended)

Download from Microsoft Store or [GitHub releases](https://github.com/microsoft/terminal/releases)

## Download and Installation

### Step 1: Download Kamiwaza Installer

Contact your Kamiwaza representative to obtain the installer download link or file:

- **File**: KamiwazaInstaller-[version]-[arch].msi
- **Size**: Approximately 150-300MB

### Step 2: Run the Installer

1. **Locate the downloaded MSI file** in your Downloads folder
2. **Right-click and "Run as administrator"** → Follow the installation wizard

#### Configuration Options

The installer will prompt you for the following configuration:

- **Email Address**: Your registered email address
- **License Key**: Provided by Kamiwaza support
- **Installation Mode**:
  - **Lite** - Basic installation (recommended for most users)
  - **Full** - Complete installation with all features
- **Dedicated Memory**: Select RAM allocation for Kamiwaza
  - **Recommended**: 50%-75% of total system RAM
  - **Example**: 16GB system → Select 12GB allocation

### Step 3: Installation Process

The installer will automatically perform the following steps:

1. **Reserve network ports** (61100-61299)
2. **Detect GPU hardware** (NVIDIA RTX, Intel Arc)
3. **Download Ubuntu 24.04** for WSL
4. **Configure WSL environment** with optimized settings
5. **Install Kamiwaza platform** in dedicated WSL instance
6. **Setup GPU acceleration** (if compatible hardware detected)

#### Expected Installation Time

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

### Option 1: Start Menu Shortcuts

After installation, find these shortcuts in Start Menu → "Kamiwaza":

- **Install Kamiwaza** - Initial setup and installation
- **Start Platform** - Launch Kamiwaza platform
- **Cleanup WSL** - Complete removal tool

### Option 2: Direct Browser Access

Once running, access Kamiwaza at:

```
https://localhost
```

### Option 3: WSL Command Line Access

Access the Kamiwaza WSL environment directly:

```powershell
wsl -d kamiwaza
```

## Troubleshooting

### Common Issues

#### Installation Fails with "WSL not found"

- Ensure WSL is installed: `wsl --install`
- Restart computer after WSL installation
- Verify with: `wsl --version`

#### Memory Allocation Errors

- Reduce memory allocation in installer
- Ensure sufficient free RAM on system
- Close other memory-intensive applications

#### GPU Detection Issues

- Ensure latest GPU drivers are installed
- Verify WSL2 (not WSL1) is being used
- Check Windows version supports GPU passthrough

#### Network Access Problems

- Check Windows Firewall settings
- Verify ports 61100-61299 are available
- Try accessing `https://localhost` instead of `http://`

### Getting Help

#### Check Installation Logs

- **WSL logs**: `wsl -d kamiwaza journalctl -t kamiwaza-install`
- **Windows logs**: Check Event Viewer → Applications

#### GPU Status Check

```powershell
wsl -d kamiwaza -- /usr/local/bin/kamiwaza_gpu_status.sh
```

#### Platform Management

```powershell
# Start Kamiwaza
wsl -d kamiwaza -- kamiwaza start

# Stop Kamiwaza
wsl -d kamiwaza -- kamiwaza stop

# Restart Kamiwaza
wsl -d kamiwaza -- kamiwaza restart
```

### Support Contact

- **Technical Support**: [Contact your Kamiwaza representative]
- **Documentation**: [Kamiwaza Documentation Portal]
- **License Issues**: [License Support Contact]

## Uninstallation

To completely remove Kamiwaza:

1. **Use Windows Settings**
   - Settings → Apps → Find "Kamiwaza Installer" → Uninstall

2. **Or use Start Menu shortcut**
   - Start Menu → Kamiwaza → "Cleanup WSL (Uninstall)"

3. **Manual cleanup if needed**
   ```powershell
   wsl --unregister kamiwaza
   ```

## Advanced Configuration

### Customizing Memory Allocation

After installation, you can modify WSL memory allocation by creating/editing `.wslconfig` in your user home directory:

```ini
[wsl2]
memory=12GB
processors=4
swap=2GB
```

### WSL Performance Optimization

For optimal performance:

1. Store Kamiwaza files on the same drive as your WSL installation
2. Ensure sufficient disk space (minimum 50GB recommended)
3. Use SSD storage when possible
4. Allocate appropriate memory based on your workloads

### Network Configuration

The installer automatically configures:

- Port reservations (61100-61299)
- Windows Firewall exceptions
- WSL network bridge configuration

If you encounter network issues, verify these configurations are intact.

## Important Notes

- **WSL Environment**: Kamiwaza runs in a dedicated Ubuntu 24.04 WSL instance
- **GPU Support**: Automatic detection and configuration for NVIDIA RTX and Intel Arc GPUs
- **Memory Management**: WSL dynamically manages memory allocation within configured limits
- **Network Access**: Primary access via `https://localhost` after startup
- **Start Menu Integration**: Full integration with Windows Start Menu for easy access
- **Automatic Updates**: Future updates will be delivered through the same MSI installer mechanism

---

**Compatible with**: Windows 11 (x64)  
**WSL Version**: WSL 2 with Ubuntu 24.04 LTS  
**Support**: Contact your Kamiwaza representative for technical assistance