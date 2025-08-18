# Kamiwaza Installation Documentation

Welcome to the comprehensive installation guide for Kamiwaza. This documentation covers all supported platforms and installation methods.

## 📚 Available Installation Guides

### 🪟 Windows Installation
- **[Windows Installation Guide](windows_installation_guide.md)** - Complete user guide for Windows 11 with WSL2
- **[Windows Implementation Guide](windows_implementation_guide.md)** - Technical implementation details and advanced features
- **[GPU Setup Guide](gpu_setup_guide.md)** - GPU acceleration setup for NVIDIA, Intel Arc, and Intel Integrated graphics

### 🐧 Linux Installation
- **[Installation Process](installation_process.md)** - Overview of all installation methods including Linux
- **[System Requirements](system_requirements_updates.md)** - Hardware and software requirements

### 🍎 macOS Installation
- **[Installation Process](installation_process.md)** - Overview including macOS installation methods

## 🚀 Quick Start

### For Windows Users
1. **Read**: [Windows Installation Guide](windows_installation_guide.md)
2. **Download**: KamiwazaInstaller-[version]-[arch].msi
3. **Install**: Run the MSI installer
4. **Setup**: Use "Install Kamiwaza" shortcut
5. **Launch**: Use "Start Platform" shortcut

### For Linux Users
1. **Read**: [Installation Process](installation_process.md)
2. **Choose**: Direct install or automated setup
3. **Run**: `install.sh --community`
4. **Verify**: Service should start automatically

### For macOS Users
1. **Read**: [Installation Process](installation_process.md)
2. **Run**: `install.sh --community`
3. **Verify**: Service should start automatically

## 🔧 System Requirements

### Windows
- **OS**: Windows 11 (Build 22000+)
- **Memory**: 8GB RAM minimum (16GB+ recommended)
- **GPU**: NVIDIA RTX series, Intel Arc, or Intel Integrated
- **Storage**: 20GB free disk space
- **Architecture**: x64 (64-bit)

### Linux
- **OS**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **Memory**: 8GB RAM minimum (16GB+ recommended)
- **GPU**: NVIDIA GPU with container runtime (optional)
- **Storage**: 20GB free disk space
- **Architecture**: x64 (64-bit)

### macOS
- **OS**: macOS 11.0+ (Big Sur)
- **Memory**: 8GB RAM minimum (16GB+ recommended)
- **Storage**: 20GB free disk space
- **Architecture**: Intel or Apple Silicon

## 🎯 Installation Features

### Windows-Specific Features
- ✅ **WSL2 Integration** - Dedicated Ubuntu 24.04 instance
- ✅ **GPU Acceleration** - Automatic detection and configuration
- ✅ **Start Menu Integration** - Easy access shortcuts
- ✅ **Port Management** - Automatic port reservation (61100-61299)
- ✅ **Memory Configuration** - Optimized WSL memory allocation

### Cross-Platform Features
- ✅ **Community Edition** - Single-node deployment
- ✅ **Enterprise Edition** - Cluster-capable deployment
- ✅ **Automatic Service Management** - Starts automatically after installation
- ✅ **Comprehensive Logging** - Installation and runtime logs

## 🆘 Getting Help

### Documentation
- **Installation Issues**: Check the troubleshooting sections in each guide
- **GPU Problems**: See [GPU Setup Guide](gpu_setup_guide.md)
- **System Requirements**: Review [System Requirements](system_requirements_updates.md)

### Support
- **Technical Support**: [INSERT_SUPPORT_CONTACT]
- **Documentation Issues**: [INSERT_DOCS_CONTACT]
- **Community**: [INSERT_COMMUNITY_LINK]

## 📋 Installation Checklist

### Before Installation
- [ ] Verify system meets minimum requirements
- [ ] Ensure sufficient disk space (20GB+)
- [ ] Close unnecessary applications
- [ ] Run as Administrator (Windows) or with sudo (Linux/macOS)

### During Installation
- [ ] Follow platform-specific installation guide
- [ ] Note any error messages or warnings
- [ ] Wait for completion before proceeding

### After Installation
- [ ] Verify service is running
- [ ] Test platform access (https://localhost)
- [ ] Check GPU acceleration (if applicable)
- [ ] Review installation logs for any issues

## 🔄 Updating Kamiwaza

### Windows
- Download new MSI installer
- Run installer (will update existing installation)
- Restart if prompted for GPU changes

### Linux/macOS
- Download new package
- Run installation script again
- Service will restart automatically

## 🗑️ Uninstallation

### Windows
- Use "Cleanup WSL" shortcut
- Or uninstall via Windows Settings → Apps

### Linux/macOS
- Remove package via package manager
- Clean up any remaining configuration files

---

**Last Updated**: August 7th, 2025  
**Version**: Compatible with Kamiwaza v0.5.0  
**Support**: [INSERT_SUPPORT_CONTACT] 