---
title: ReBAC Deployment Guide
sidebar_label: ReBAC Deployment Guide
---

# ReBAC Deployment Guide

Use this guide to enable relationship-based access control (ReBAC) in a customer deployment of Kamiwaza. It is written for the current Kubernetes-based platform and assumes configuration is managed through your deployment values, Kubernetes Secrets, and cluster release workflow.

This page intentionally does not cover internal helper scripts, source-repo bootstrap commands, or pod-local file edits.

## Before You Start

Confirm the deployment meets these prerequisites:

- Kamiwaza is deployed on Kubernetes and reachable at its customer-facing HTTPS hostname.
- Authentication is enabled for the environment.
- You have administrator access to your identity provider.
- You have a supported release workflow for updating Helm values, Kubernetes Secrets, or the equivalent deployment inputs.
- You have a plan for tenant bootstrap data and policy validation before rollout.

For general installation and environment preparation, see:

- [RHEL 9 offline installation](../installation/redhat_offline_install.md)
- [Configuration Reference](../configuration.md)

## ReBAC Deployment Model

In the current platform, ReBAC is enabled as part of the auth-enabled Kubernetes deployment.

At a high level:

1. Configure the customer-facing domain and authentication settings.
2. Enable ReBAC in your deployment values.
3. Configure the identity provider so tokens contain the claims Kamiwaza expects.
4. Provide tenant bootstrap and policy data through your administrative release workflow.
5. Validate sign-in, allow/deny behavior, and audit logging before production use.

## Core Deployment Settings

The exact value names may vary slightly by deployment package, but the current reference deployment uses settings equivalent to these:

```yaml
global:
  domain: kamiwaza.example.com

auth:
  enabled: true

rebac:
  enabled: true
  backend: postgres
  allowCommunityFallback: false
```

Key points:

- `global.domain` should match the canonical customer-facing HTTPS hostname.
- `auth.enabled` must be on for ReBAC-enabled deployments.
- `rebac.enabled` turns on tuple-based authorization checks.
- `rebac.backend` should match the supported backend for your environment.
- `rebac.allowCommunityFallback` should remain disabled outside of narrowly scoped lab scenarios.

Do not manage these settings by editing pod-local files or source-controlled `env.sh` files in a running environment.

## Identity Provider Configuration

Kamiwaza expects a standards-based OpenID Connect deployment. Keycloak is the reference identity provider, but the same requirements apply to equivalent OIDC providers.

Configure the identity provider as follows:

1. Create a confidential client for Kamiwaza.
2. Set the redirect URI to:
   - `https://<your-domain>/api/auth/callback`
3. Set the audience/client ID expected by Kamiwaza.
4. Ensure the issuer and JWKS endpoints are reachable by the platform.
5. Include the claims your policies depend on, such as:
   - subject identifier
   - role membership
   - tenant identifier
   - clearance or attribute claims, if your policies require them

If you are deploying a CAC-enabled federal environment, also review:

- [CAC Overview](../federal/cac-overview.md)

## Session Store and Secrets

Production ReBAC deployments should use managed secrets and a secured session store.

Best practice:

- store client secrets, signing material, and administrative credentials in Kubernetes Secrets or your external secret manager
- keep session storage on a managed Redis deployment with TLS enabled where required by policy
- avoid inline plaintext credentials in values files

For broader auth and secrets guidance, see the [Administrator Guide](./admin-guide.md).

## Policy and Tenant Data

ReBAC depends on policy definitions and tenant relationship data. These artifacts should be treated like configuration, not like ad hoc runtime edits.

Best practice:

- validate policy and tenant manifests before applying them
- promote them through the same change-management path you use for other customer configuration
- keep a record of the policy version or manifest revision used for each environment
- avoid editing authorization data directly inside running pods

If your environment is managed by Kamiwaza or by an internal platform team, use the supported administrative workflow for loading or updating tenant bootstrap data.

## Recommended Rollout Sequence

Use this order for a new ReBAC-enabled deployment:

1. Configure the domain, ingress, and TLS.
2. Enable authentication and confirm browser sign-in works.
3. Enable ReBAC in deployment values.
4. Apply the tenant and policy artifacts for the target environment.
5. Validate role-based access with representative administrator and standard-user accounts.
6. Review logs and audit evidence before broad rollout.

## What To Validate

Before marking the deployment ready, confirm:

- users can sign in through the configured identity provider
- session validation succeeds after login
- an authorized user can access protected resources
- an unauthorized user receives a deny response for the same resource class
- decision and auth logs are visible through the deployment's approved logging path

Use the [ReBAC Validation Checklist](./rebac-validation-checklist.md) as the final sign-off path.

## Troubleshooting Guidance

If validation fails, check these areas first:

- mismatch between the public domain and the configured callback URL
- missing or incorrect token claims from the identity provider
- missing tenant bootstrap or relationship data
- incorrect audience, issuer, or JWKS configuration
- session store connectivity or secret mismatches

For broader auth troubleshooting, see:

- [Administrator Guide](./admin-guide.md)
- [Observability](../observability.md)

## Next Steps

- Review the [ReBAC Overview](./rebac-overview.md) for architecture and capability context.
- Complete the [ReBAC Validation Checklist](./rebac-validation-checklist.md).
- Keep policy, tenant, and secret changes in your normal deployment release workflow.
