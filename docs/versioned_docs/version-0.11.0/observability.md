# Observability Guide

Kamiwaza exposes operational visibility primarily through Kubernetes health checks, deployment logs, and optional OpenTelemetry export. This guide focuses on the packaged RHEL deployment running on Kubernetes.

## Quick Health Checks

Start with the cluster state:

```bash
kubectl get pods -n kamiwaza
kubectl get svc -n kamiwaza
kubectl get events -n kamiwaza --sort-by=.lastTimestamp | tail -n 20
```

If a pod is failing:

```bash
kubectl describe pod <pod-name> -n kamiwaza
kubectl logs <pod-name> -n kamiwaza
```

Useful deployment-level logs:

```bash
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200
kubectl logs -n kamiwaza deploy/traefik --tail 200
kubectl logs -n kamiwaza deploy/keycloak --tail 200
```

## Installation and Day-2 Logs

The packaged install also writes a host-side install log:

```bash
cat /var/log/kamiwaza_install_prod.log
```

Use that file when troubleshooting:

- bootstrap failures
- RPM installation issues
- Helm sync failures during initial install or upgrade

## Deployment Log Viewer

Kamiwaza includes a UI log viewer for model, app, and tool deployments. It is useful for reviewing:

- model startup failures
- runtime application errors
- repeated deployment pattern matches such as OOM or configuration failures

## OpenTelemetry

OpenTelemetry is optional. When enabled, configure it through `overrides.yaml` and apply the change with Helm.

Example:

```yaml
core:
  scheduler:
    extraEnv:
      - name: KAMIWAZA_OTEL_ENABLED
        value: "true"
      - name: OTEL_EXPORTER_OTLP_ENDPOINT
        value: "https://otel-gateway.example.com:4318"
      - name: OTEL_EXPORTER_OTLP_PROTOCOL
        value: "http"
      - name: OTEL_EXPORTER_INSECURE
        value: "false"
```

Apply the change:

```bash
cd /opt/kamiwaza
helmfile -e release sync
```

### OTEL guidance

- use TLS-enabled endpoints in production whenever possible
- set `OTEL_EXPORTER_INSECURE=true` only for trusted local or lab collectors
- validate connectivity by checking scheduler logs after rollout

## External Dashboards

The base packaged install does not require a built-in Grafana deployment. Many customer environments forward telemetry to an existing observability platform instead.

If your environment deploys a separate Grafana, Alloy, or Loki stack, treat it as an additional observability layer on top of the base Kamiwaza install rather than part of the minimum packaged footprint.

## Troubleshooting

### No data reaches the OTEL endpoint

- confirm `KAMIWAZA_OTEL_ENABLED=true` is present in the effective scheduler environment
- verify the collector endpoint, protocol, and TLS settings
- inspect scheduler logs for exporter errors after rollout

### Deployment logs are missing

- confirm the workload actually started and produced logs
- check the scheduler deployment logs directly with `kubectl logs`
- review the corresponding pod events with `kubectl describe pod`

### A service is unhealthy but logs are short

Use both:

```bash
kubectl describe pod <pod-name> -n kamiwaza
kubectl logs <pod-name> -n kamiwaza --previous
```

The `--previous` flag is useful for restart loops.

## Related Guides

- [Administrator Guide](security/admin-guide.md)
- [Help & Fixes](help-and-fixes.md)
