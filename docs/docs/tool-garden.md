---
title: Tool Shed
sidebar_label: Tool Shed
---

# Tool Shed

Tool Shed lets you deploy and manage tool servers from container images or templates. It is designed for tool-enabled apps and agent workflows that need dedicated endpoints.

Kamiwaza typically leverages Model Context Protocol (MCP) servers to provide tools to agentic workflows via these.

## What you can do

- Deploy a tool server from a Docker image
- Deploy from a template in the remote catalog
- List, inspect, and stop tool deployments
- Reuse the same remote template catalog used by App Garden

## Deploy from a template

1. Open **Tool Shed** in the Kamiwaza UI.
2. Choose a tool template.
3. Provide required environment variables (for example API keys).
4. Click **Deploy**. A public HTTPS URL is generated for the tool server.

## Remote template catalog

Tool templates can sync from a remote catalog (the same catalog used by App Garden). Administrators can:

- Choose the catalog stage (LOCAL, DEV, STAGE, PROD)
- Refresh templates on demand
- See which templates are new or updated

This enables rapid rollout of new tools without shipping static JSON files.

## API highlights

These endpoints are available behind the standard API gateway:

- `POST /api/tool/deploy` (deploy from image)
- `POST /api/tool/deploy-template/{template_name}` (deploy from template)
- `GET /api/tool/deployments` (list deployments)
- `DELETE /api/tool/deployment/{deployment_id}` (stop and remove)

## Notes

- Tool deployments get stable URLs and integrate with the same routing system as models and apps.
- Use secrets from the Data Catalog for any sensitive configuration values.

