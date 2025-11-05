---
title: ReBAC Deployment Guide
sidebar_label: ReBAC Deployment Guide
---

Use this guide to bring the Kamiwaza authentication and relationship-based access control (ReBAC) stack online for lab, pilot, or production deployments. It assumes you have installed the current Kamiwaza platform bundle (RPM or container images) and can restart services via the provided scripts.

> Internal operators should continue using the detailed runbooks in the private `kamiwaza` repository (`docs-internal/guides/`). This page is safe to share with customer teams.

## Platform assumptions

- Host meets the published system requirements (minimum RHEL 9.6+ for this release). See [System Requirements](../installation/system_requirements.md) for the full matrix.
- Installation created the managed systemd units or Docker Compose stack for Auth, Keycloak, and Traefik.
- You have shell access to restart those services and reach the Traefik gateway externally.

---

## Prerequisites

| Item | Notes |
|------|-------|
| Keycloak 22.x+ | Administrative access to create a realm and confidential client. |
| Kamiwaza platform install | Current RPM build (or the equivalent compose stack). |
| Shell access | Ability to edit `env.sh`, run helper scripts, and restart Auth/Keycloak/Traefik. |
| TLS assets | Certificates for the public gateway hostname (self-signed is fine for labs). |

Before starting, stop the Auth, Keycloak, and Traefik services (docker compose or systemd) so configuration changes and realm imports apply cleanly. You will restart them later in this guide.

---

## Configure environment

Update `env.sh` (or export the variables directly) with the ReBAC settings below. Replace the placeholders with values that match your environment.

```bash
# Auth gateway ↔ Keycloak
export AUTH_GATEWAY_OIDC_ENABLED=true
export AUTH_GATEWAY_KEYCLOAK_URL=https://<keycloak-host>
export AUTH_GATEWAY_KEYCLOAK_REALM=<realm>
export AUTH_GATEWAY_KEYCLOAK_CLIENT_ID=kamiwaza-platform
export AUTH_GATEWAY_KEYCLOAK_CLIENT_SECRET=<client-secret>
export AUTH_GATEWAY_PUBLIC_URL=https://<gateway-host>
export AUTH_GATEWAY_COOKIE_DOMAIN=<gateway-host>

# ForwardAuth secret shared with Traefik
export AUTH_FORWARD_AUTH_STRICT=true
export AUTH_FORWARD_HEADER_SECRET=$(openssl rand -hex 32)

# ReBAC session store
export AUTH_REBAC_ENABLED=true
export AUTH_REBAC_BACKEND=postgres
export AUTH_REBAC_SESSION_ENABLED=true
export AUTH_REBAC_SESSION_REDIS_URL=rediss://<redis-host>:6380/0
export AUTH_REBAC_SESSION_ALLOW_INSECURE=false  # set true only for localhost labs
```

Where to substitute values:

- `<keycloak-host>` – the external hostname for the Keycloak realm (for example `sso.example.com`).
- `<realm>` – the Keycloak realm that contains the Kamiwaza client (default `kamiwaza`).
- `<gateway-host>` – the public Traefik hostname for the Kamiwaza environment.
- `<client-secret>` – the confidential client secret created in Keycloak for `kamiwaza-platform`.
- `<redis-host>` – the TLS endpoint of the Redis deployment used for ReBAC sessions (include a custom port if it is not `6380`).

After updating the file, reload it so the helper scripts and restart commands pick up the new values (especially `KAMIWAZA_KEYCLOAK_ADMIN_PASSWORD`).

```bash
source env.sh
```

:::tip Local development
For quick experiments, use `https://localhost` for `AUTH_GATEWAY_PUBLIC_URL` and set `AUTH_REBAC_SESSION_REDIS_URL=redis://localhost:6379/0` with `AUTH_REBAC_SESSION_ALLOW_INSECURE=true`. Switch to TLS (`rediss://`) before promoting the environment.
:::

---

## Seed demo realm & client metadata

Run the helper to import the UAT realm, create the confidential client, and generate `runtime/oidc-uat.env` with matching values. If the packaged Keycloak is already running on the host, include `--no-start-keycloak` (to avoid port conflicts) and `--skip-install` (to bypass macOS bootstrap helpers).

```bash
./scripts/run_oidc_uat.sh --no-smoke --skip-install --no-start-keycloak \
  --callback-url "https://<gateway-host>/api/auth/callback"
source runtime/oidc-uat.env
```

