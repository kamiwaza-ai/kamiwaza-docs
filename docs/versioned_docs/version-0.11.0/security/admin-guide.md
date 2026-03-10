---
id: admin-guide
title: Administrator Guide
sidebar_label: Administrator Guide
---

# Administrator Guide

This guide covers day-2 administration for the packaged Kamiwaza deployment on RHEL 9. It assumes Kamiwaza was installed from the production RPM and is running on the single-node Kubernetes stack created by `install-prod.sh`.

## Administration Model

For packaged installs, operators normally work in three places:

- `https://<your-domain>` for the Kamiwaza UI
- `/opt/kamiwaza/cluster/values/overrides.yaml` for site-specific configuration
- `kubectl` and `helmfile` for operational checks and controlled changes

Kamiwaza runs in the `kamiwaza` namespace. Configuration changes are applied by updating the overrides file and then syncing the Helm release:

```bash
cd /opt/kamiwaza
helmfile -e release sync
```

Use Kubernetes commands for health checks and troubleshooting:

```bash
kubectl get pods -n kamiwaza
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200
kubectl rollout status -n kamiwaza deployment/core-scheduler
```

## Accessing Administrative Surfaces

### Kamiwaza platform administrator

The initial platform administrator is `admin`. The password is set during install with `--admin-password` and is also stored in the cluster:

```bash
kubectl -n kamiwaza get secret kamiwaza-user-admin \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

Sign in at:

```text
https://<your-domain>
```

### Keycloak administrator

Keycloak is exposed through the same external domain:

- User and realm endpoints: `https://<your-domain>/realms/kamiwaza`
- Admin console: `https://<your-domain>/admin`

The bootstrap Keycloak administrator password is stored in the `keycloak-admin` secret:

```bash
kubectl -n kamiwaza get secret keycloak-admin \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

## User Management

Use the Keycloak admin console to create users, assign passwords, and manage role mappings in the `kamiwaza` realm.

### Common realm roles

Kamiwaza ships with these primary roles:

- `admin` for full platform administration
- `user` for standard read/write platform access
- `viewer` for read-only access

When creating or updating users:

1. Open **Users** in Keycloak.
2. Create the user record and set a password.
3. Add the appropriate realm roles in **Role mapping**.
4. Have the user sign out and back in if their permissions changed while they were already logged in.

## Site Configuration

Most customer-specific settings belong in:

```text
/opt/kamiwaza/cluster/values/overrides.yaml
```

Typical examples include:

- consent gate and classification banners
- ReBAC settings
- template catalog stage overrides
- App Garden ephemeral-session defaults
- Hugging Face token secret reference

Example:

```yaml
core:
  security:
    consent:
      enabled: true
      buttonLabel: "Accept"
    banner:
      enabled: true
      topText: "UNCLASSIFIED//TEST SYSTEM"
      topColor: "#00A651"
      bottomText: "UNCLASSIFIED//TEST SYSTEM"
      bottomColor: "#00A651"

  scheduler:
    rebac:
      enabled: true
      defaultTenantId: "__default__"
      allowCommunityFallback: true
    extraEnv:
      - name: LICENSE_KEY
        value: "replace-with-license-key"
      - name: AUTH_REBAC_BACKEND
        value: "postgres"
      - name: KAMIWAZA_APP_SESSION_EPHEMERAL_DEFAULT
        value: "true"

  templates:
    sync:
      stage: "PROD"

  huggingface:
    existingSecret: "huggingface-token"
```

After editing the file:

```bash
cd /opt/kamiwaza
helmfile -e release sync
```

## Hugging Face Access for Gated Models

If operators need to download gated or rate-limited Hugging Face models, create a Kubernetes secret and reference it from `overrides.yaml`.

Create the secret:

```bash
export HF_TOKEN="hf_your_token_here"

kubectl create secret generic huggingface-token \
  -n kamiwaza \
  --from-literal=token="${HF_TOKEN}"
```

Then set:

```yaml
core:
  huggingface:
    existingSecret: "huggingface-token"
