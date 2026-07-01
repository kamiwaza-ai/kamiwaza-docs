---
title: ReBAC Validation Checklist
sidebar_label: ReBAC Validation Checklist
---

# ReBAC Validation Checklist

Use this checklist after enabling authentication and ReBAC in a customer environment. It is designed for public, customer-facing deployments and avoids internal bootstrap helpers, seeded demo users, and local compose workflows.

## Before You Begin

Confirm these prerequisites:

- the environment is reachable at its customer-facing HTTPS hostname
- authentication is enabled and users can reach the sign-in flow
- ReBAC is enabled in the deployment
- at least two test accounts exist in the identity provider:
  - one account that should be allowed to manage or view the target resource
  - one account that should be denied for the same protected action
- you have access to the approved log or observability path for the environment

If you still need to configure the environment, start with the [ReBAC Deployment Guide](./rebac-deployment-guide.md).

## 1. Browser Sign-In

1. Open the Kamiwaza web application.
2. Sign in with a known-good administrator or authorized user account.
3. Confirm you are returned to the application without an auth error or redirect loop.

Expected result:

- sign-in completes successfully
- the UI loads normally

## 2. Session Validation

Confirm that the environment recognizes an authenticated session.

One common check is:

```bash
curl -i https://<your-domain>/api/auth/validate
```

Run this with the session or bearer-token method approved for your environment.

Expected result:

- HTTP `200`
- authenticated user context is returned

## 3. Allow Path

Using an account that should have access:

1. open a representative protected workflow, such as a model, dataset, or other managed resource
2. confirm read access succeeds
3. if the role is expected to write or administer the resource, confirm one representative change also succeeds

Expected result:

- the permitted action completes successfully

## 4. Deny Path

Using an account that should not have access to that same action:

1. attempt the same protected operation
2. confirm the request is denied

Expected result:

- the user receives a deny response or equivalent UI error
- the request does not silently succeed

## 5. Tenant and Role Scope

If the environment is multi-tenant or uses tenant-scoped policy:

1. sign in as a user from the intended tenant
2. confirm that tenant-scoped resources are visible as expected
3. sign in as a user from a different tenant or role scope
4. confirm those resources are not exposed outside the allowed scope

Expected result:

- users see only the resources and actions granted to their tenant and role context

## 6. Logging and Auditability

Review the environment's approved logging path, such as:

- the Kamiwaza UI log viewer
- platform observability dashboards
- Kubernetes logs collected by your normal operations tooling

Confirm you can find records associated with:

- successful authentication
- denied access decisions
- the relevant correlation or request identifiers, if your environment exposes them

Expected result:

- logs are available for both allow and deny scenarios
- security and operations teams can trace the request outcome

## 7. Session Controls

If the deployment uses session revocation, inactivity timeout, or ephemeral-session behavior:

1. verify the expected timeout or logout behavior with a test account
2. confirm the user must re-authenticate after the session expires or is revoked

Expected result:

- session policy behaves as configured for the environment

## 8. Federal or CAC Validation

For CAC-enabled federal deployments, also validate:

- the client certificate is accepted through the ingress path
- the mapped user is correctly identified by the identity provider
- certificate-related failures produce clear deny behavior

Use:

- [CAC Overview](../federal/cac-overview.md)

## Success Criteria

Mark the environment validated when all of the following are true:

- sign-in works for intended users
- authorized actions succeed
- unauthorized actions are denied
- tenant boundaries behave as expected
- security-relevant logs are visible through the approved operations path

Capture the evidence your organization requires, such as screenshots, log excerpts, or ticket references, as part of deployment sign-off.
