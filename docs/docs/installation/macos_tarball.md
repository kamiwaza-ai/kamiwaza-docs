# Community Edition Installation on macOS

This guide covers installing Kamiwaza Community Edition on macOS using the pre-built tarball bundle.

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
curl -L -O https://github.com/kamiwaza-ai/kamiwaza-community-edition/raw/main/kamiwaza-community-0.9.3-OSX.tar.gz
tar -xvf kamiwaza-community-0.9.3-OSX.tar.gz
bash install.sh --community
```

---

## Start the Platform

After installation completes:

```bash
cd ~/kamiwaza  # or your install directory
source .venv/bin/activate
bash startup/kamiwazad.sh restart
```

Access the web console at `https://localhost`

- **Default Username:** `admin`
- **Default Password:** `kamiwaza`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker permission denied | Ensure Docker Desktop is running |
| Python version errors | Kamiwaza supports Python 3.10-3.12. Python 3.13+ is not yet supported. |

## Notes

- Check the [Kamiwaza Community Edition releases](https://github.com/kamiwaza-ai/kamiwaza-community-edition) for the latest available version.
- The installer automatically sets up Python virtual environments, Node.js, and required packages.
