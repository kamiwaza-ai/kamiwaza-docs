# Installing Kamiwaza

## Before You Begin

**Please review the [System Requirements](system_requirements.md) before proceeding with installation.** This document covers:
- Supported operating systems and versions
- Hardware requirements (CPU, RAM, storage)
- Required tools and dependencies
- Network and storage configuration
- GPU support requirements

For customer installs, Kamiwaza assumes the target machine already exists. Provision a RHEL 9 server or cloud instance that meets the published requirements before starting the installer.

## Platform Architecture

Kamiwaza deploys as a Kubernetes application using:
- **Podman** as the container runtime
- **Kind** (Kubernetes in Docker/Podman) for single-node clusters
- **Helm + Helmfile** for declarative application deployment
- **Traefik** for ingress and TLS termination

All services run as pods in a Kubernetes namespace, managed by Helm charts.

## Installation Workflows

### Enterprise Edition — RHEL 9 (Recommended)

The primary supported platform for production deployments is **Red Hat Enterprise Linux 9** (x86_64).

For production installs, start with at least:

- 8 CPU cores
- 64 GB RAM
- 200 GB SSD or NVMe storage

#### Online Installation

Online installation (pulling container images directly from public registries) is not yet available. It is planned for a future release.

#### Offline Installation

For restricted environments without internet access. Uses pre-built Helm wrap bundles containing all container images and charts.

**[Red Hat Offline Installation Guide](redhat_offline_install.md)** — Complete step-by-step instructions.

Quick overview:
```bash
# Install the RPM
sudo rpm -Uvh --replacepkgs ./kamiwaza-prod-*.x86_64.rpm

# Stage wrap bundle files
sudo cp ./kamiwaza-helm.*.tar ./kamiwaza-helm.sha256 ./kamiwaza-helm.asc \
  ./kamiwaza-tools-rpm.pub.gpg /opt/kamiwaza/prereqs/

# Bootstrap prerequisites
sudo /opt/kamiwaza/scripts/bootstrap-prereqs.sh \
  --embedded-root /opt/kamiwaza/prereqs --os rhel

# Run the offline installer
sudo -E /opt/kamiwaza/scripts/install-prod.sh \
  --offline \
  --skip-prereq-bootstrap \
  --domain "YOUR_DOMAIN_HERE" \
  --admin-password "replace-me" \
  --wrap-bundle '/opt/kamiwaza/prereqs/kamiwaza-helm.*.tar' \
  --wrap-sha256 /opt/kamiwaza/prereqs/kamiwaza-helm.sha256 \
  --wrap-signature /opt/kamiwaza/prereqs/kamiwaza-helm.asc \
  --wrap-pubkey /opt/kamiwaza/prereqs/kamiwaza-tools-rpm.pub.gpg \
  -y
```

### Community Edition

#### macOS (Apple Silicon)

Community Edition only. Single-node deployments for local development and evaluation.

1. Follow the guide: [macOS Installation](macos_tarball.md)
2. Uses Kind with Podman Desktop
3. Access via browser at `https://kamiwaza.test`

#### Windows

WSL2-based setup. See the [Windows Installation Guide](windows_installation_guide.md) for prerequisites, GPU support, and step-by-step instructions.

### Multi-Node Deployment

For production clusters spanning multiple hosts, see the [Two-Node Deployment Guide](two-node-deployment.md).

## Verifying Installation

After installation completes, verify the platform is running:

```bash
# Check all pods are healthy
kubectl get pods -n kamiwaza

# Verify external access
curl -kI "https://YOUR_DOMAIN_HERE"
```

Access the web interface at `https://YOUR_DOMAIN_HERE` and sign in with the admin credentials you configured.

## Updating Kamiwaza

To update an existing installation:

1. Obtain the new release artifacts (RPM + wrap bundle)
2. Install the updated RPM: `sudo rpm -Uvh --replacepkgs ./kamiwaza-prod-*.x86_64.rpm`
3. Re-run the installer with the same flags used for the initial install

## Uninstallation

See the [RHEL Uninstall Guide](redhat_uninstall.md) for complete removal instructions including Kind cluster deletion, image cleanup, and file removal.
