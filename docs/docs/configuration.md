---
id: configuration
sidebar_position: 3
---

# Configuration Reference

Current Kamiwaza deployments are Kubernetes-based. In customer environments, configuration should be managed through your Helm values and cluster release workflow, not through ad hoc edits to source-managed `env.sh` files.

## Configuration Model

In the current deployment model, configuration comes from three main layers:

- Helm values and override files in the deployment workflow
- Kubernetes ConfigMaps and Secrets rendered from those values
- a small set of runtime-managed settings stored through platform APIs

For most teams, the best practice is:

1. set customer-specific defaults in Helm values
2. keep secrets in Kubernetes Secrets or an external secret manager
3. use the platform API only for runtime settings that are explicitly designed to be changed after deployment

## Start With These Docs

Use these guides together:

- [System Requirements](installation/system_requirements)
- [Installing Kamiwaza](installation/installation_process)
- [Quickstart](quickstart)
- [Administrator Guide](security/admin-guide)
- [AWS S3 Workroom Storage](workroom-storage-s3)
- [Observability](observability)

## Core Platform Settings

### Domain and Origin

The most important public-access setting is the deployment domain.

In the Kubernetes deployment charts, this is typically set through:

```yaml
global:
  domain: kamiwaza.example.com
```

That domain is then used to derive platform-facing values such as:

- `KAMIWAZA_EXTERNAL_URL`
- `KAMIWAZA_ORIGIN`
- allowed browser origins for authenticated platform traffic

Best practice:

- set `global.domain` to the canonical customer-facing hostname
- keep `KAMIWAZA_ORIGIN` aligned to that same HTTPS origin
- avoid mixing multiple “primary” hostnames unless your ingress and auth setup explicitly require it

## Authentication and Security Configuration

Authentication, identity provider integration, consent, banners, ReBAC, and secrets management are covered in the [Administrator Guide](security/admin-guide).

Best practice:

- manage auth and banner settings through your Helm values and platform admin workflow
- keep secrets out of plain-text values files whenever possible
- use Kubernetes Secrets, sealed secrets, or your cluster’s secret-management pattern for credentials and keys

If you are deploying a federal CAC-enabled environment, also use:

- [CAC Overview](federal/cac-overview)

## Object Storage

If users will upload files, preserve workroom context, or use the Skills Library, configure object storage before rollout.

Use:

- [AWS S3 Workroom Storage](workroom-storage-s3)

Best practice:

- set bucket, region, and secret references through your deployment values (`install-prod.sh` or standard Helm overrides)
- prefer secret references or ambient cloud identity over inline credentials

## Logging and Observability

Logging and telemetry configuration should be treated as platform configuration, not per-user customization.

Use:

- [Observability](observability)

Best practice:

- verify the UI log viewer works for deployment troubleshooting
- configure any OpenTelemetry or external log forwarding through your platform release values
- validate log access and retention as part of rollout readiness

## CORS and Browser Origins

Kamiwaza supports additional browser origins through serving configuration, including `KAMIWAZA_CORS_ORIGINS`.

Best practice:

- keep browser origins specific
- do not use wildcard CORS unless you are in a controlled development environment
- make sure the configured allowed origins match the actual HTTPS origins users and extensions will access

If credentials are in use, broad or mismatched CORS settings are a common source of extension and browser failures.

## Routing Configuration

Routing is now managed as a runtime control-plane setting, backed by the shared runtime store rather than per-pod file edits.

The routing API is:

- `GET /api/config/routing`
- `PATCH /api/config/routing`

Current best practice is to treat path-based routing as the standard customer-facing mode.

Canonical runtime prefixes are:

- models: `/runtime/models/<deployment-id>`
- apps: `/runtime/apps/<deployment-id>`
- tools: `/runtime/tools/<deployment-id>`

The Kubernetes charts already seed path-based routing defaults. Use the routing API only when you intentionally need to adjust the base host or service prefixes after deployment.

For more detail, see:

- [Routing & URLs](routing-modes)

## Where To Change Settings

Use this table as a quick guide:

| Setting Area | Best Place to Change It |
| --- | --- |
| Customer hostname / ingress domain | Helm values |
| Auth and IdP integration | Helm values + admin workflow |
| Secrets and credentials | Kubernetes Secrets or external secret manager |
| Object storage | Helm values + secret references |
| Observability endpoints and log forwarding | Helm values |
| Runtime routing prefixes / base host | Routing API |

## Anti-Patterns to Avoid

- editing source-repo install scripts as a customer configuration mechanism
- treating old package-install `env.sh` flows as the primary deployment model
- storing cloud credentials directly in user-editable metadata
- documenting port-specific runtime URLs as the preferred public access pattern

## Validation Checklist

After a configuration change, validate:

- the platform is reachable at the expected HTTPS origin
- administrator and standard-user sign-in still work
- app and tool launches resolve under the expected runtime paths
- storage-backed workflows still function
- logs remain visible to the right administrators

When in doubt, use the [Quickstart](quickstart) as the post-change validation path.
