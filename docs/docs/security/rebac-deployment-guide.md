---
title: ReBAC Deployment Guide
sidebar_label: ReBAC Deployment Guide
---

Use this guide to bring the Kamiwaza authentication and relationship-based access control (ReBAC) stack online for lab, pilot, or production deployments. It assumes you have installed the current Kamiwaza platform bundle (RPM or container images) and can restart services via the provided scripts.
## Platform assumptions

- Host meets the published system requirements. See [System Requirements](../installation/system_requirements.md) for the supported operating systems and hardware profiles.
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
export AUTH_CALLBACK_URL=https://<gateway-host>/api/auth/callback
# Optional: only set if the Keycloak client enforces confidential secret auth
# export AUTH_GATEWAY_KEYCLOAK_CLIENT_SECRET=<client-secret>
export AUTH_GATEWAY_PUBLIC_URL=https://<gateway-host>
export AUTH_GATEWAY_COOKIE_DOMAIN=<gateway-host>

# ForwardAuth secret shared with Traefik
export AUTH_FORWARD_AUTH_STRICT=true
export AUTH_FORWARD_HEADER_SECRET=<64-hex-secret>

# ReBAC session store
export AUTH_REBAC_ENABLED=true
export AUTH_REBAC_BACKEND=postgres
export AUTH_REBAC_SESSION_ENABLED=true
export AUTH_REBAC_SESSION_REDIS_URL=rediss://<redis-host>:6380/0
export AUTH_REBAC_SESSION_ALLOW_INSECURE=false  # set true only for localhost labs
# Tenant defaults & PAT tagging
export AUTH_REBAC_DEFAULT_TENANT_ID="__default__"  # single-tenant labs; omit for multi-tenant installs
export AUTH_PAT_TENANT_TAGGING_ENABLED=true        # ensures new PATs include tenant_id
# Optional: override only if you must disable automatic tuple writes (defaults to true when ReBAC is enabled)
# export AUTH_DATASET_OWNER_TUPLES_ENABLED=true

# ForwardAuth policy file (stateless requirement)
export AUTH_GATEWAY_POLICY_FILE=$KAMIWAZA_ROOT/config/auth_gateway_policy.yaml
```

:::caution Avoid stale overrides
If `env.sh` already contains older `AUTH_GATEWAY_*` exports, remove or comment them before adding the block above. Leaving legacy lines (for example, forcing `https://127.0.0.1` or generating a fresh client secret with `$(openssl rand -hex 32)`) overrides the helper output and will cause the Keycloak callback to fail. After running `run_oidc_uat.sh`, rely on the values written to `runtime/oidc-uat.env`.
:::

:::note
The default `env.sh.example` ships with `AUTH_CALLBACK_URL=http://localhost:7777/api/auth/callback`. Update it to the HTTPS gateway URL (`https://<gateway-host>/api/auth/callback`) so the Keycloak redirect matches the public entrypoint.
:::

:::tip Quick sanity check
1. Verify only the new `AUTH_GATEWAY_*` block exists in `env.sh` by running `grep AUTH_GATEWAY env.sh`. The helper-generated `runtime/oidc-uat.env` should report the same values.
2. Generate a single ForwardAuth secret and let the rotation helper copy it everywhere:
   ```bash
   ./scripts/rotate-auth-secrets.sh --secret AUTH_FORWARD_HEADER_SECRET --skip-compose
   ```
   (The helper rewrites `env.sh`, `runtime/oidc-uat.env`, and every staged `kamiwaza-traefik/.env` file.)
3. Rerun `./copy-compose.sh`, then bounce Traefik and the core stack:
   ```bash
   sudo ./containers-down.sh traefik && sudo ./containers-up.sh traefik
   ./startup/kamiwazad.sh restart-core
   ```
4. Confirm every staged env file reports the same secret:
   ```bash
   grep AUTH_FORWARD_HEADER_SECRET env.sh runtime/oidc-uat.env \
       deployment/envs/${KAMIWAZA_ENV:-default}/kamiwaza-traefik/*/.env
   ```

If any of these values drift, Traefik forwards unsigned headers and the UI reports `forward_auth_signature_invalid` during model downloads.
:::

Where to substitute values:

