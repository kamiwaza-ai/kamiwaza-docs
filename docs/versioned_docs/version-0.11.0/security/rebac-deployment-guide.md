---
title: ReBAC Deployment Guide
sidebar_label: ReBAC Deployment Guide
---

# ReBAC Deployment Guide

Use this guide to enable relationship-based access control (ReBAC) for the packaged Kamiwaza deployment on RHEL 9. This is the public operator workflow for Kubernetes-based installs; it does not rely on developer bundles or internal helper scripts.

## Before You Start

Make sure:

- Kamiwaza is already installed and healthy in the `kamiwaza` namespace
- you can sign in as a platform administrator
- you have access to the Keycloak admin console at `https://<your-domain>/admin`
- you understand whether your environment is single-tenant or multi-tenant

For the packaged install path, ReBAC settings are applied through:

```text
/opt/kamiwaza/cluster/values/overrides.yaml
```

## Step 1: Enable ReBAC in Site Overrides

Add or update the ReBAC block in `overrides.yaml`:

```yaml
core:
  scheduler:
    rebac:
      enabled: true
      defaultTenantId: "__default__"
      allowCommunityFallback: true
    extraEnv:
      - name: AUTH_REBAC_BACKEND
        value: "postgres"
      - name: AUTH_PAT_TENANT_TAGGING_ENABLED
        value: "true"

      # Optional session tracking. Only enable if you also provide Redis.
      # - name: AUTH_REBAC_SESSION_ENABLED
      #   value: "true"
      # - name: AUTH_REBAC_SESSION_REDIS_URL
      #   value: "rediss://user:pass@redis.example.com:6379/0"
      # - name: AUTH_REBAC_SESSION_ALLOW_INSECURE
      #   value: "false"
```

### Single-tenant vs multi-tenant guidance

- For single-tenant labs or pilot environments, `defaultTenantId: "__default__"` and `allowCommunityFallback: true` are a practical starting point.
- For production multi-tenant environments, disable tenant fallback once your identity provider is issuing the tenant claims you require.

### Backend guidance

- `postgres` is the default packaged backend for current customer installs.
- If you enable ReBAC session tracking, provide a real Redis endpoint before turning it on.

## Step 2: Apply the Configuration

```bash
cd /opt/kamiwaza
helmfile -e release sync
kubectl rollout status -n kamiwaza deployment/core-scheduler
```

If you changed identity-provider settings at the same time, also confirm Keycloak is healthy:

```bash
kubectl rollout status -n kamiwaza deployment/keycloak
```

## Step 3: Confirm Identity-Provider Roles

In Keycloak:

1. Open the `kamiwaza` realm.
2. Create or identify at least two test users.
3. Assign one user an administrative role such as `admin`.
4. Assign another user a restricted role such as `viewer`.

If you use an external identity provider through Keycloak federation or brokering, confirm that the expected role and tenant claims are mapped into the Kamiwaza realm before testing.

## Step 4: Validate Basic Access Behavior

Use the UI and API with real operator accounts:

- an `admin` user should be able to manage protected resources
- a `viewer` user should be able to read but not delete or administer resources

Useful checks:

```bash
curl -k https://<your-domain>/api/whoami \
  -H "Authorization: Bearer <token>"
```

Then test one read operation and one write or delete operation against a resource that both users can see.

## Step 5: Review Logs

ReBAC decisions are logged by the core scheduler:

```bash
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200 | grep rebac
```

You should see allow and deny decisions during validation.

## Recommended Production Settings

For production environments:

- use HTTPS for the public domain
- avoid tenant fallback once real tenant claims are available
- keep `default_deny` behavior in the packaged gateway policy
- use a TLS-enabled Redis endpoint if session tracking is enabled
- validate both browser and API flows before go-live

## Troubleshooting

### All users are denied

- Confirm `core.scheduler.rebac.enabled: true` is present in the active overrides file.
- Re-run `helmfile -e release sync`.
- Verify the rollout completed successfully.

### Viewer can still perform write actions

- Re-check the user’s realm roles in Keycloak.
- Confirm you are testing with a fresh login after the role change.
- Review scheduler logs to confirm which role and decision path were used.

### Scheduler fails after enabling session tracking

- `AUTH_REBAC_SESSION_ENABLED=true` requires `AUTH_REBAC_SESSION_REDIS_URL`.
- Remove the session block or provide a valid Redis URL, then sync again.

### Token has the wrong tenant behavior

- In single-tenant pilots, keep `defaultTenantId` and fallback enabled.
- In multi-tenant environments, fix tenant claim mapping in the identity provider and then disable fallback.

## Next Steps

- [ReBAC Overview](./rebac-overview.md)
- [ReBAC Validation Checklist](./rebac-validation-checklist.md)
- [Administrator Guide](./admin-guide.md)
