---
title: ReBAC Validation Checklist
sidebar_label: ReBAC Validation Checklist
---

# ReBAC Validation Checklist

After enabling ReBAC, use this checklist to confirm the packaged Kubernetes deployment behaves the way you expect before you hand the environment to end users.

## Preconditions

- Kamiwaza is healthy in the `kamiwaza` namespace.
- ReBAC has been enabled through the [ReBAC Deployment Guide](./rebac-deployment-guide.md).
- You have at least two real test accounts:
  - one with administrative access
  - one with restricted or read-only access

## 1. Confirm Login Works

Verify both users can authenticate successfully:

1. Sign in through `https://<your-domain>`.
2. Confirm the UI loads without redirect loops.
3. Confirm logout returns to the expected login screen.

## 2. Confirm Identity and Role Mapping

For each test account, verify the platform sees the expected identity:

```bash
curl -k https://<your-domain>/api/whoami \
  -H "Authorization: Bearer <token>"
```

Check that the returned identity and role information matches the Keycloak configuration.

## 3. Confirm Read Access

Using the restricted user:

1. Open a list page such as Models, Data Catalog, or App Garden.
2. Confirm read-only views load successfully.
3. If you use API-based validation, call a read endpoint and confirm it returns `200`.

## 4. Confirm Write or Delete Restrictions

Using the restricted user:

1. Attempt an operation that should be blocked, such as deleting a model or changing an administrative setting.
2. Confirm the request is denied.
3. Record the HTTP response code or UI error shown to the user.

## 5. Confirm Administrative Access

Using the administrator account:

1. Perform the same protected operation.
2. Confirm it succeeds.
3. Verify the resulting resource state in the UI or API.

## 6. Review ReBAC Decision Logs

Check the scheduler logs while repeating one allowed action and one denied action:

```bash
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200 | grep rebac
```

You should see both allow and deny decisions during validation.

## 7. Confirm Tenant Behavior

If the deployment is single-tenant:

- verify the configured default tenant behavior is working as expected

If the deployment is multi-tenant:

- verify users only see data for the tenant they belong to
- confirm tenant fallback is disabled before production rollout

## Success Criteria

ReBAC validation is complete when all of the following are true:

- both test users can authenticate successfully
- the restricted user can read what they should read
- the restricted user is denied where they should be denied
- the administrator can complete the same protected operation
- scheduler logs show corresponding allow and deny decisions

If any of these checks fail, return to the [ReBAC Deployment Guide](./rebac-deployment-guide.md) and review the identity-provider mappings, overrides file, and deployment rollout status.