- `<keycloak-host>` – the external hostname for the Keycloak realm (for example `sso.example.com`).
- `<realm>` – the Keycloak realm that contains the Kamiwaza client (default `kamiwaza`).
- `<gateway-host>` – the public Traefik hostname for the Kamiwaza environment.
- `<client-secret>` – only required if the `kamiwaza-platform` client is configured as confidential with client-secret authentication.
- `<redis-host>` – the TLS endpoint of the Redis deployment used for ReBAC sessions (include a custom port if it is not `6380`).

After updating the file, reload it so the helper scripts and restart commands pick up the new values (especially `KAMIWAZA_KEYCLOAK_ADMIN_PASSWORD`).

```bash
source env.sh
source runtime/oidc-uat.env   # generated by scripts/run_oidc_uat.sh
```

`runtime/oidc-uat.env` is the source of truth for the Keycloak client metadata (issuer URL, JWKS path, client ID/secret). Never reintroduce older exports that point at different hosts or regenerate fresh secrets—those overrides are the most common root cause of `{"detail":"Authentication failed"}` when the gateway restarts.

:::tip Environment-specific Redis settings
Local labs usually run the bundled Redis instance without authentication. In that case, export:

```bash
export AUTH_REBAC_SESSION_ALLOW_INSECURE=true
export AUTH_REBAC_SESSION_REDIS_URL=redis://localhost:6379/0
```

As soon as you point the gateway at a secured or shared Redis deployment, switch to a credentialed URL—e.g. `rediss://user:pass@redis.example.com:6380/0`—and omit `AUTH_REBAC_SESSION_ALLOW_INSECURE`.
:::

### Tenant fallback for labs

Stage‑1 bundles do not yet stamp `tenant_id` into the access token. Until the Keycloak protocol mapper is in place, allow the gateway to fall back to the `__default__` tenant by exporting:

```bash
export AUTH_REBAC_ALLOW_COMMUNITY_FALLBACK=true
export AUTH_REBAC_DEFAULT_TENANT_ID="__default__"
```

Only use these flags in local or UAT environments. As soon as tokens carry real tenant metadata, remove both exports so ReBAC enforces per-tenant policy.

### Logout redirect expectations
  
  - Set `KAMIWAZA_UI_URL` to the full UI base (including any subpath) so logout returns users to the correct page. Example: `https://ui.example/app`.
  - The gateway only trusts forwarded hosts that match the allowed hosts (UI URL or request host). Mismatched `X-Forwarded-Host` values are ignored.
  - Localhost fallback (`https://localhost/login`) is used only when `KAMIWAZA_COMMUNITY` or `KAMIWAZA_LITE` is set. Without those flags and no valid base, logout returns HTTP 500 instead of redirecting to `/`.

  ### ReBAC manifest on RPM installs
   - The RPM does not include `configs/rebac/tenants` or a default manifest. ReBAC still runs, but no tuples are preseeded. To bootstrap tuples, create `configs/rebac/tenants` under `/opt/kamiwaza/kamiwaza`, add a manifest (for example `__default__.yaml` from the repo/docs), and run your bootstrap/drift checks. Otherwise, you can run with an empty graph and add tuples later.
    
### Seed ReBAC tuples

Before operators can download or deploy a model they must be granted the appropriate tuples in the target tenant.

1. **Bootstrap the tenant manifest (recommended).**
   ```bash
   python scripts/rebac_tenant.py bootstrap configs/rebac/tenants/__default__.yaml
   ```
   Expected output:
   ```
   INFO:kamiwaza.services.auth.bootstrap:Applied tenant bootstrap
   INFO:rebac_tenant:Tenant bootstrap applied successfully
   ```
   Replace the manifest path with your tenant-specific file in production.

   - The manifests live in `configs/rebac/tenants/*.yaml`. Copy `__default__.yaml` to a tenant-specific file (for example `configs/rebac/tenants/acme-labs.yaml`) and edit the `relationships` section to declare owners, editors, and viewers for your resources.
   - Preview changes with `python scripts/rebac_tenant.py plan <manifest>` before applying them with `bootstrap`. The CLI is idempotent and can target a different tenant using `--tenant tenant-id`.

