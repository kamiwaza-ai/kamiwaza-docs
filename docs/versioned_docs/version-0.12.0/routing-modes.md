---
title: Routing Modes and URLs
sidebar_label: Routing & URLs
---

# Routing Modes and URLs

Current Kamiwaza deployments use HTTPS ingress with path-based runtime URLs as the standard public access pattern.

In Kubernetes deployments, the charts seed path-based routing by default for:

- models
- apps
- tools

## Canonical Runtime Paths

The standard public URL shape is:

- Models: `/runtime/models/<deployment-id>`
- Apps: `/runtime/apps/<deployment-id>`
- Tools: `/runtime/tools/<deployment-id>`

Examples:

```text
https://kamiwaza.example.com/runtime/models/<deployment-id>
https://kamiwaza.example.com/runtime/apps/<deployment-id>
https://kamiwaza.example.com/runtime/tools/<deployment-id>
```

For model runtimes that expose OpenAI-compatible APIs, the model-scoped base URL follows the same pattern:

```text
https://kamiwaza.example.com/runtime/models/<deployment-id>/v1
```

## Best Practice

For customer-facing documentation, integrations, bookmarks, and extension guidance:

- use path-based URLs as the canonical form
- treat the platform HTTPS origin as the stable entrypoint
- avoid documenting port-specific runtime URLs as the preferred access pattern

This aligns with the current Kubernetes deployment model, Traefik ingress setup, and the runtime routing API.

## Routing Configuration API

Routing is managed through the platform configuration API:

- `GET /api/config/routing`
- `PATCH /api/config/routing`

The API supports:

- `base_host`
- `service_prefixes`
- `enabled_services`

In the current implementation, the API reports and persists routing in `path` mode for the public runtime paths.

## Default Kubernetes Routing Behavior

The deployment charts seed routing with path-based defaults similar to:

```json
{
  "routing": {
    "mode": "path",
    "model_routing_method": "path",
    "base_host": "https://<internal-traefik-url-or-origin>",
    "service_prefixes": {
      "api": "/api",
      "frontend": "/",
      "models": "/runtime/models",
      "apps": "/runtime/apps",
      "tools": "/runtime/tools",
      "notebooks": "/notebooks",
      "admin_ray": "/admin/ray"
    }
  }
}
```

The customer-facing hostname is typically derived from the deployment domain, and the scheduler config maps that into:

- `KAMIWAZA_EXTERNAL_URL`
- `KAMIWAZA_ORIGIN`

Best practice:

- keep your canonical public hostname aligned with `global.domain`
- keep `KAMIWAZA_ORIGIN` aligned to the same HTTPS origin
- only change routing prefixes when you have a clear platform-wide reason to do so

## Legacy Port-Based Routing

Some code paths still retain compatibility for legacy port-based or dual-mode routing behavior. That exists for backward compatibility, internal transitions, or older integrations.

For public docs and new integrations, path-based routing should be considered the supported standard unless your deployment team has explicitly documented a different compatibility requirement.

## App and Tool URL Behavior

App and tool deployments use the same runtime path model:

- apps open under `/runtime/apps/<deployment-id>`
- tools open under `/runtime/tools/<deployment-id>`

Workroom Manager and other App Garden experiences rely on these path-based URLs when launching runtime apps.

## Administrative and Platform Paths

Not every internal or administrative surface is meant to be documented as a public runtime path.

The main customer-facing patterns to document are:

- `/api`
- `/runtime/models/...`
- `/runtime/apps/...`
- `/runtime/tools/...`

Additional administrative paths such as `/admin/ray` are platform-specific and should be documented only when they are intentionally exposed in a given environment.

## When To Update Routing

Use the routing API when you need to:

- move the canonical base host to a different customer-facing domain
- change a service prefix intentionally across the platform
- disable or hide a specific routed service prefix

Do not treat pod-local config files such as `runtime_config.json` as the primary manual control point for customer operations. In current deployments, the shared runtime configuration and Helm-rendered defaults are the source of truth.

## Validation Steps

After a routing change, validate:

1. the platform home page loads at the intended HTTPS origin
2. `/api/ping` or another known API endpoint resolves correctly
3. at least one model URL works under `/runtime/models/<deployment-id>/v1`
4. at least one App Garden app opens under `/runtime/apps/<deployment-id>`
5. auth redirects and logout flows still return users to the correct origin

Use the [Quickstart](quickstart) and [Observability](observability) guides if a routing change breaks app launches or browser flows.
