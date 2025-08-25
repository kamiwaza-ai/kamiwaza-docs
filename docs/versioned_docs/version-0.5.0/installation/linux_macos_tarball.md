# Community Edition Installation on Linux and macOS

This guide covers installing Kamiwaza Community Edition on Linux and macOS using the pre-built tarball bundles.

## Before you start

- Review the [System Requirements](system_requirements.md)
- Ensure you have administrator/sudo privileges
- Recommended: Latest Docker Desktop (macOS) or Docker Engine (Linux)

## macOS (Sequoia 15+)

### 1) Install Homebrew and core tools

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew update
brew install pyenv pyenv-virtualenv docker cairo gobject-introspection jq cfssl etcd cmake
brew install cockroachdb/tap/cockroach
```

### 2) Install Docker Desktop

```bash
brew install --cask docker
open -a Docker
# optional if Docker created files as root
sudo chown -R "$(whoami)":staff ~/.docker || true
```

### 3) Configure Python 3.10 with pyenv

```bash
echo 'export PATH="$HOME/.pyenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.zshrc
source ~/.zshrc
pyenv install 3.10
pyenv local 3.10
```

### 4) Install Node.js 22 with NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="${XDG_CONFIG_HOME:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 22
```

### 5) Download and install Kamiwaza (tarball)

```bash
mkdir -p ~/kamiwaza && cd ~/kamiwaza
# Example for 0.5.0 (replace with the latest available version if needed)
curl -L -O https://github.com/kamiwaza-ai/kamiwaza-community-edition/raw/main/beta/kamiwaza-community-0.5.0-OSX.tar.gz
tar -xvf kamiwaza-community-0.5.0-OSX.tar.gz
bash install.sh --community
```

## Linux (Ubuntu 22.04 and 24.04 LTS)

### 1) **[For Ubuntu 24.04 only]** Install Python 3.10
Kamiwaza CE requires Python 3.10. These commands will install Python 3.10 on Ubuntu 24.04.

```bash
sudo apt update
sudo apt install software-properties-common -y
```
```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
```

### 2) System update and core packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.10 python3.10-dev libpython3.10-dev python3.10-venv golang-cfssl python-is-python3 etcd-client net-tools curl jq libcairo2-dev libgirepository1.0-dev
```

### 3) Node.js 22 with NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="${XDG_CONFIG_HOME:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 22
```

### 4) Docker Engine + Compose v2

```bash
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/v2.39.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
sudo usermod -aG docker $USER
# Log out and back in (or reboot) so the docker group membership takes effect
```

### 5) Install CockroachDB and additional dependencies

```bash
wget -qO- https://binaries.cockroachdb.com/cockroach-v23.2.12.linux-amd64.tgz | tar xvz
sudo cp cockroach-v23.2.12.linux-amd64/cockroach /usr/local/bin
sudo apt install -y libcairo2-dev libgirepository1.0-dev
```

### 6) (Optional) NVIDIA GPU support

Use this section if all of the following are true:

- You are on Ubuntu 22.04 or 24.04 (bare metal or a VM with GPU passthrough)
- The host has an NVIDIA GPU and you want GPU acceleration
- You are not on macOS (macOS does not support NVIDIA GPUs)

If you are installing on an Ubuntu 22.04 or 24.04 instance with an NVIDIA GPU where `nvidia-smi` doesn't work, you likely need to do this. However, many cloud-provided images come with NVIDIA drivers pre-installed.

Install the recommended NVIDIA driver, then the NVIDIA Container Toolkit, and configure Docker:

```bash
# 1) Install the recommended NVIDIA driver
## If 'ubuntu-drivers' is missing, install it first:
##   sudo apt update && sudo apt install -y ubuntu-drivers-common
sudo apt update
sudo ubuntu-drivers autoinstall
```

Perform system reboot:
```
sudo reboot
```

After the reboot, install the container toolkit and configure Docker:

```bash
# 2) Install NVIDIA Container Toolkit repository and package
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
sudo apt update
sudo apt install -y nvidia-container-toolkit

# 3) Configure Docker to use the NVIDIA runtime and restart Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 4) Test GPU access from Docker (should print nvidia-smi output and exit)
docker run --rm --gpus all nvidia/cuda:12.4.1-runtime-ubuntu22.04 nvidia-smi
```

Verify the driver is installed with:
```
nvidia-smi
```

Notes:

- If Secure Boot is enabled, you may be prompted to enroll MOK during driver installation.
- On some servers, you may prefer `nvidia-driver-550-server`. If you need a specific version: `sudo apt install -y nvidia-driver-550-server`.
- The `nvidia-docker2` meta-package is no longer required; use `nvidia-container-toolkit` with `nvidia-ctk` instead.

### 7) Download and install Kamiwaza (tarball)

```bash
mkdir -p ~/kamiwaza && cd ~/kamiwaza
# Example for 0.5.0 (replace with the latest available version if needed)
wget https://github.com/kamiwaza-ai/kamiwaza-community-edition/raw/main/beta/kamiwaza-community-0.5.0-UbuntuLinux.tar.gz
tar -xvf kamiwaza-community-0.5.0-UbuntuLinux.tar.gz
bash install.sh --community
```

## Start the platform

After installation completes:

```bash
# Community Edition
bash startup/kamiwazad.sh start
```

Access the web console at `https://localhost`

- Default Username: `admin`
- Default Password: `kamiwaza`

## Troubleshooting

- Docker permissions: ensure your user is in the `docker` group (Linux) and re-login/reboot.
- Python version: Kamiwaza requires Python 3.10. If you used 3.11+, reinstall 3.10 and rerun the installer.
- GPU: For Linux NVIDIA issues, validate `nvidia-smi` works inside Docker as shown above. For Windows GPU setup, see [Windows GPU Setup Guide](gpu_setup_guide.md).

## Notes

- Replace example tarball URLs with the latest version as needed.
- The installer sets up virtual environments, required packages, and initial configuration automatically.


