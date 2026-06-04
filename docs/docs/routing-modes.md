---
title: Routing Modes and URLs
sidebar_label: Routing & URLs
---

# Routing Modes and URLs

Kamiwaza supports three routing modes for models, apps, and tools:

- **Port-based**: Each deployment gets a dedicated load balancer port.
- **Path-based**: A single port with path prefixes like `/runtime/models/<id>`.
- **Dual**: Both port and path access are enabled (default).

This affects how OpenAI-compatible base URLs and app/tool URLs are constructed.

## Port-based routing

Port-based routing exposes each deployment on its own port.

Example OpenAI-compatible base URL:

```
https://<host>:<lb_port>/v1
```

## Path-based routing

Path-based routing uses a single host and path prefixes:

- Models: `/runtime/models/<deployment_id>`
- Apps: `/runtime/apps/<deployment_id>`
- Tools: `/runtime/tools/<deployment_id>`

Example OpenAI-compatible base URL:

```
https://<host>/runtime/models/<deployment_id>/v1
```

App and tool URLs follow the same pattern with their respective prefixes.

## Dual routing

In **dual** mode, both port and path routes are generated. This is useful when migrating existing integrations while standardizing on path-based URLs.

## Configuring routing

Routing config can be read or updated via the API:

- `GET /api/config/routing`
- `PATCH /api/config/routing`

Or by editing the runtime config file:

```
$KAMIWAZA_ROOT/runtime/runtime_config.json
```

Key fields under `routing`:

```json
{
  "routing": {
    "model_routing_method": "dual",
    "base_host": "https://your-host",
    "service_prefixes": {
      "models": "/runtime/models",
      "apps": "/runtime/apps",
      "tools": "/runtime/tools"
    }
  }
}
```

## Impact on App Garden templates

App Garden templates can reference routing-aware variables such as:

- `{openai_base_url}` (legacy port-based)
- `{openai_path_base_url}` (path-based)
- `{model_path_url}`, `{app_path_url}`, `{tool_path_url}`

These variables resolve based on the active routing mode so templates remain portable across deployments.

