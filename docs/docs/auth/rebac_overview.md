# ReBAC Overview

Kamiwaza’s relationship-based access control (ReBAC) layer enforces tenant-scoped and role-aware policies across the platform. This page summarizes what the feature delivers today, how to integrate it with an identity provider, and where to find the configuration assets.

---

## What ReBAC Delivers

- **Deny by default** — every protected API checks for an explicit `subject → relation → resource` tuple before permitting access.
- **Context-aware policies** — relations cover ownership, editor/viewer roles, clearance tiers, and nested group membership.
- **Runtime updates** — policy manifests and tenant bootstrap files can be reapplied without restarting services.
- **Auditable decisions** — each authorization call records the decision, reason, backend (Postgres or SpiceDB), and correlation ID.
- **Shadow cutover** — Postgres and SpiceDB can run in parallel to verify parity before promoting SpiceDB to the primary backend.

---

## Architecture Snapshot

| Component | Purpose | Notes |
| --- | --- | --- |
| Auth Gateway (`kamiwaza/services/auth/`) | Terminates OIDC sessions, issues personal access tokens (PAT), forwards signed headers. | Supports Keycloak today; SAML/card reader flows are roadmap items. |
| Access Decision Engine (`kamiwaza/services/authz/`) | Evaluates tuples from Postgres or SpiceDB and returns permit/deny with reasoning. | Latency target: <100 ms for typical requests. |
| Relationship Store (`kamiwaza/services/auth/relationship_store.py`) | Persists tuple data and mirrors to SpiceDB when enabled. | Ships with default tuples for system tenants. |
| Service Guards (models, catalog, DDE) | Wrap API endpoints with `enforce_*` helpers to require specific relations. | DDE ingestion remains admin-only in this release; catalog dataset deletes are ReBAC-protected. |
| Policy Assets (`configs/rebac/policies/*.yaml`) | Define relation schemas and default rules. | `configs/rebac/policies/default.yaml` is the shipping manifest. |

---

## Identity Provider Integration (Keycloak)

1. **Create a confidential client**  
   - Client ID: `kamiwaza-platform` (matches `AUTH_GATEWAY_JWT_AUDIENCE`).  
   - Allowed redirect URIs / web origins: the external URL of your Kamiwaza deployment.

2. **Expose required claims**  
   - Include `roles`, `tenant`, and any clearance attributes your policies reference.  
   - Ensure the JWT includes `exp`, `iat`, `sub`, and `iss` claims; Kamiwaza validates them on every request.

3. **Configure the Auth Gateway** (environment variables or `env.sh`):  
   ```
   AUTH_GATEWAY_JWT_ISSUER=https://<keycloak>/realms/<realm>
   AUTH_GATEWAY_JWKS_URL=https://<keycloak>/realms/<realm>/protocol/openid-connect/certs
   AUTH_GATEWAY_JWT_AUDIENCE=kamiwaza-platform
   AUTH_GATEWAY_POLICY_FILE=/config/auth_gateway_policy.yaml
   AUTH_REBAC_ENABLED=true
   AUTH_REBAC_BACKEND=postgres        # set to spicedb after shadow validation
   AUTH_SESSION_REDIS_URL=rediss://<host>:<port>
   ```
   - Leave `AUTH_REBAC_SHADOW_COMPARE=true` until SpiceDB decisions match Postgres.  
   - TLS verification is required (`AUTH_GATEWAY_TLS_INSECURE=false`) outside of local development.

4. **Personal Access Tokens (optional)**  
   Run the gateway’s PAT issuance workflow (see `docs-internal/guides/pat_quickstart.md`) to create CLI tokens that embed tenant metadata.

---

## Policy Management

1. **Review the shipped manifest** (`configs/rebac/policies/default.yaml`).  
   It defines relations for models, catalog datasets, DDE artifacts, and administrative roles.
2. **Validate changes** with `python scripts/rebac_policy.py validate configs/rebac/policies/default.yaml`.  
   The script confirms schema compliance and reports conflicts.
3. **Apply tenant manifests** using `python scripts/rebac_tenant.py apply --manifest configs/rebac/tenants/__default__.yaml`.  
   Manifests seed tuples for new tenants and can be re-run safely.
4. **Promote across environments** by storing manifest updates in version control and replaying them through your change management pipeline (GitOps, Terraform, etc.).

For custom deployments, clone the default manifest, adjust relations to match your org chart, and re-run the validation/apply steps above.

---

## Operations Checklist

1. **Enable the gateway policy** with `default_deny: true` and explicit allow rules for `/api/*` paths your users need.  
   - Example: allow DDE search endpoints to `viewer` roles, restrict ingestion endpoints to `admin`.
2. **Shadow test SpiceDB** by running with `AUTH_REBAC_BACKEND=postgres` and `AUTH_REBAC_SHADOW_COMPARE=true`.  
   - Monitor `rebac_shadow_mismatch_total` (Prometheus). It should remain at zero before cutover.
3. **Cut over to SpiceDB** once parity is confirmed: set `AUTH_REBAC_BACKEND=spicedb` and keep shadow mode on for the first rollout window.
4. **Monitor**  
   - Metrics: `rebac_check_requests_total`, `rebac_decision_latency_seconds`, `rebac_rate_limited_total`.  
   - Logs: structured decision entries include tenant, subject, action, resource, backend, and decision reason.
5. **Audit**  
   - Decision logs can be shipped to your SIEM.  
   - The `scripts/run_rebac_uat.sh` script exercises login, tuple seeding, and guard coverage for smoke testing.

---

## Demonstrating ReBAC (D30 Snapshot)

- **Catalog dataset delete guard** — Owners receive `204 No Content`; viewers receive `403 rebac_denied`. Metrics/logs capture both outcomes.  
- **DDE ingestion** — Admins can run and schedule ingestion jobs; non-admins receive `403 Forbidden` (ingestion is admin-only in the current release).  
- **Metrics dashboard** — Show decision rate, latency histogram, and shadow mismatch counter during the demo.  
- **Audit trail** — Highlight the correlation ID in API responses and the matching decision log entry.

---

## Limitations & Roadmap

- SAML and CAC/token-based sign-in are on the roadmap; today only OIDC (Keycloak) is supported.  
- Ingestion job ownership is still coarse-grained (admin-only). Tuple-based ownership and list/delete APIs are planned for upcoming releases.  
- ReBAC enforcement covers catalog/model APIs; ingestion write paths, retrieval, and custom connectors will join in future updates.

For additional details or deployment support, contact your Kamiwaza representative; customer runbooks are available on request for environments beyond the current release.
