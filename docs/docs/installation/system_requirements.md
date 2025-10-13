# System Requirements

## Base System Requirements

### Supported Operating Systems & Architecture
- **Linux**: Ubuntu 24.04 and 22.04 LTS via .deb package installation (x64/amd64 architecture only)
- **Windows**: 11 (x64 architecture) via WSL with MSI installer
- **macOS**: 12.0 or later, Apple Silicon (ARM64) only (community edition only)

### CPU Requirements
- **Architecture**:
  - Linux: x64/amd64 (64-bit)
  - macOS: ARM64 (Apple Silicon) only
  - Windows: x64 (64-bit)
- **Minimum Cores**: 8+ cores
- **Recommended Cores**: 16+ cores for CPU-based inference workloads

### Core Software Requirements
- **Python**: Python 3.10 for tarball installations; Python 3.12 for .deb/.msi installations
- **Docker**: Docker Engine with Compose v2
- **Node.js**: 22.x (installed via NVM during setup)
- **Browser**: Chrome Version 141+ (tested and recommended)
- **GPU Support**: NVIDIA GPU with compute capability 7.0+ (Linux only) or NVIDIA RTX/Intel Arc (Windows via WSL)

### Memory Requirements

#### System RAM
- **Minimum**: 16GB RAM
- **Recommended**: 32GB+ RAM for CPU-based inference workloads
- **GPU Workloads**: 16GB+ system RAM (32GB+ recommended)

#### GPU Memory (vRAM)
- **GPU Inference**: 16GB+ vRAM required
- **Recommended**: 32GB+ vRAM for optimal GPU inference performance

#### Windows (WSL-based) Specific
- **Minimum**: 8GB RAM (limited functionality)
- **Recommended**: 16GB+ RAM
- **Optimal Performance**: 32GB+ RAM for inference workloads
- **Memory Allocation**: 50-75% of system RAM dedicated to Kamiwaza during installation

### Storage Requirements

#### Storage Performance
- **Required**: SSD (Solid State Drive)
- **Preferred**: NVMe SSD for optimal performance
- **Minimum**: SATA SSD
- **Not Supported**: HDD (Hard Disk Drive) - insufficient performance

#### Storage Capacity

**Linux/macOS**
- **Minimum**: 100GB free disk space
- **Recommended**: 200GB+ free disk space
- **Enterprise Edition**: Additional space for /opt/kamiwaza persistence

**Windows**
- **Minimum**: 100GB free disk space
- **Recommended**: 200GB+ free space on SSD
- **WSL**: Automatically manages Ubuntu 24.04 installation space

📋 **For detailed Windows storage and configuration requirements, see the [Windows Installation Guide](windows_installation_guide.md).**

### Windows-Specific Prerequisites
- Windows Subsystem for Linux (WSL) installed and enabled
- Administrator access required for initial setup
- Windows Terminal (recommended for optimal WSL experience)

## Dependencies & Components

### Required System Packages (Linux)
```bash
# Core Python
python3.10
python3.10-dev
libpython3.10-dev
python3.10-venv

# System Tools
golang-cfssl
python-is-python3
etcd-client (v3.5+)
net-tools

# Graphics & Development Libraries
libcairo2-dev
libgirepository1.0-dev
```

### NVIDIA Components (Linux GPU Support)
- NVIDIA Driver (550-server recommended)
- NVIDIA Container Toolkit
- nvidia-docker2

### Windows Components (Automated via MSI Installer)
- Windows Subsystem for Linux (WSL 2)
- Ubuntu 24.04 LTS (automatically downloaded and configured)
- Docker Engine (configured within WSL)
- GPU drivers and runtime (automatically detected and configured)
- Node.js 22 (via NVM within WSL environment)

### Docker Configuration Requirements
- Docker Engine with Compose v2
- User must be in docker group
- Swarm mode (Enterprise Edition)
- Docker data root configuration (configurable)

### Required Directory Structure

#### Enterprise Edition

Note this is created by the installer and present in cloud marketplace images.

```
/etc/kamiwaza/
├── config/
├── ssl/      # Cluster certificates
└── swarm/    # Swarm tokens

/opt/kamiwaza/
├── containers/  # Docker root (configurable)
├── logs/
├── nvm/        # Node Version Manager
└── runtime/    # Runtime files
```

#### Community Edition

We recommend `${HOME}/kamiwaza` or something similar for `KAMIWAZA_ROOT`.

```
$KAMIWAZA_ROOT/
├── env.sh
├── runtime/
└── logs/
```

## Network Configuration

### Network Bandwidth Requirements
- **Minimum**: 10 Gbps network interface
- **Recommended**: 10 Gbps or higher for optimal performance
- **Enterprise Multi-Node**: 10 Gbps minimum between cluster nodes

### Required Kernel Modules (Enterprise Edition Linux Only)
Required modules for Swarm container networking:
- overlay
- br_netfilter

### System Network Parameters (Enterprise Edition Linux Only)

These will be set by the installer.

```bash
# Required sysctl settings for Swarm networking
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
```

### Community Edition Networking
- Uses standard Docker bridge networks
- No special kernel modules or sysctl settings required
- Simplified single-node networking configuration


## Storage Configuration

### Enterprise Edition Requirements

- Primary mountpoint for persistent storage (/opt/kamiwaza)
- Scratch/temporary storage (auto-configured)
- For Azure: Additional managed disk for persistence

### Community Edition

- Local filesystem storage
- Configurable paths via environment variables

## Important Notes

- **System Impact**: Network and kernel configurations can affect other services
- **Security**: Certificate generation and management for cluster communications
- **GPU Support**: Available on Linux (NVIDIA GPUs) and Windows (NVIDIA RTX, Intel Arc via WSL)
- **Storage**: Enterprise Edition requires specific storage configuration
- **Network**: Enterprise Edition requires specific network ports for cluster communication
- **Docker**: Custom Docker root configuration may affect other containers
- **Windows Edition**: Requires WSL 2 and will create a dedicated Ubuntu 24.04 instance
- **Administrator Access**: Windows installation requires administrator privileges for initial setup

## Additional Considerations

### Network Ports

#### Linux/macOS Enterprise Edition
- 443/tcp: HTTPS primary access
- 51100-51199/tcp: Deployment ports for model instances (will also be used for 'App Garden' in the future)

#### Windows Edition
- 443/tcp: HTTPS primary access (via WSL)
- 61100-61299/tcp: Reserved ports for Windows installation

### Version Compatibility
- Docker Engine: 20.10 or later
- NVIDIA Driver: 450.80.02 or later
- ETCD: 3.5 or later
- Node.js: 22.x (installed automatically)

This represents a comprehensive organization of the system requirements and dependencies based on the provided scripts and configuration files. The distinction between Enterprise and Community editions is maintained throughout, and important system configurations are clearly documented.