2. **Optionally add ad-hoc tuples** by editing the manifest and rerunning `plan`/`bootstrap`. Example entry:

   ```yaml
   relationships:
     - subject: user:analyst@example.com
       relation: viewer
       object: dataset:govdocs-ingest
   ```

   Apply the change:

   ```bash
   python scripts/rebac_tenant.py plan configs/rebac/tenants/acme-labs.yaml
   python scripts/rebac_tenant.py bootstrap configs/rebac/tenants/acme-labs.yaml
   ```

   Production environments should rely on the automatic owner helper (enabled by default when `AUTH_REBAC_ENABLED=true`) so catalog/model uploads seed owner/editor/viewer tuples without manual intervention. Use manifest edits for explicit overrides or cross-team sharing.

### quick smoke test

After the bootstrap, verify allow/deny flows before handing the stack to analysts:

1. Upload a dataset (or use an existing one) via the `/api/catalog/datasets/` endpoint.
2. Confirm list calls work:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://<gateway>/api/catalog/datasets/
   ```
   Expected: HTTP `200` with the uploaded dataset URN in the JSON payload.
3. Confirm direct lookups succeed:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        "https://<gateway>/api/catalog/datasets/by-urn?urn=<dataset-urn>"
   ```
   Expected: HTTP `200` with the dataset metadata. A `403 rebac_denied` indicates tuples are missing; re-run the bootstrap manifest.

Re-run the smoke test any time you rotate manifests or onboard a new tenant to ensure the guard coverage remains intact.

---

## Seed demo realm & client metadata

Run the helper to import the UAT realm, create the confidential client, and generate `runtime/oidc-uat.env` with matching values. If the packaged Keycloak is already running on the host, include `--no-start-keycloak` (to avoid port conflicts) and `--skip-install` (to bypass macOS bootstrap helpers).

```bash
./scripts/run_oidc_uat.sh --no-smoke --skip-install --no-start-keycloak \
  --callback-url "https://<gateway-host>/api/auth/callback"
```

After generating the realm, reload your shell environment so the new client metadata is active for subsequent commands:

```bash
source env.sh
source runtime/oidc-uat.env
```

The helper writes `runtime/oidc-uat.env` with the gateway OIDC exports so follow-on scripts stay in sync. If you need to regenerate credentials (for example, after rotating secrets), rerun the helper with the same flags. Linux hosts can omit `--skip-install`; keep it on macOS to avoid rerunning the bootstrap installer. Keycloak administrator credentials continue to be managed by the install prelaunch step; they are not copied into that snapshot. Use the built-in utility (or read the secret file directly) to retrieve the value needed for the login test:

```bash
cat "${KAMIWAZA_ROOT:-$PWD}/runtime/secrets/keycloak-admin-password"
```

If the file is missing, ensure the packaged Keycloak stack has been started at least once (for example, `./containers-up.sh keycloak` or the equivalent systemd unit) so the prelaunch script can write the secret.

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
./startup/kamiwazad.sh restart-core
```

If the helper reports the node is already part of a swarm, either reuse the existing manager by exporting `KAMIWAZA_HEAD_IP=<manager-ip>` before rerunning, or leave the old swarm (`docker swarm leave --force`) and re-run with `KAMIWAZA_SWARM_HEAD=true`.

If you are running the RPM or DEB services under systemd, restart the bundled service and confirm its status. Package installs also ship a convenience wrapper, `sudo kamiwaza restart-core`, which orchestrates the same steps.

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

:::tip
If `./startup/kamiwazad.sh` is not executable (for example, `zsh: permission denied`), run `chmod +x startup/kamiwazad.sh` once before invoking `restart-core`.
:::

---

### Using an external identity provider

Keycloak ships with the bundle to keep the walkthrough self-contained. To exercise a managed provider (Google Workspace, Okta, Azure AD, etc.), create an OIDC client there with the same redirect URI (`https://<gateway-host>/api/auth/callback`) and copy the issued client ID and secret into `env.sh` before sourcing it:

```bash
export AUTH_GATEWAY_KEYCLOAK_URL=https://accounts.google.com      # replace with provider base URL
export AUTH_GATEWAY_KEYCLOAK_REALM=<idp-tenant-or-realm>
export AUTH_GATEWAY_KEYCLOAK_CLIENT_ID=<issued-client-id>
export AUTH_GATEWAY_KEYCLOAK_CLIENT_SECRET=<issued-client-secret>
source env.sh
```

