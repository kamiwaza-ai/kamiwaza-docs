# Community Edition Installation on Linux and macOS

This guide covers installing Kamiwaza Community Edition on Linux and macOS using the pre-built tarball bundles.

## Before You Start

1. Review the [System Requirements](system_requirements.md) - especially the prerequisites
2. Ensure you have administrator/sudo privileges
3. Verify Docker is installed and working (see [Verifying System Requirements](system_requirements.md#verifying-system-requirements))

---

## macOS (Sequoia 15+)

### 1) Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2) Install and start Docker Desktop

```bash
brew install --cask docker
open -a Docker
# Wait for Docker to start, then verify:
docker --version && docker compose version
```

### 3) Download and install Kamiwaza

The installer automatically handles Python (via pyenv), Node.js (via nvm), and other dependencies.

```bash
mkdir -p ~/kamiwaza && cd ~/kamiwaza
curl -L -O https://github.com/kamiwaza-ai/kamiwaza-community-edition/raw/main/kamiwaza-community-0.9.2-OSX.tar.gz
tar -xvf kamiwaza-community-0.9.2-OSX.tar.gz
bash install.sh --community
```

---

## Linux (Ubuntu 22.04 and 24.04 LTS)

### 1) System update and core packages

Kamiwaza supports Python 3.10-3.12. Ubuntu 22.04 ships with Python 3.10 and Ubuntu 24.04 ships with Python 3.12 - both work out of the box.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-dev python3-venv python-is-python3 golang-cfssl etcd-client net-tools curl jq libcairo2-dev libgirepository1.0-dev cmake libcurl4-openssl-dev
```

### 2) Verify Docker

Docker Engine with Compose v2 is required. If not installed, see the [Docker Install Guide](https://docs.docker.com/engine/install/ubuntu/).

```bash
# Verify Docker is installed and accessible
docker --version && docker compose version

# If you get "permission denied", add yourself to the docker group:
# sudo usermod -aG docker $USER && newgrp docker
```

### 3) (Optional) Verify CockroachDB - Full Mode Only

Skip this section if you're using Lite mode (the default). CockroachDB is only required for Full mode (`--full` flag). See [System Requirements](system_requirements.md#linux-full-mode-only) for installation links.

```bash
cockroach version
# Expected: Build Tag: v23.2.x
```

### 4) (Optional) Verify GPU Support

Skip this section if you don't have a GPU or don't need GPU acceleration. See [System Requirements](system_requirements.md#gpu-drivers-required-for-gpu-inference) for installation guides.

**NVIDIA:**
```bash
# Verify driver
nvidia-smi

# Verify Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.4.1-runtime-ubuntu22.04 nvidia-smi
```

**AMD ROCm:**
```bash
# Verify ROCm installation
rocm-smi

# Verify Docker access
docker run --rm --device /dev/kfd --device /dev/dri rocm/pytorch:latest rocm-smi
```

### 5) Download and install Kamiwaza

```bash
mkdir -p ~/kamiwaza && cd ~/kamiwaza
wget https://github.com/kamiwaza-ai/kamiwaza-community-edition/raw/main/kamiwaza-community-0.9.2-UbuntuLinux.tar.gz
tar -xvf kamiwaza-community-0.9.2-UbuntuLinux.tar.gz
bash install.sh --community
```

---

## Start the Platform

After installation completes:

```bash
cd ~/kamiwaza  # or your install directory
source .venv/bin/activate
bash startup/kamiwazad.sh start
```

Access the web console at `https://localhost`

- **Default Username:** `admin`
- **Default Password:** `kamiwaza`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker permission denied | `sudo usermod -aG docker $USER && newgrp docker` |
| Python version errors | Kamiwaza supports Python 3.10-3.12. Python 3.13+ is not yet supported. |
| NVIDIA GPU not detected | See [Verifying System Requirements](system_requirements.md#nvidia-gpu-if-applicable) |
| Windows GPU setup | See [Windows GPU Setup Guide](gpu_setup_guide.md) |

## Notes

- Check the [Kamiwaza Community Edition releases](https://github.com/kamiwaza-ai/kamiwaza-community-edition) for the latest available version.
- The installer automatically sets up Python virtual environments, Node.js, and required packages.
