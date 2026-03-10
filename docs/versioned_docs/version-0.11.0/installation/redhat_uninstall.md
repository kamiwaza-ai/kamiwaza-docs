# Uninstalling Kamiwaza (RHEL 9)

Below is a reproducible uninstallation procedure for removing Kamiwaza from an RPM-installed RHEL 9 host running the Kubernetes-based deployment.

> **Important:** These commands are destructive — they delete the Kind cluster, container images, and configuration files. Run only if you understand the impact.

---

## Quick Summary

1. Delete the Kind cluster
2. Remove container images from Podman
3. Remove the RPM package
4. Clean up remaining files
5. Verify removal

---

## Commands

### 1) Delete the Kind Cluster

```bash
# Delete the Kamiwaza production cluster
sudo kind delete cluster --name kamiwaza-prod

# Remove any leftover Kind configuration
sudo rm -rf /opt/kamiwaza/wrap/
sudo rm -f /tmp/kamiwaza-helm-reassembled.tar.sha256.ok
```

### 2) Remove Container Images

```bash
# Remove all Podman images (optional — frees disk space)
sudo podman system prune -a -f

# Or selectively remove kamiwaza-related images
sudo podman images --format '{{.Repository}}:{{.Tag}}' | grep -i kamiwaza | \
  xargs -r sudo podman rmi -f
```

### 3) Remove the RPM Package

```bash
sudo dnf remove -y kamiwaza-prod
```

### 4) Clean Up Remaining Files

```bash
# Remove platform files (permanent — back up any data you need first)
sudo rm -rf /opt/kamiwaza

# Remove prereq bootstrap state
sudo rm -rf /var/lib/kamiwaza

# Remove install logs
sudo rm -f /var/log/kamiwaza_install_prod.log

# Remove helm plugins profile script
sudo rm -f /etc/profile.d/kamiwaza-helm-plugins.sh
```

### 5) Verification

```bash
# Package should be gone
if rpm -q kamiwaza-prod >/dev/null 2>&1; then
  echo "WARNING: RPM package 'kamiwaza-prod' still installed"
else
  echo "OK: 'kamiwaza-prod' package not installed"
fi

# No Kind cluster
if kind get clusters 2>/dev/null | grep -q kamiwaza-prod; then
  echo "WARNING: Kind cluster 'kamiwaza-prod' still exists"
else
  echo "OK: no kamiwaza-prod Kind cluster"
fi

# /opt/kamiwaza should not exist
if [ -d /opt/kamiwaza ]; then
  echo "WARNING: /opt/kamiwaza still exists"
else
  echo "OK: /opt/kamiwaza removed"
fi

# kubectl should show no kamiwaza resources
if kubectl get ns kamiwaza >/dev/null 2>&1; then
  echo "WARNING: kamiwaza namespace still exists"
else
  echo "OK: no kamiwaza namespace"
fi
```

---

## Single Script (Automated)

Save as `uninstall_kamiwaza.sh`, make executable (`chmod +x`), then run with `sudo`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Deleting Kind cluster..."
kind delete cluster --name kamiwaza-prod || true

echo "Pruning Podman images..."
podman system prune -a -f || true

echo "Removing kamiwaza-prod package..."
dnf remove -y kamiwaza-prod || true

echo "Cleaning up files..."
rm -rf /opt/kamiwaza
rm -rf /var/lib/kamiwaza
rm -f /var/log/kamiwaza_install_prod.log
rm -rf /opt/kamiwaza-bundle
rm -f /tmp/kamiwaza-helm-reassembled.tar.sha256.ok
rm -f /etc/profile.d/kamiwaza-helm-plugins.sh

echo "Done. Run verification commands to confirm complete removal."
```

---

## Notes

- These commands **permanently delete** the cluster, images, and configuration. Back up any data before proceeding.
- If you only want to **upgrade** (not completely remove), do not delete `/opt/kamiwaza`. Keep configuration for the upgrade path.
- If your instance used custom paths for model data or other storage, remove those explicitly for a complete purge.
- To reinstall after uninstalling, follow the [RHEL Offline Installation Guide](redhat_offline_install.md).
