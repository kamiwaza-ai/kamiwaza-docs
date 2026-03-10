# App Garden

App Garden lets you browse, deploy, and manage packaged applications from the Kamiwaza UI. In the current packaged deployment, those applications run on Kubernetes and are published through Traefik using path-based runtime URLs.

## What App Garden Does

App Garden gives operators and end users a curated catalog of applications that can be launched without hand-building Kubernetes manifests.

When you deploy an app, Kamiwaza creates and manages the Kubernetes resources and routing it needs.

## How Apps Are Deployed

Customer-facing operation is through the UI and the packaged runtime APIs. When you deploy an app, Kamiwaza creates and manages the Kubernetes resources for you.

## Key Features

- one-click deployment from the Kamiwaza UI
- automatic public routing through the configured domain
- path-based runtime URLs such as `/runtime/apps/<deployment-id>`
- model-aware environment variables for OpenAI-compatible applications
- support for ephemeral session cleanup
- remote template catalog sync

## Getting Started

1. Open **App Garden** in the Kamiwaza UI.
2. Browse the available applications.
3. Select an app and click **Deploy**.
4. Wait for the deployment to become ready.
5. Use **Open** to launch it in your browser.

If the catalog is empty, ask an administrator to confirm template sync is enabled and the configured catalog stage is correct for your environment.

## Runtime Routing

In Kubernetes-based installs, App Garden routes traffic through the platform domain rather than exposing individual container ports.

Typical runtime path:

```text
https://<your-domain>/runtime/apps/<deployment-id>
```

Applications receive path-aware environment variables from Kamiwaza so they can generate correct links back to the platform, connected models, and their own public path.

## Using Models with Apps

Many App Garden templates can call a model already deployed in Kamiwaza. The platform provides the connection details automatically, so most apps can talk to a connected model without manual networking changes.

## Template Catalog Sync

Template sync is controlled by the packaged platform configuration. Administrators usually manage it through `overrides.yaml`:

```yaml
core:
  templates:
    sync:
      stage: "PROD"
```

Use only the catalog stage approved for your release and environment.

## Ephemeral Sessions

App Garden deployments can be ephemeral, which means Kamiwaza will automatically clean them up when the user logs out or the session ends.

- users can enable ephemeral mode when deploying an app
- administrators can make ephemeral mode the default
- administrators can also force all App Garden deployments to be ephemeral

Administrator settings are documented in the [Administrator Guide](security/admin-guide#ephemeral-sessions-for-app-garden).

## Troubleshooting

### No apps appear in the catalog

- confirm template sync is enabled
- confirm the configured catalog stage matches the release
- retry the refresh action in the UI

### The app deploys but does not open

- confirm the deployment is healthy in App Garden
- verify the platform domain resolves correctly
- check the application deployment logs in the UI or with Kubernetes logs

### Model-backed app features do not work

- confirm at least one compatible model is deployed and healthy
- redeploy the app after selecting the intended model, if the template requires one

## Related Guides

- [Quickstart](quickstart)
- [Administrator Guide](security/admin-guide)
- [Routing & URLs](routing-modes.md)