The helper writes `runtime/oidc-uat.env` with the gateway OIDC exports so follow-on scripts stay in sync. If you need to regenerate credentials (for example, after rotating secrets), rerun the helper with the same flags. Linux hosts can omit `--skip-install`; keep it on macOS to avoid rerunning the bootstrap installer. Keycloak administrator credentials continue to be managed by the install prelaunch step; they are not copied into that snapshot. Use the built-in utility (or read the secret file directly) to retrieve the value needed for the login test:

```bash
make auth-print-admin-password
# or, if Make is unavailable:
cat "${KAMIWAZA_ROOT:-$PWD}/runtime/secrets/keycloak-admin-password"
```

If the command reports that the password is unavailable, ensure the packaged Keycloak stack has been started at least once (for example, `./containers-up.sh keycloak` or the equivalent systemd unit) so the prelaunch script can write the secret.

:::note
If you are seeding from a workstation that is not running the packaged stack, omit `--no-start-keycloak` so the helper can launch its disposable Keycloak container.
:::

---

## Restart core services

Bounce the authentication plane so the new settings apply:

If you installed via the developer bundle, use the deployment helpers to bounce the containers so the new configuration is picked up. Run these from the repository root after `source env.sh`; set the swarm role explicitly (single-node labs export `KAMIWAZA_SWARM_HEAD=true`, multi-node environments can export `KAMIWAZA_HEAD_IP=<manager-ip>` instead). Use `sudo` if the helper needs to create `/etc/kamiwaza` swarm metadata or secrets:

```bash
export KAMIWAZA_SWARM_HEAD=${KAMIWAZA_SWARM_HEAD:-true}
sudo ./containers-down.sh keycloak
sudo ./containers-up.sh keycloak
sudo ./containers-down.sh traefik
sudo ./containers-up.sh traefik
./stop-core.sh
./start-env.sh -y "${KAMIWAZA_ENV:-default}"
```

If the helper reports the node is already part of a swarm, either reuse the existing manager by exporting `KAMIWAZA_HEAD_IP=<manager-ip>` before rerunning, or leave the old swarm (`docker swarm leave --force`) and re-run with `KAMIWAZA_SWARM_HEAD=true`.

If you are running the packaged RPM install under systemd, restart the bundled service and confirm its status:

```bash
sudo systemctl daemon-reload
sudo systemctl restart kamiwaza.service
sudo systemctl status kamiwaza.service --no-pager
```

If your site defines additional Kamiwaza units, list them first and restart only the ones that exist (for example, a custom Keycloak unit):

```bash
sudo systemctl list-units '*kamiwaza*' --no-pager
sudo systemctl restart kamiwaza-keycloak.service   # only if present
```

If you made changes to the deployment assets in `deployment/`, rerun `./copy-compose.sh` before the restart so the staged Compose bundles pick up the latest configuration.

---

## Verify login & header passthrough

1. Visit `https://<gateway-host>/api/auth/login` and sign in with the credentials seeded by the helper (defaults `admin` / `kamiwaza`; confirm the password with `make auth-print-admin-password` or by reading `runtime/secrets/keycloak-admin-password`).
2. Call the validation endpoint to ensure the session cookie works. Copy the session cookie from your browser (Developer Tools → Application → Cookies) and pass it in the request:
   ```bash
   curl -i https://<gateway-host>/api/auth/validate \
     -H "Cookie: <copied-session-cookie>"
   ```
   Expect HTTP `200` with `X-User-*` headers.
3. If you receive a redirect loop or `401`, confirm `AUTH_GATEWAY_COOKIE_DOMAIN` matches the hostname, re-run `source env.sh`, and rerun `run_oidc_uat.sh` with the same flags you used earlier so the helper can refresh the Keycloak client metadata. Re-check the admin password with `make auth-print-admin-password` if the login still fails.

---

## Next steps

- Walk through the [ReBAC validation checklist](./rebac-validation-checklist.md) to exercise tuple enforcement and decision logging.
- Review the [ReBAC overview](./rebac-overview.md) for architecture context.
- Coordinate with your security team to replace the demo realm with production IdP settings before go-live.

---

## Troubleshooting

- **`Authentication failed` during Keycloak login** – confirm the admin password by checking `KEYCLOAK_ADMIN_PASSWORD` in `runtime/oidc-uat.env`. If it does not match what you are entering, run `source env.sh` followed by `./scripts/run_oidc_uat.sh` with the same flags to regenerate the client and credentials.
- **`KAMIWAZA_KEYCLOAK_ADMIN_PASSWORD is missing` when restarting containers** – ensure you have run `source env.sh` in the current shell before invoking `docker compose` so the restart inherits the required variables. Re-run `copy-compose.sh` if you have not refreshed the deployment artifacts since editing `env.sh`.
