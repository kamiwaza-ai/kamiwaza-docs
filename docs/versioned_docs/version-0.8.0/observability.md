# Observability Guide

Kamiwaza provides a comprehensive observability stack designed to give administrators visibility into the system's health, performance, and security. This guide covers how to access logs, monitor system health, and integrate Kamiwaza with your existing enterprise observability platforms.

## Overview

Kamiwaza's observability architecture is built on open standards:
- **Structured Logging**: All services emit JSON-structured logs.
- **OpenTelemetry (OTEL)**: Telemetry data is collected and routed via a standard OTEL Collector.
- **Trace Correlation**: Requests are traced across distributed services (API → Model Serving → Engine).

By default, Kamiwaza stores logs locally and can optionally aggregate them into a local Grafana/Loki stack or forward them to external systems like Splunk, Datadog, or Dynatrace.

---

## Quick Access to Logs

For immediate troubleshooting, logs are available in the local filesystem.

### 1. Local Log Files
All logs are stored in the `$KAMIWAZA_ROOT/logs` directory by default.

| File | Content | Format | Use For |
|------|---------|--------|---------|
| `application.jsonl` | All application events, errors, and business logic | JSON Lines | Programmatic analysis, OTEL ingestion |
| `application.log` | Human-readable version of application events | Text | Quick manual reading |
| `audit-events.jsonl` | Security and compliance events | JSON Lines | Security auditing |
| `kamiwazad.log` | Service orchestration and startup logs | Text | Troubleshooting startup failures |
| `kamiwazad-core.log` | Stdout/Stderr from core services | Text | Debugging crashes or unhandled errors |
| `kamiwazad-containers.log` | Container orchestration logs | Text | Troubleshooting container lifecycle issues |

### 2. Grafana & Loki (Built-in)
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

## OpenTelemetry Integration

Kamiwaza uses an OpenTelemetry Collector to route telemetry data. This allows you to integrate with any OTLP-compatible backend without modifying the application code.

### Enabling OpenTelemetry
OTEL is disabled by default. You can enable it via environment variables in your `env.sh` or runtime configuration:

```bash
export KAMIWAZA_OTEL_ENABLED=true
```

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

---

## Environment Variables Reference

Key variables for configuring observability:

| Variable | Default | Description |
|----------|---------|-------------|
| `KAMIWAZA_OTEL_ENABLED` | `false` | Master switch for OpenTelemetry. |
| `KAMIWAZA_LOKI_ENABLED` | `false` | Enables the local Loki/Grafana stack. |
| `KAMIWAZA_LOG_LEVEL` | `INFO` | Logging verbosity (DEBUG, INFO, WARNING, ERROR). |
| `KAMIWAZA_LOG_DIR` | `$KAMIWAZA_ROOT/logs` | Directory where local log files are written. |
| `KAMIWAZA_DISABLE_SYSLOG` | Profile-driven | Controls forwarding to system syslog. |
| `CUSTOMER_OTLP_ENDPOINT` | - | External OTLP endpoint for exporting telemetry. |
| `CUSTOMER_OTLP_AUTH` | - | Authentication header for the external endpoint. |

---

## ReBAC Decision Logs

When relationship checks run, the auth service emits structured `rebac_decision` log entries. These capture the tenant, subject, resource, relation, outcome, latency, and decision ID for every guard evaluation.

### Viewing decision logs

```bash
# Docker deployment
docker compose logs auth | grep "rebac_decision"

# Systemd deployment
journalctl -u kamiwaza-auth.service | grep "rebac_decision"
```

Each entry looks like:

```text
INFO rebac_decision {"tenant_id":"__default__","subject_namespace":"user","subject_id":"testuser","object_namespace":"model","object_id":"catalog-sdk","relation":"viewer","result":"allow","reason":"tuple_match","decision_id":"4cb88ea3","latency_ms":2.1}
```

Key fields:

| Field | Meaning |
|-------|---------|
| `tenant_id` | Tenant selected for the request (falls back to `AUTH_REBAC_DEFAULT_TENANT_ID` when allowed). |
| `subject_namespace`/`subject_id` | User or role evaluated. |
| `object_namespace`/`object_id` | Resource under protection (models, datasets, containers, etc.). |
| `relation` | Guard relation (`viewer`, `editor`, `owner`, custom relations). |
| `result` | `allow` or `deny`. |
| `reason` | Why the decision was taken (`tuple_match`, `tuple_missing`, `clearance_blocked`, etc.). |
| `decision_id` | Correlates API responses with log entries. Include this in support tickets. |

Feed these logs into Loki/Splunk/Datadog to build dashboards and alerts (for example, count deny trends per tenant or alert when `reason=tuple_missing`). The built-in Grafana dashboards (`deployment/kamiwaza-loki/*/grafana-provisioning`) already query `rebac_decision` for you.
