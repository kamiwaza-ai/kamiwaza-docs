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

### Audit coverage (0.12.1+)

- All state-changing API operations emit an audit record (actor, target, action, request id, and outcome).
- A denied-request audit middleware records `401` and `403` responses so failed access attempts leave a trail even when the downstream handler is never invoked.
- Audit records are surfaced through the same observability path as other security logs.

**What is not audited.** Read-only `GET` requests that succeed are not individually audited — only denied reads (`401`/`403`) and state-changing operations are. Internal health probes, static-asset fetches, and identity-provider redirect callbacks are excluded to keep the audit trail signal-to-noise high. Payload bodies are not captured; audit records store identifiers and outcome, not request/response contents.

**Retention and storage.** Audit records are emitted to the deployment's configured observability sink (the same path as other security logs — Kubernetes-native logging, OpenTelemetry collector, or the Kamiwaza UI log viewer). Retention is governed by that sink's configuration, not by Kamiwaza itself: set retention on your log backend (for example, Loki, Elasticsearch, or a SIEM) to match your accreditation requirements. There is no Kamiwaza-internal audit database with its own retention window.

### Authenticated-by-default API surface (0.12.1+)

The platform now applies the `AuthenticatedUser` dependency to all non-exempt endpoints, including admin and destructive routes. The effective contract:

- Every API endpoint requires an authenticated caller unless explicitly exempt (health, login, public metadata).
- Admin and destructive endpoints additionally require the appropriate role or scope.
- The OpenAPI spec now documents auth requirements per endpoint — use it as the source of truth when integrating. The spec is served by the platform at `/api/openapi.json` (with an interactive browser at `/api/docs`) on the deployment's own hostname.

### Cluster trust and machine-to-machine federation (0.12.1+)

For multi-cluster and federated deployments, identity headers from peer services are only honored when signed by a trusted cluster identity. Unsigned requester-identity headers are now distrusted and dropped. Operators federating two Kamiwaza clusters must exchange cluster trust material as part of deployment; see your deployment's federation notes for the per-environment procedure.

**Rotation, revocation, and compromise.** Cluster trust material is long-lived but not permanent. Rotation, revocation on decommission, and response to suspected key compromise are deployment-specific procedures and are not exposed as a self-service UI in the platform. If you need to rotate or revoke a peer cluster's trust material, or if you suspect a cluster identity has been compromised, contact Kamiwaza Support for the per-environment procedure — do not attempt to edit signing material in running pods. Until a compromised identity is revoked through the supported path, isolate the affected cluster at the network layer.

### Local (non-SSO) user password policy (0.12.1+)

When local authentication is enabled, new users must supply a valid email address and a password meeting the platform's strength policy at creation. Administrators provisioning local users should budget for:

- distributing per-user email addresses (no shared logins)
- communicating the password-strength requirements to end users
- rotating any seeded credentials that pre-date the policy

**Policy specifics.**

- **Minimum length:** 12 characters. Shorter passwords are rejected at creation and at rotation.
- **Complexity:** the platform does not enforce a fixed character-class rule (upper/lower/digit/symbol); length is the primary control. Deployments that require explicit complexity rules should federate to an external IdP that enforces them.
- **Reuse and expiry:** the local store does not enforce password history or forced expiry. If these are required for accreditation, use an external IdP (for example, Keycloak) rather than local auth.
- **Lockout:** the local store does not implement per-user lockout on repeated failed logins. Rate-limiting and lockout should be enforced at the IdP or at the ingress layer for deployments that require it.
- **Hash at rest:** passwords are stored as PBKDF2-HMAC-SHA256 with a per-user random salt and 200,000 iterations. Plaintext passwords are never persisted. The hash and salt are held in the platform's identity store alongside the rest of the user record.

For environments with stricter requirements (rotation cadence, history depth, lockout, complexity classes), run in auth-enabled mode against your IdP rather than relying on local auth.

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
