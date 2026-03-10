---
id: core-services
title: Core Services
sidebar_position: 3
---

# Core Services

Kamiwaza is built from several core services that work together inside the Kubernetes deployment created by the packaged installer.

## Traffic and Access

### Traefik

Traefik is the ingress layer for the platform. It:

- terminates inbound HTTP and HTTPS traffic
- routes browser and API traffic to the right backend
- exposes runtime paths for models, apps, and tools

### Keycloak

Keycloak handles:

- user authentication
- role assignment
- identity-provider federation
- OIDC token issuance for the platform

## Platform Control Plane

### Core scheduler and API services

The scheduler and API layer provide:

- platform API endpoints
- model lifecycle operations
- App Garden and tool deployment orchestration
- security decision logging and runtime coordination

### Ray

Ray supports distributed execution and model-serving workloads. In the packaged single-node deployment, Ray still provides the execution framework used by the platform even though the cluster runs on one host.

## Data and Coordination Services

### PostgreSQL

PostgreSQL stores core platform data, including:

- user-facing application data
- model and deployment metadata
- operational records needed by the platform

### etcd

etcd provides distributed configuration and coordination used by internal platform services.

## Runtime Application Services

Kamiwaza also manages runtime applications and tools launched through the platform:

- App Garden deployments are translated into Kubernetes resources
- model runtimes are exposed on managed runtime routes
- authorization and routing are handled consistently through the platform domain

## Operational View

For operators, the most useful service-level commands are:

```bash
kubectl get pods -n kamiwaza
kubectl logs -n kamiwaza deploy/core-scheduler --tail 200
kubectl logs -n kamiwaza deploy/traefik --tail 200
kubectl logs -n kamiwaza deploy/keycloak --tail 200
```

## Related Guides

- [Platform Overview](overview.md)
- [Administrator Guide](../security/admin-guide.md)
- [Observability](../observability.md)