```

Apply the change with `helmfile -e release sync`.

## Authentication and Access Control

Kamiwaza uses Keycloak, OIDC, and a gateway policy enforced at the Kubernetes deployment layer. For packaged installs:

- the public login flow is derived from the `--domain` used at install time
- Keycloak and JWT issuer URLs are derived automatically
- the platform ships with a default deny-by-default gateway policy
- user-facing authorization is primarily driven by realm roles and, when enabled, ReBAC relationships

Public administrator workflows should treat the packaged policy as part of the release. If you need custom route-level policy changes beyond supported role and ReBAC configuration, coordinate that change through Kamiwaza support and your normal release process.

## ReBAC Administration

Relationship-based access control is documented in more detail in the [ReBAC overview](./rebac-overview.md) and [ReBAC deployment guide](./rebac-deployment-guide.md). In the packaged install path, administrators typically control:

- whether ReBAC is enabled
- the default tenant behavior for single-tenant environments
- the backing store and optional session settings
- role assignment in the identity provider

For most customer deployments, ReBAC settings belong in `overrides.yaml` under `core.scheduler.rebac` and `core.scheduler.extraEnv`.

## Consent Gate and Classification Banners

Consent and banner settings are configured through `core.security` in `overrides.yaml`. See [Consent & Banners](./consent-and-classification.md) for details.

## Ephemeral Sessions for App Garden

Kamiwaza can make App Garden deployments ephemeral so they are cleaned up automatically when the user logs out or the session expires.

Two common settings are available through `core.scheduler.extraEnv`:

```yaml
core:
  scheduler:
    extraEnv:
      - name: KAMIWAZA_APP_SESSION_EPHEMERAL_DEFAULT
        value: "true"
      - name: KAMIWAZA_EPHEMERAL_EXTENSIONS
        value: "false"
```

- `KAMIWAZA_APP_SESSION_EPHEMERAL_DEFAULT=true` makes ephemeral the default choice in the UI.
- `KAMIWAZA_EPHEMERAL_EXTENSIONS=true` forces all App Garden deployments to be ephemeral.

## Routine Operations

### Check platform health

```bash
kubectl get pods -n kamiwaza
kubectl get svc -n kamiwaza
kubectl get ingressroute -n kamiwaza
```

### Restart a deployment

```bash
kubectl rollout restart -n kamiwaza deployment/core-scheduler
kubectl rollout status -n kamiwaza deployment/core-scheduler
```

### Review logs

```bash
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200
kubectl logs -n kamiwaza deploy/traefik --tail 200
kubectl logs -n kamiwaza deploy/keycloak --tail 200
```

### Review the install log

```bash
cat /var/log/kamiwaza_install_prod.log
```

## Troubleshooting

### Login succeeds but the UI still shows access denied

- Confirm the user has the expected Keycloak realm roles.
- If ReBAC is enabled, verify the user also has the required tenant-scoped access for the resource they are trying to use.
- Sign the user out and back in after changing role mappings.

### Configuration changes did not take effect

- Confirm you edited `/opt/kamiwaza/cluster/values/overrides.yaml`.
- Re-run `helmfile -e release sync`.
- Check the rollout status for `core-scheduler` and any other affected deployment.

### App Garden deployments are not cleaning up

- Verify the ephemeral settings in `core.scheduler.extraEnv`.
- Confirm the user actually deployed the app in ephemeral mode, unless ephemeral mode is forced.
- Review scheduler logs for session cleanup errors.

### Pods are not healthy

Use:

```bash
kubectl get pods -n kamiwaza
kubectl describe pod <pod-name> -n kamiwaza
kubectl logs <pod-name> -n kamiwaza
```

## Related Guides

- [Red Hat Offline Installation Guide](../installation/redhat_offline_install.md)
- [Consent & Banners](./consent-and-classification.md)
- [ReBAC Deployment Guide](./rebac-deployment-guide.md)
- [Help & Fixes](../help-and-fixes.md)
