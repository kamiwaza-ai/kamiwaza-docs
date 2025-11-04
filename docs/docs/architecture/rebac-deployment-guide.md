---
title: Release 0.7 ReBAC Deployment Guide
sidebar_label: ReBAC Deployment Guide
---

Use this guide to bring the Kamiwaza 0.7 authentication and relationship-based access control (ReBAC) stack online in a lab or pilot environment. It assumes you have installed the latest 0.7 RPM bundle (or container images) and can restart services via the provided scripts.

> Internal operators should continue using the detailed runbooks in the private `kamiwaza` repository (`docs-internal/guides/`). This page is safe to share with customer teams.

---

## Prerequisites

| Item | Notes |
|------|-------|
| Keycloak 22.x+ | Administrative access to create a realm and confidential client. |
| Kamiwaza Release 0.7 install | Latest 0.7 RPM build (or the equivalent compose stack). |
| Shell access | Ability to edit `env.sh`, run helper scripts, and restart Auth/Keycloak/Traefik. |
| TLS assets | Certificates for the public gateway hostname (self-signed is fine for labs). |

Before starting, ensure Docker/RPM services are stopped or restarted cleanly so configuration changes apply.

---

## Configure environment

Update `env.sh` (or export the variables directly) with the Release 0.7 ReBAC settings. Replace placeholders with the values for your deployment.

```bash
# Auth gateway ↔ Keycloak
AUTH_GATEWAY_OIDC_ENABLED=true
AUTH_GATEWAY_KEYCLOAK_URL=https://<keycloak-host>
AUTH_GATEWAY_KEYCLOAK_REALM=<realm>
AUTH_GATEWAY_KEYCLOAK_CLIENT_ID=kamiwaza-platform
AUTH_GATEWAY_KEYCLOAK_CLIENT_SECRET=<client-secret>
AUTH_GATEWAY_PUBLIC_URL=https://<gateway-host>
AUTH_GATEWAY_COOKIE_DOMAIN=<gateway-host>

# ForwardAuth secret shared with Traefik
AUTH_FORWARD_AUTH_STRICT=true
AUTH_FORWARD_HEADER_SECRET=<random-hmac-secret>

# ReBAC session store
AUTH_REBAC_ENABLED=true
AUTH_REBAC_BACKEND=postgres
AUTH_REBAC_SESSION_ENABLED=true
AUTH_REBAC_SESSION_REDIS_URL=rediss://<redis-host>:6380/0
AUTH_REBAC_SESSION_ALLOW_INSECURE=false  # set true only for localhost labs
```

:::tip Local development
For quick experiments, use `https://localhost` for `AUTH_GATEWAY_PUBLIC_URL` and set `AUTH_REBAC_SESSION_REDIS_URL=redis://localhost:6379/0` with `AUTH_REBAC_SESSION_ALLOW_INSECURE=true`. Switch to TLS (`rediss://`) before promoting the environment.
:::

---

## Seed demo realm & client metadata

Run the helper to import the UAT realm, create the confidential client, and generate `runtime/oidc-uat.env` with matching values.

```bash
./scripts/run_oidc_uat.sh --seed-only
source runtime/oidc-uat.env
```

The script prints the generated client ID/secret and exports the environment block above. Re-run it only after changing hostnames or client metadata so the helper can rewrite the file.

---

## Restart core services

Bounce the authentication plane so the new settings apply:

```bash
docker compose restart auth keycloak traefik
```

If you are running the RPM services under systemd, restart `kamiwaza-auth.service`, `kamiwaza-keycloak.service`, and `kamiwaza-traefik.service` instead.

---

## Verify login & header passthrough

1. Visit `https://<gateway-host>/api/auth/login` and complete the Keycloak login.
2. Call the validation endpoint to ensure the session cookie works:
   ```bash
   curl -i https://<gateway-host>/api/auth/validate \
     -H "Cookie: <copied-session-cookie>"
   ```
   Expect HTTP `200` with `X-User-*` headers.
3. If you receive a redirect loop or `401`, confirm `AUTH_GATEWAY_COOKIE_DOMAIN` matches the hostname and re-run `run_oidc_uat.sh --seed-only` after adjustments.

---

## Next steps

- Walk through the [ReBAC validation checklist](./rebac-validation-checklist.md) to exercise tuple enforcement and decision logging.
- Review the [ReBAC overview](./rebac-overview.md) for architecture context.
- Coordinate with your security team to replace the demo realm with production IdP settings before go-live.
