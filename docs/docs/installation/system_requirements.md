# Kamiwaza System Requirements & Installation Guide

## Base System Requirements

### Supported Operating Systems
- Linux: Ubuntu 22.04 LTS (primary) - **Now supports .deb package installation**
- macOS: 12.0 or later (community edition only)

### Core Requirements
- Python 3.10 (Python 3.10.14 tested)
- Docker Engine with Compose v2
- Node.js 22 (installed via NVM during setup)
- Minimum 10GB free disk space
- For GPU support: NVIDIA GPU with compute capability 7.0+

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

## Installation Methods

1. **Ubuntu .deb Package (Recommended for Ubuntu 22.04)**
   - Download and install the official Kamiwaza .deb package
   - Automated dependency resolution and system configuration
   - Simplest installation method for Ubuntu users
   - See [Installation Guide](installation_process.md) for detailed steps

2. **Cloud Marketplace Images**
   - Pre-configured enterprise images
   - Automated disk & network setup
   - GPU support included

3. **Enterprise Edition Installation**
   - Automated installation scripts
   - Configurable for head/worker nodes
   - Full cluster support

4. **Community Edition Installation**
   - Local installation
   - Simplified configuration
   - Single-node focused

## Important Notes

- **System Impact**: Network and kernel configurations can affect other services
- **Security**: Certificate generation and management for cluster communications
- **GPU Support**: Available only on Linux with NVIDIA GPUs
- **Storage**: Enterprise Edition requires specific storage configuration
- **Network**: Enterprise Edition requires specific network ports for cluster communication
- **Docker**: Custom Docker root configuration may affect other containers

## Additional Considerations

### Memory Requirements
- Minimum: 16GB RAM
- Recommended: 32GB RAM
- GPU Workloads: 32GB RAM + GPU vRAM

### Network Ports
Enterprise Edition requires:
- 443/tcp: HTTPS primary access
- 51100-51199/tcp: Deployment ports for model instances (will also be used for 'App Garden' in the future)

### Version Compatibility
- Docker Engine: 20.10 or later
- NVIDIA Driver: 450.80.02 or later
- ETCD: 3.5 or later
- Node.js: 22.x (installed automatically)

This represents a comprehensive organization of the system requirements and dependencies based on the provided scripts and configuration files. The distinction between Enterprise and Community editions is maintained throughout, and important system configurations are clearly documented.