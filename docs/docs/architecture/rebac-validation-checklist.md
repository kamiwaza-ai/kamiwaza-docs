---
title: ReBAC Validation Checklist
sidebar_label: ReBAC Validation Checklist
---

After completing the ReBAC Deployment Guide, run this validation checklist to confirm tuple enforcement, audit logging, and session controls match the current Kamiwaza artifacts. The flow mirrors what we run internally before shipping daily builds.

## Platform assumptions

- Environment meets the published Kamiwaza system requirements for this release (minimum RHEL 9.6+). See [System Requirements](../installation/system_requirements.md) for details.
- The ReBAC Deployment Guide steps completed successfully on the same host, including seeding with `run_oidc_uat.sh`.
- You can reach the Traefik gateway (`https://<gateway-host>`) from your workstation to run curl commands.

---

## Prerequisites

- Kamiwaza environment with the current Auth/ReBAC services running (RPM or compose stack).
- Deployment guide steps completed, including seeding with `run_oidc_uat.sh` and service restarts.
- Tuple bootstrap applied:
  ```bash
  uv run python scripts/rebac_tenant.py bootstrap configs/rebac/tenants/__default__.yaml
  ```
- CLI utilities: `curl`, `jq`, and access to `docker compose` or `journalctl` for logs.

The helper script seeds demo users in Keycloak (credentials are printed when the script finishes and stored in `runtime/oidc-uat.env`):

| Username | Password | Role |
|----------|----------|------|
| `admin` | `kamiwaza` | Owner (full control) |
| `testuser` | `testpass` | Viewer |
| `testadmin` | `testpass` | Admin (session purge) |

---

## Capture bearer tokens

```bash
OWNER_TOKEN=$(
  curl -sS https://<gateway-host>/api/auth/token \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'grant_type=password' \
    -d 'username=admin' \
    -d 'password=kamiwaza' \
    -d 'client_id=kamiwaza-platform' \
    | jq -r '.access_token'
)

VIEWER_TOKEN=$(
  curl -sS https://<gateway-host>/api/auth/token \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'grant_type=password' \
    -d 'username=testuser' \
    -d 'password=testpass' \
    -d 'client_id=kamiwaza-platform' \
    | jq -r '.access_token'
)

ADMIN_TOKEN=$(
  curl -sS https://<gateway-host>/api/auth/token \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'grant_type=password' \
    -d 'username=testadmin' \
    -d 'password=testpass' \
    -d 'client_id=kamiwaza-platform' \
    | jq -r '.access_token'
)

for token in OWNER_TOKEN VIEWER_TOKEN ADMIN_TOKEN; do
  test -n "${!token}" || { echo "failed to fetch ${token}" >&2; exit 1; }
done
```

If token retrieval fails, double-check that the deployment guide variables are sourced and that Keycloak is reachable from the gateway host.

---

## Authentication checkpoints

1. Browser login: visit `https://<gateway-host>/api/auth/login`, sign in with the seeded `admin` credentials, and confirm you are redirected back without errors.
2. Session validation:
   ```bash
   curl -i https://<gateway-host>/api/auth/validate \
     -H "Authorization: Bearer ${OWNER_TOKEN}"
   ```
   Expect HTTP `200` with `X-User-*` headers populated.
3. Session purge (admin):
   ```bash
   curl -s https://<gateway-host>/api/auth/sessions/purge \
     -H "Authorization: Bearer ${ADMIN_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"__default__","subject_namespace":"user","subject_id":"testuser"}'
   ```
   Response should include `{"revoked": <count>}`.

---

## Authorization checks

Fetch resource identifiers for the demo tenant:

```bash
MODEL_ID=$(
  curl -s "https://<gateway-host>/api/models?limit=1" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    | jq -r '.items[0].id'
)

DATASET_URN=$(
  curl -s "https://<gateway-host>/api/catalog/datasets?limit=1" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    | jq -r '.items[0].urn'
)

echo "MODEL_ID=${MODEL_ID}"
echo "DATASET_URN=${DATASET_URN}"
```

1. **Owner delete succeeds**
   ```bash
   curl -s -X DELETE "https://<gateway-host>/api/models/${MODEL_ID}" \
     -H "Authorization: Bearer ${OWNER_TOKEN}" \
     -o /dev/null -w "%{http_code}\n"
   ```
   Expect `200`. Tail logs for `rebac_decision` with `result="allow"`.

2. **Viewer delete denied**
   ```bash
   curl -s -X DELETE "https://<gateway-host>/api/models/${MODEL_ID}" \
     -H "Authorization: Bearer ${VIEWER_TOKEN}" \
     -o /dev/null -w "%{http_code}\n"
   ```
   Expect `403` and a deny log with `relation="owner"`.

3. **Dataset delete (owner)**
   ```bash
   curl -s -X DELETE "https://<gateway-host>/api/catalog/datasets/by-urn?urn=${DATASET_URN}" \
     -H "Authorization: Bearer ${OWNER_TOKEN}" \
     -H "Content-Type: application/json" \
     -o /dev/null -w "%{http_code}\n"
   ```
   Expect `204` and corresponding allow logs.

4. **Dataset delete (viewer denied)**
   ```bash
   curl -s -X DELETE "https://<gateway-host>/api/catalog/datasets/by-urn?urn=${DATASET_URN}" \
     -H "Authorization: Bearer ${VIEWER_TOKEN}" \
     -H "Content-Type: application/json" \
     -o /dev/null -w "%{http_code}\n"
   ```
   Expect `403`.

---

## Observability

1. **Logs**
   ```bash
   docker compose logs auth | grep rebac_decision
   ```
   Or, if using the RPM systemd units:
   ```bash
   journalctl -u kamiwaza-auth.service | grep rebac_decision
   ```
   Confirm allow/deny entries include `deployment_id`, `relation`, and correlation IDs.

2. **Redis**
   Verify TLS configuration matches your security policy (`rediss://` for production). Document any `AUTH_REBAC_SESSION_ALLOW_INSECURE=true` exceptions for development environments.

---

## Success criteria

✅ Login flow completes and issues session cookies.  
✅ Tuple enforcement allows owners and blocks viewers.  
✅ Decision logs capture both allow/deny outcomes.  
✅ Session purge responds with revoked counts.

Archive the curl outputs and log excerpts alongside the RPM build you validated for auditability.

Return to the [ReBAC Deployment Guide](./rebac-deployment-guide.md) if you need to reconfigure environment variables.