Skip `run_oidc_uat.sh` in that scenario; the managed IdP is now the source of truth. You still need the Redis exports from the earlier tip so the gateway can persist sessions.

---

## Verify login & header passthrough

1. Visit `https://<gateway-host>/api/auth/login` and sign in with the credentials seeded by the helper (defaults `admin` / `kamiwaza`; confirm the password by reading `runtime/secrets/keycloak-admin-password`).
2. Call the validation endpoint to ensure the session cookie works. Copy the `access_token` cookie from your browser (Developer Tools → Application → Cookies → `access_token`) and pass it in the request. Include `-k` when testing against a self-signed certificate.
   ```bash
   curl -ki https://<gateway-host>/api/auth/validate \
     -H "Cookie: access_token=<copied-session-cookie>"
   ```
   Expect HTTP `200` with `X-User-*` headers.
3. If you receive a redirect loop, `401`, or `{"detail":"Authentication failed"}`, confirm `AUTH_GATEWAY_COOKIE_DOMAIN` matches the hostname **and** that every Traefik router attaches the `forwardauth@file` middleware:
   ```bash
   rg -n "forwardauth" deployment/kamiwaza-traefik
   ```
   The `forwardAuth` block must include `authRequestHeaders` (`Cookie`, `Authorization`) and the standard `authResponseHeaders` (`X-User-*` plus the signature fields). After editing, run `./copy-compose.sh`, `sudo ./containers-down.sh traefik`, `sudo ./containers-up.sh traefik`, and `./startup/kamiwazad.sh restart-core`.
4. If signatures still fail, resync the environment exports and restart the services:
   ```bash
   source env.sh
   source runtime/oidc-uat.env
   ./startup/kamiwazad.sh restart-core         # developer bundle
   # or
   sudo kamiwaza restart-core                  # RPM/DEB installs
   ```
   This reloads the current client secret and clears any stale ForwardAuth state. If the admin password is unknown, rerun `scripts/run_oidc_uat.sh` with the same flags and re-check `runtime/secrets/keycloak-admin-password` before retrying the login.

---

## Next steps

- Walk through the [ReBAC validation checklist](./rebac-validation-checklist.md) to exercise tuple enforcement and decision logging.
- Review the [ReBAC overview](./rebac-overview.md) for architecture context.
- Coordinate with your security team to replace the demo realm with production IdP settings before go-live.

---

## Troubleshooting

- **`Authentication failed` during Keycloak login** – confirm the admin password by checking `KEYCLOAK_ADMIN_PASSWORD` in `runtime/oidc-uat.env`. If it does not match what you are entering, run `source env.sh` followed by `./scripts/run_oidc_uat.sh` with the same flags to regenerate the client and credentials.
- **`KAMIWAZA_KEYCLOAK_ADMIN_PASSWORD is missing` when restarting containers** – ensure you have run `source env.sh` in the current shell before invoking `docker compose` so the restart inherits the required variables. Re-run `copy-compose.sh` if you have not refreshed the deployment artifacts since editing `env.sh`.
- **Token exchange fails (`/api/auth/callback` returns 400/502)** – Keycloak is rejecting the client credentials. Verify `AUTH_GATEWAY_KEYCLOAK_CLIENT_SECRET` is not being overridden in `env.sh` (see the caution note above) and matches the secret shown in Keycloak for the `kamiwaza-platform` client. Re-run the helper (`./scripts/run_oidc_uat.sh …`), source `runtime/oidc-uat.env`, restart the services, and inspect `docker logs kamiwaza-keycloak-uat --tail 100` for `invalid_client` or redirect errors.
- **`forward_auth_signature_invalid` when downloading models** – Traefik is rejecting the gateway’s HMAC signature. Confirm `AUTH_FORWARD_HEADER_SECRET` matches across `env.sh`, `runtime/oidc-uat.env`, and `deployment/envs/${KAMIWAZA_ENV:-default}/kamiwaza-traefik/*/.env`. After updating the secret, rerun `./copy-compose.sh` and `./startup/kamiwazad.sh restart-core` so Traefik picks up the change.
