# Uninstalling Kamiwaza (RPM-installed instance)

Below is a reproducible uninstallation procedure you can run on an **RPM-installed** instance to completely remove **kamiwaza** from a server.

> **Important:** many of these commands are destructive (they stop/remove Docker containers, delete images and config files). Run only if you understand the impact or run on a test host first.

---

## Quick summary
1. Stop kamiwaza.  
2. Stop & remove Docker containers (conservative and thorough variants shown).  
3. Remove Docker images whose repository begins with `kamiwaza`.  
4. Remove the RPM package (`dnf remove`).  
5. (Complete removal) Remove `/etc/kamiwaza` and optional leftover systemd unit / docker volumes/networks.  
6. Verify removal.

---

## Commands (copy / paste)

### 1) Stop kamiwaza
```bash
# prefer the kamiwaza command; fall back to systemd if present
sudo kamiwaza stop || true
sudo systemctl stop kamiwaza.service 2>/dev/null || true
sudo systemctl disable kamiwaza.service 2>/dev/null || true
```

### 2) Remove Docker containers

> Below are two options — the conservative version (stops/removes running containers only) and the thorough version (stops/removes all containers, running or stopped).

**Conservative – stop and remove current running containers only:**
```bash
# stop running containers (no-op if none)
if [ "\$(docker ps -q)" ]; then
  sudo docker stop \$(docker ps -q)
  sudo docker rm -v \$(docker ps -q)
fi
```

**Thorough – stop and remove ALL containers (running + stopped):**
```bash
# stop running containers
if [ "\$(docker ps -q)" ]; then
  sudo docker stop \$(docker ps -q)
fi

# remove all containers (including stopped) and their anonymous volumes
if [ "\$(docker ps -aq)" ]; then
  sudo docker rm -v \$(docker ps -aq)
fi
```

### 3) Remove Docker images that begin with \`kamiwaza\`
```bash
# remove images whose repository name starts with "kamiwaza"
sudo docker images 'kamiwaza*' -q | uniq | xargs -r sudo docker rmi -f
```
\`xargs -r\` avoids errors when there are no matching images. \`-f\` forces removal if images are in use (only used after containers removed).

**Optional cleanup for Docker volumes & networks created by kamiwaza**
```bash
# remove volumes with name starting kamiwaza
sudo docker volume ls --format '{{.Name}}' | grep '^kamiwaza' | xargs -r sudo docker volume rm

# remove networks with name starting kamiwaza
sudo docker network ls --format '{{.Name}}' | grep '^kamiwaza' | xargs -r sudo docker network rm
```

### 4) Remove the RPM package
```bash
# remove package via dnf (add -y to auto-confirm)
sudo dnf remove kamiwaza
# or to auto-confirm:
# sudo dnf remove -y kamiwaza
```

### 5) (If full removal, not an upgrade) delete config dir and service unit
```bash
# remove config directory (dangerous — permanent)
sudo rm -rf /etc/kamiwaza

# remove possible systemd unit files left behind (optional)
sudo rm -f /etc/systemd/system/kamiwaza.service /usr/lib/systemd/system/kamiwaza.service
sudo systemctl daemon-reload || true
```

### 6) Verification / sanity checks
```bash
# package should be gone
if rpm -q kamiwaza >/dev/null 2>&1; then
  echo "WARNING: rpm package 'kamiwaza' still installed"
else
  echo "OK: 'kamiwaza' package not installed"
fi

# no kamiwaza docker images
if [ -n "\$(sudo docker images 'kamiwaza*' -q)" ]; then
  echo "WARNING: some kamiwaza docker images still exist:"
  sudo docker images 'kamiwaza*'
else
  echo "OK: no docker images starting with 'kamiwaza' found"
fi

# no containers
if [ -n "\$(sudo docker ps -aq)" ]; then
  echo "WARNING: there are still docker containers on the host"
else
  echo "OK: no docker containers remain"
fi


# /opt/kamiwaza should not exist
if [ -d /opt/kamiwaza ]; then
  echo "WARNING: /opt/kamiwaza still exists"
else
  echo "OK: /opt/kamiwaza removed"
fi

# /etc/kamiwaza should not exist
if [ -d /etc/kamiwaza ]; then
  echo "WARNING: /etc/kamiwaza still exists"
else
  echo "OK: /etc/kamiwaza removed"
fi

# systemd check
systemctl status kamiwaza.service >/dev/null 2>&1 && echo "WARNING: systemd unit present" || echo "OK: no active systemd kamiwaza unit"
```

---

## Single script (automated)
Save as \`uninstall_kamiwaza.sh\`, make executable (\`chmod +x\`), then run. This script uses the *thorough* container removal variant and fully deletes \`/etc/kamiwaza\`.
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Stopping kamiwaza..."
sudo kamiwaza stop || sudo systemctl stop kamiwaza.service || true
sudo systemctl disable kamiwaza.service || true

echo "Stopping and removing all docker containers..."
if [ "\$(docker ps -q)" ]; then sudo docker stop \$(docker ps -q); fi
if [ "\$(docker ps -aq)" ]; then sudo docker rm -v \$(docker ps -aq); fi

echo "Removing kamiwaza docker images..."
sudo docker images 'kamiwaza*' -q | uniq | xargs -r sudo docker rmi -f

echo "Removing kamiwaza package..."
sudo dnf remove -y kamiwaza

echo "Removing /etc/kamiwaza (full removal)..."
sudo rm -rf /etc/kamiwaza

echo "Optional: removing kamiwaza docker volumes/networks..."
sudo docker volume ls --format '{{.Name}}' | grep '^kamiwaza' | xargs -r sudo docker volume rm || true
sudo docker network ls --format '{{.Name}}' | grep '^kamiwaza' | xargs -r sudo docker network rm || true

sudo rm -f /etc/systemd/system/kamiwaza.service /usr/lib/systemd/system/kamiwaza.service || true
sudo systemctl daemon-reload || true

echo "Done. Run verification commands if desired."
```

---

## Notes & cautions
- These commands will **permanently delete** containers, images and configuration. Back up any data you may need before removing volumes or \`/etc/kamiwaza\`.  
- Docker commands assume you can run \`docker\` as your user or with \`sudo\`. If your environment requires \`sudo docker\`, the provided commands already use \`sudo\` in the script; adjust if needed.  
- If you only want to upgrade (not completely remove), **do not** delete \`/etc/kamiwaza\`. Keep configuration for the upgrade path.  
- If your instance used other locations for kamiwaza data (for example \`/var/lib/kamiwaza\`, \`/opt/kamiwaza\`, or custom docker volumes), remove those explicitly if you want a complete purge.

---

### Optional: cleanup finder
If you’d like, you can search for other kamiwaza-related files with:
```bash
sudo find / -type f -iname '*kamiwaza*' -maxdepth 6 2>/dev/null
sudo find / -type d -iname '*kamiwaza*' -maxdepth 6 2>/dev/null
```

