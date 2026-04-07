---
id: admin-guide
title: Administrator Guide
sidebar_label: Administrator Guide
---

# Administrator Guide

Use this guide to understand the security-related responsibilities of a Kamiwaza administrator in a customer deployment. It focuses on the current Kubernetes-based platform and avoids internal helper scripts, source-repo workflows, and host-local bootstrap procedures.

## Authentication Model

Kamiwaza supports two broad operating modes:

| Mode | Purpose | Notes |
| --- | --- | --- |
| Auth-enabled deployment | Production and controlled customer environments | Uses an external or bundled identity provider, token validation, and policy enforcement. |
| Lite mode | Simplified deployments where full enterprise auth is not enabled | Availability and security controls are reduced relative to full auth-enabled deployments. |

For most customer environments, the recommended path is an auth-enabled deployment with a customer-facing HTTPS domain, managed ingress, and centralized identity.

## Identity Provider Responsibilities

Administrators are responsible for confirming that the identity provider integration is correct for the deployment.

At a minimum, verify:

- the deployment domain is correct
- redirect and callback URLs match the deployed hostname
- the audience or client ID expected by Kamiwaza is configured correctly
- issuer and JWKS metadata are reachable by the platform
- user claims required by policy are present

For more detail on tenant-aware authorization, see:

- [Relationship-Based Access Control (ReBAC)](./rebac-overview.md)
- [ReBAC Deployment Guide](./rebac-deployment-guide.md)

For CAC-enabled federal environments, also review:

- [CAC Overview](../federal/cac-overview.md)

## User and Role Management

User lifecycle management should be handled through the deployment's identity provider and normal administrative workflow.

Best practice:

- create administrator and standard-user accounts through the identity provider or supported admin workflow
- avoid relying on node-local or package-local CLI tools as the default customer user-management path
- review group and role mappings as part of onboarding
- disable or remove temporary test identities before production rollout

Kamiwaza commonly distinguishes between:

| Role Type | Typical Purpose |
| --- | --- |
| administrator | Platform setup, access policy, troubleshooting, and environment validation |
| standard user | Daily use of models, apps, tools, and workrooms |
| service identity | Automation, extensions, or system-to-system integration |

## Secrets Management

Treat authentication, signing, and integration credentials as deployment-managed secrets.

Best practice:

- store secrets in Kubernetes Secrets or your approved external secret manager
- keep long-lived secrets out of plain-text values files whenever possible
- rotate administrative and client secrets through your normal release workflow
- avoid documenting or depending on file-system secret fallbacks inside running containers

This applies to credentials such as:

- identity provider client secrets
- administrative passwords
- signing keys and shared secrets
- object storage credentials

## Consent Gate and Classification Banners

Kamiwaza can enforce a pre-login consent gate and show classification banners for the deployment.

Use these controls when your environment requires:

- an explicit user acknowledgment before access
- persistent classification or handling caveats across the UI
- consistent banner behavior for embedded experiences

For configuration details, see:

- [Consent Gate and Classification Banners](./consent-and-classification.md)

## Relationship-Based Access Control

ReBAC adds tenant-aware and relationship-aware authorization on top of authentication.

Administrators should treat ReBAC as part of deployment configuration, not as an ad hoc runtime toggle.

Recommended responsibilities:

- confirm ReBAC is enabled only in auth-enabled environments
- validate tenant and relationship data before rollout
- verify representative allow and deny flows during release testing
- preserve evidence of policy and access validation for accreditation or audit needs

Use these docs together:

- [ReBAC Overview](./rebac-overview.md)
- [ReBAC Deployment Guide](./rebac-deployment-guide.md)
- [ReBAC Validation Checklist](./rebac-validation-checklist.md)

## Personal Access Tokens and Service Access

If your deployment uses automation, extensions, or system integrations, review how those workflows authenticate.

Best practice:

- issue only the minimum access required for the integration
- prefer managed service identities and approved token workflows
- rotate and revoke credentials when an integration changes ownership or scope
- keep tenant scoping aligned with the intended workload

## Logging, Audit, and Troubleshooting

Security troubleshooting should use the environment's approved observability path.

That may include:

- the Kamiwaza UI log viewer
- Kubernetes-native logging
- OpenTelemetry or external logging systems configured for the deployment

Administrators should be able to verify:

- successful authentication events
- denied access events
- session expiration or revocation behavior
- enough request context to support incident response or accreditation evidence

For broader deployment logging guidance, see:

- [Observability](../observability.md)

## Ephemeral Sessions for App Garden

Some deployments use ephemeral app sessions so launched applications are automatically cleaned up when the user logs out or the session expires.

Use this behavior when you want:

- reduced persistence for temporary app launches
- automatic cleanup for demos or evaluation environments
- stronger alignment between user session state and app lifetime

If your deployment enforces ephemeral extension behavior globally, document that choice as part of rollout readiness so administrators and users understand the lifecycle impact.

## Administrator Validation Checklist

Before handing the environment to users, confirm:

- users can sign in at the expected HTTPS hostname
- role mappings behave as expected
- required banners or consent messaging appear correctly
- protected actions allow the right users and deny the wrong ones
- logs and audit evidence are visible through the approved operations path
- secrets and callback URLs are managed through the deployment workflow, not manual pod edits

## Next Steps

- Use [Quickstart](../quickstart.md) for post-install validation.
- Use [Configuration Reference](../configuration.md) for deployment configuration patterns.
- Use [CAC Overview](../federal/cac-overview.md) for federal CAC-specific guidance.
