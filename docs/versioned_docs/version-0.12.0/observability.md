# Observability Guide

Kamiwaza provides several ways to inspect deployment health, runtime errors, and security-relevant activity. In current customer deployments, the primary observability paths are the UI log viewer, Kubernetes-native logs, and optional OpenTelemetry forwarding into your existing monitoring platform.

## Overview

Kamiwaza observability is built around three layers:

- **Deployment logs** surfaced through the Kamiwaza UI for models, apps, and tools
- **Platform logs** available through Kubernetes and your cluster logging workflow
- **OpenTelemetry (OTEL)** for exporting telemetry to external systems

Current public guidance assumes a Kubernetes deployment and does not rely on host-local log directories or bundled Grafana/Loki services.

## Start Here

For most troubleshooting:

1. use the Kamiwaza UI log viewer first
2. check Kubernetes pod health and container logs if the issue is platform-wide
3. review any external OTEL destination if your environment forwards logs or traces out of cluster

## UI Log Viewer

Kamiwaza includes a logger service that powers the UI log viewer and deployment log APIs.

Common endpoints behind the standard API gateway include:

- `GET /api/logger/deployments/all` - list deployment logs
- `GET /api/logger/deployments/type/{type}` - filter by deployment type
- `GET /api/logger/deployments/{type}/{id}` - fetch log content
- `GET /api/logger/deployments/{type}/{id}/patterns` - view detected error patterns
- `DELETE /api/logger/deployments/{type}/{id}?confirm=true` - delete a deployment log file
- `DELETE /api/logger/cleanup?days_old=30&dry_run=true` - preview or remove older logs

Use the log viewer in the UI when you want to:

- inspect model startup failures
- review app or tool launch problems
- check for common error signatures such as out-of-memory or runtime crashes

## Kubernetes-Level Troubleshooting

For cluster administrators, platform issues are usually easiest to diagnose through Kubernetes.

Typical checks include:

- pod status in the Kamiwaza namespace
- container restart counts
- recent pod logs for the affected service
- ingress or routing behavior for the public domain

Use your environment's standard Kubernetes and platform tooling to inspect those signals. If your organization centralizes Kubernetes logs in another system, treat that system as the source of truth for cluster-level troubleshooting.

## OpenTelemetry Integration

Kamiwaza supports OpenTelemetry-based export so customer environments can forward telemetry to existing monitoring systems.

Typical uses include:

- forwarding logs and traces to a central observability platform
- correlating platform events with the rest of your cluster telemetry
- retaining security and troubleshooting data outside the application UI

OTEL is controlled through deployment configuration rather than manual edits inside running containers.

Common settings include:

- `KAMIWAZA_OTEL_ENABLED`
- `CUSTOMER_OTLP_ENDPOINT`
- `CUSTOMER_OTLP_AUTH`
- `OTEL_EXPORTER_INSECURE`

Best practice:

- enable OTEL through deployment values or ConfigMaps
- keep OTLP credentials in Kubernetes Secrets or your approved secret manager
- use TLS-enabled collectors for production environments whenever possible

## External Observability Platforms

Kamiwaza can be integrated with OTLP-compatible platforms such as Splunk, Datadog, Dynatrace, or another OpenTelemetry pipeline managed by your organization.

When using an external destination, validate:

- the endpoint is reachable from the cluster
- credentials are present and current
- exported telemetry appears in the expected tenant, index, or project

## Log Types

The platform emits several categories of logs:

### Application logs

Used for API operations, business logic, and service errors.

Typical examples:

- model deployment failures
- connector execution errors
- service exceptions

### Audit and security logs

Used for security-sensitive operations and administrative actions.

Typical examples:

- authentication events
- access denials
- privileged operations

### Deployment logs

Used for model, app, and tool runtime troubleshooting.

Typical examples:

- engine startup output
- container stderr or stdout
- launch-time readiness failures

### Ingress and access logs

Used for request-level routing and gateway debugging.

Typical examples:

- upstream routing errors
- unexpected status codes
- repeated auth or callback failures

## Troubleshooting Common Issues

### A model, app, or tool fails to start

- start with the UI log viewer for that deployment
- look for detected patterns such as out-of-memory, startup timeout, or container exit
- if the problem affects multiple deployments, check Kubernetes pod status and cluster logs

### A service is reachable but behaving incorrectly

- inspect application logs for the affected service
- compare the failing request path against the expected routed URL
- verify the deployment still matches the intended configuration

### External OTEL destination is missing data

- confirm OTEL is enabled in the deployment
- verify the configured OTLP endpoint and auth settings
- inspect collector or exporter logs in the cluster
- confirm the destination platform is receiving data for the correct environment

### Authentication or access issues need correlation

- review security and audit logs
- confirm the request path, user context, and deny behavior
- use the security validation docs when the issue is tied to ReBAC or identity setup

## Configuration Reference

Common observability-related settings include:

| Variable | Purpose |
| --- | --- |
| `KAMIWAZA_OTEL_ENABLED` | Enables OTEL export paths |
| `CUSTOMER_OTLP_ENDPOINT` | External OTLP destination |
| `CUSTOMER_OTLP_AUTH` | Auth header or token for the external OTLP destination |
| `OTEL_EXPORTER_INSECURE` | Allows insecure OTLP transport for narrowly scoped non-production cases |
| `KAMIWAZA_DISABLE_SYSLOG` | Controls syslog forwarding where that compatibility mode is still in use |

Manage these through deployment values, ConfigMaps, and Secrets, not through ad hoc edits on running containers.

## Related Docs

- [Quickstart](quickstart.md)
- [Configuration Reference](configuration.md)
- [Administrator Guide](security/admin-guide.md)
