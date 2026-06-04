# Observability Guide

Kamiwaza provides a comprehensive observability stack designed to give administrators visibility into the system's health, performance, and security. This guide covers how to access logs, monitor system health, and integrate Kamiwaza with your existing enterprise observability platforms.

## Overview

Kamiwaza's observability architecture is built on open standards:
- **Structured Logging**: All services emit JSON-structured logs.
- **OpenTelemetry (OTEL)**: Telemetry data is collected and routed via a standard OTEL Collector (In preview).
- **Trace Correlation**: Requests are traced across distributed services (API → Model Serving → Engine).

By default, Kamiwaza stores logs locally and can optionally aggregate them into a local Grafana/Loki stack or forward them to external systems like Splunk, Datadog, or Dynatrace.

---

## Quick Access to Logs

For immediate troubleshooting, logs are available in the local filesystem.

### Local Log Files
All logs are stored in the `$KAMIWAZA_ROOT/logs` directory by default.

| File | Content | Format | Use For |
|------|---------|--------|---------|
| `application.jsonl` | All application events, errors, and business logic | JSON Lines | Programmatic analysis, OTEL ingestion |
| `application.log` | Human-readable version of application events | Text | Quick manual reading |
| `audit-events.jsonl` | Security and compliance events | JSON Lines | Security auditing |
| `kamiwazad.log` | Service orchestration and startup logs | Text | Troubleshooting startup failures |
| `kamiwazad-core.log` | Stdout/Stderr from core services | Text | Debugging crashes or unhandled errors |
| `kamiwazad-containers.log` | Container orchestration logs | Text | Troubleshooting container lifecycle issues |

---

## Logger Service (Deployment Logs)

Kamiwaza also exposes a logger service that powers the UI log viewer and automated pattern detection. This service centralizes logs for model deployments, App Garden deployments, and Tool Garden deployments.

Common endpoints (via the API gateway):

- `GET /api/logger/deployments/all` – list all deployment logs
- `GET /api/logger/deployments/type/{type}` – filter by deployment type
- `GET /api/logger/deployments/{type}/{id}` – fetch log content
- `GET /api/logger/deployments/{type}/{id}/patterns` – error pattern analysis
- `DELETE /api/logger/deployments/{type}/{id}?confirm=true` – delete a log file
- `DELETE /api/logger/cleanup?days_old=30&dry_run=true` – cleanup old logs

Use the log viewer in the UI for quick pattern detection (OOM, CUDA errors, startup failures) without manually tailing files.

(Note: for the bold, this also makes engine deployment logs available to agentic processes.)

---

## OpenTelemetry Integration

Kamiwaza uses an OpenTelemetry Collector to route telemetry data. This allows you to integrate with any OTLP-compatible backend without modifying the application code.

:::note Preview
OTEL support is in preview. Trace context propagation across Ray Serve calls and inference engine instrumentation are still in development. Configuration and behavior may change in future releases.
:::

### Enabling OpenTelemetry
OTEL is disabled by default. You can enable it via environment variables in your `env.sh` or runtime configuration:

```bash
export KAMIWAZA_OTEL_ENABLED=true
```

### TLS Configuration

By default, Kamiwaza's OTEL exporter uses secure (TLS) connections to communicate with the OTEL Collector. For local development or deployments where the collector runs on the same host without TLS configured, you may need to disable TLS.

The `OTEL_EXPORTER_INSECURE` environment variable controls this behavior:

| Value | Behavior | Use Case |
|-------|----------|----------|
| `false` (default) | TLS-encrypted gRPC | Production, collector with TLS enabled |
| `true` | Plain gRPC without TLS | Local/same-host collector, development |

**To disable TLS for local development:**
```bash
export OTEL_EXPORTER_INSECURE=true
```

:::warning
When using `OTEL_EXPORTER_INSECURE=true`, telemetry data is transmitted unencrypted. Only use this setting when the collector is on the same host or within a trusted network.
:::

### Connecting to External Systems
To forward logs and traces to your enterprise observability platform (e.g., Splunk, Datadog, New Relic), configure the `CUSTOMER_OTLP_ENDPOINT` variable.

**Example Configuration:**
```bash
# In your env.sh or deployment config
export CUSTOMER_OTLP_ENDPOINT="https://otel-gateway.your-company.com:4317"
export CUSTOMER_OTLP_AUTH="Bearer your-auth-token"
```

Once configured, the internal OTEL Collector will duplicate the telemetry stream and send it to your specified endpoint while maintaining local logs.

---

