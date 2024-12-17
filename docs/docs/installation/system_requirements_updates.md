# System Requirements & Dependencies

## Preamble

Please pay attention to the notes regarding kernel modules and network configuration, as they can be material to systems outside of Kamiwaza's functions.

This captures for Linux. See [osx_system_requirements_updates.md](./os_system_requirements_updates.md) for OSX.

## Base System Requirements
- Ubuntu 22.04 LTS
- Python 3.10 (Python 3.10.14 is tested)
- Docker Engine

## System Packages & Dependencies
The following system-level components are installed by Kamiwaza. We have different installation paths:

- Enterprise images in clouds, pre-built
- Installable Enterprise Edition software, which includes scripts which install these dependencies
- Community Edition software, which likewise includes scripts which install these dependencies

### Core Dependencies
```bash
python3.10
python3.10-dev
libpython3.10-dev
python3.10-venv
golang-cfssl
python-is-python3
etcd-client
net-tools
```

(Other packages are installed by those packages, e.g. `python3.10-dev` installs `python3.10-venv` and `libpython3.10-dev`)

### Graphics & System Libraries
```bash
libcairo2-dev
libgirepository1.0-dev
```

### NVIDIA Components
- NVIDIA Driver (550-server)
- NVIDIA Container Toolkit
- nvidia-docker2

### Docker Configuration
- Docker Engine
- Docker Compose v2
- System user added to docker group


### Kernel Modules ⚠️⚠️

These are required for Swarm backend networking.

- Kernel modules enabled:
  - overlay
  - br_netfilter


### Network Configuration ⚠️⚠️⚠️⚠️⚠️



The following sysctl settings are configured:
```bash
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
```

### Required Directories
```bash
/etc/kamiwaza/
├── config/
├── ssl/
└── swarm/

/opt/kamiwaza/
├── containers/
├── logs/
└── volumes/
```

## Note
These components are installed and configured by the installation scripts (1.sh, 2.sh, install.sh) and are required for Kamiwaza to function properly.  Generally speaking, if you install with `--communtity` you will find these componetns skipped (eg, `/etc/kamiwaza/ssl/`) or present in the kamiwaza install folder (`env.sh`). 


