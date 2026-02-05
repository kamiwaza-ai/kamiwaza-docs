---
id: configuration
sidebar_position: 3
---

# Configuration Reference

Kamiwaza uses environment variables for configuration. The installer automatically sets sensible defaults based on your installation type, so most users don't need to configure anything manually.

## Installation Types

| Type | Command | Description |
|------|---------|-------------|
| **Community/Lite** | `install.sh --community` | Local development with SQLite, auth disabled |
| **Community/Full** | `install.sh --community --full` | Local development with full database, auth enabled |
| **Enterprise** | `install.sh` | Production deployment with full features |

## When to Customize

You only need to set environment variables if you want to modify or enable features:
- Change the default admin password
- Configure external network access
- Enable optional features (vector database, observability)
- Set up CORS for external applications

## Core Configuration

### Mode Settings

| Variable | Description | Community Default | Enterprise Default |
|----------|-------------|-------------------|-------------------|
| `KAMIWAZA_LITE` | Lite mode enables faster restarts and smaller footprint. Suitible for individual users. | `true` | `false` |
| `KAMIWAZA_USE_AUTH` | Enable authentication stack | `false` | `true` |

### Installation Paths

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_ROOT` | Installation directory | Auto-detected |
| `KAMIWAZA_INSTALL_ROOT` | Alias for `KAMIWAZA_ROOT` | Auto-detected |

## Authentication

### Basic Auth Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_ADMIN_PASSWORD` | Admin user password | `kamiwaza` (dev) or auto-generated |
| `AUTH_FORWARD_HEADER_SECRET` | ForwardAuth HMAC secret | Auto-generated |

When authentication is enabled (`KAMIWAZA_USE_AUTH=true`), additional configuration is required. See the [Security Admin Guide](security/admin-guide) for complete authentication setup.

## Network & CORS

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_EXTERNAL_URL` | Public-facing hostname (without protocol) | `localhost` |
| `KAMIWAZA_CORS_ORIGINS` | Additional CORS origins (comma-separated) | `""` (empty) |
| `KAMIWAZA_ORIGIN` | Origin for redirects and App Garden apps | Defaults to `https://{EXTERNAL_URL}` |

**Example CORS configuration:**
```bash
# Allow requests from a separate frontend
export KAMIWAZA_CORS_ORIGINS="dashboard.mycompany.com,dev.mycompany.com"

# Allow all subdomains (use with caution)
export KAMIWAZA_CORS_ORIGINS="*.mycompany.com"
```

## Optional Features

### Vector Database (Milvus)

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_MILVUS_ENABLED` | Enable Milvus vector database | `true` |

Milvus provides vector storage for RAG and similarity search. Disable if not using these features:
```bash
export KAMIWAZA_MILVUS_ENABLED=false
```

### Observability (OpenTelemetry)

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_OTEL_ENABLED` | Enable OpenTelemetry tracing | `false` |
| `KAMIWAZA_LOKI_ENABLED` | Enable Loki logging | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4318` |

See [Observability](observability) for setup details.

### Logging

| Variable | Description | Default |
|----------|-------------|---------|
| `KAMIWAZA_DEBUG` | Enable debug logging | `false` |
| `KAMIWAZA_LOG_LEVEL` | Log level (DEBUG, INFO, WARNING, ERROR) | `INFO` |
| `KAMIWAZA_LOG_JSON` | Use JSON log format | `true` |

## Example Configurations

### Local Development (Default)

For most local development, no configuration is needed. The installer creates sensible defaults:

```bash
# Run the installer - it handles everything
bash install.sh --community --i-accept-the-kamiwaza-license
```

If you want to customize, create `env.sh` before running the installer:

```bash
#!/bin/bash
# Optional: Custom admin password
export KAMIWAZA_ADMIN_PASSWORD="my-secure-password"

# Optional: Use a specific IP (for network access)
export KAMIWAZA_HEAD_IP="192.168.1.100"
```

### Production Deployment

For production deployments, see the [Security Admin Guide](security/admin-guide) which covers:
- Full authentication setup with Keycloak
- HTTPS configuration
- External access and CORS
- Session management

## Applying Configuration Changes

1. **Before installation**: Create `env.sh` in your `KAMIWAZA_ROOT` directory
2. **After installation**: Edit `env.sh` and restart services:
   ```bash
   source env.sh
   bash startup/kamiwazad.sh restart
   ```

## Troubleshooting

### Common Issues

**Services won't start after changing configuration:**
- Ensure all required variables are set (check logs for missing values)
- Verify `env.sh` syntax with `bash -n env.sh`
- Restart all services: `bash startup/kamiwazad.sh restart`

**CORS errors in browser:**
- Add your frontend origin to `KAMIWAZA_CORS_ORIGINS`
- Ensure `KAMIWAZA_EXTERNAL_URL` matches your access URL

**Authentication not working:**
- Verify `KAMIWAZA_USE_AUTH=true` is set
- Check Keycloak is running: `docker ps | grep keycloak`
- See [Security Admin Guide](security/admin-guide) for detailed auth setup