## Grafana & Loki (Built-in)

:::note Prerequisite
Grafana and Loki require OpenTelemetry to be enabled. Ensure you have set `KAMIWAZA_OTEL_ENABLED=true` before enabling the Loki stack.
:::

If enabled (via `KAMIWAZA_LOKI_ENABLED=true`), you can query logs using the bundled Grafana interface.

- **URL**: `http://localhost:3030`
- **Default User**: `admin`
- **Default Password**: `kamiwaza` (or set via `GRAFANA_ADMIN_PASSWORD`)

To view logs:
1. Log in to Grafana.
2. Click **Explore** (compass icon).
3. Select **Loki** as the data source.
4. Run a query, e.g., `{service_name=~"kamiwaza.*"}`.

---

## Syslog Integration

For legacy system integration, Kamiwaza can send structured logs to the system's local syslog daemon.

- **Facility**: `local5` (default)
- **Configuration**: Controlled via `KAMIWAZA_DISABLE_SYSLOG`.

To enable syslog forwarding:
```bash
export KAMIWAZA_DISABLE_SYSLOG=false
```

To disable it (often default in development environments to avoid noise):
```bash
export KAMIWAZA_DISABLE_SYSLOG=true
```

---

## Log Structure & Types

Kamiwaza generates two primary types of logs:

### 1. Application Logs
Contains business logic, API operations, and errors.
- **Location**: `application.jsonl`
- **Key Fields**:
  - `level`: INFO, WARNING, ERROR
  - `service`: The microservice name (e.g., `kamiwaza.serving`)
  - `trace_id`: Correlation ID for distributed tracing
  - `message`: Human-readable description

**Example:**
```json
{
  "timestamp": "2025-01-09T10:00:00Z",
  "level": "INFO",
  "service": "serving",
  "message": "Model deployed successfully",
  "model_id": "llama-3.1-8b",
  "trace_id": "abc123xyz"
}
```

### 2. Access Logs
Contains HTTP request/response details from the API gateway.
- **Location**: `kamiwaza/traefik/access.log`
- **Key Fields**: Method, Path, Status Code, Duration, User Agent.

---

## Troubleshooting Common Issues

### Service Won't Start
Check the process management logs first:
```bash
tail -f $KAMIWAZA_ROOT/logs/kamiwazad.log
```

### API Errors
Check the application logs for stack traces and error details:
```bash
grep "ERROR" $KAMIWAZA_ROOT/logs/application.log
```

### Missing Logs in External System
1. Verify `KAMIWAZA_OTEL_ENABLED=true`.
2. Check the OTEL Collector logs for connection errors:
   ```bash
   docker logs kamiwaza-otel-collector
   ```
3. Ensure your `CUSTOMER_OTLP_ENDPOINT` is reachable from the Kamiwaza host.

### OTEL Export Failures (StatusCode.UNAVAILABLE)
If you see errors like `Failed to export metrics to localhost:4317, error code: StatusCode.UNAVAILABLE`:

1. **Check TLS settings**: Ensure `OTEL_EXPORTER_INSECURE` matches your collector configuration.
   - If collector has no TLS: `export OTEL_EXPORTER_INSECURE=true`
   - If collector has TLS: `export OTEL_EXPORTER_INSECURE=false`
2. **Verify the collector is running**:
   ```bash
   docker ps | grep otel-collector
   ```
3. **Check collector health**:
   ```bash
   curl http://localhost:13133/health
   ```

---

## Environment Variables Reference

Key variables for configuring observability:

| Variable | Default | Description |
|----------|---------|-------------|
| `KAMIWAZA_OTEL_ENABLED` | `false` | Master switch for OpenTelemetry. |
| `OTEL_EXPORTER_INSECURE` | `false` | Set to `true` to disable TLS for local/development collectors. |
| `KAMIWAZA_LOKI_ENABLED` | `false` | Enables the local Loki/Grafana stack. Requires OTEL to be enabled. |
| `KAMIWAZA_LOG_LEVEL` | `INFO` | Logging verbosity (DEBUG, INFO, WARNING, ERROR). |
| `KAMIWAZA_LOG_DIR` | `$KAMIWAZA_ROOT/logs` | Directory where local log files are written. |
| `KAMIWAZA_DISABLE_SYSLOG` | Profile-driven | Controls forwarding to system syslog. |
| `CUSTOMER_OTLP_ENDPOINT` | - | External OTLP endpoint for exporting telemetry. |
| `CUSTOMER_OTLP_AUTH` | - | Authentication header for the external endpoint. |
