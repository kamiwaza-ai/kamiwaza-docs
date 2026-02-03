# App Garden

App Garden lets you browse, deploy, and manage containerized applications from a curated catalog—all from the Kamiwaza UI. Apps are packaged with Docker Compose and deploy in a few clicks with sensible defaults.

## What is App Garden?

App Garden is a catalog of ready-to-run apps (dashboards, demo UIs, tools) that you can deploy to your Kamiwaza environment. It handles the container runtime, networking, and routing for you, so you focus on using the app, not wiring it up.

## Key Features

- **One‑click deploy**: Launch apps directly from the catalog
- **Automatic routing**: Each app gets a stable URL via the built‑in load balancer
- **Cross‑platform**: Works on macOS, Windows, and Linux
- **AI‑ready**: Apps can automatically connect to your deployed models (OpenAI‑compatible)
- **Simple lifecycle**: Start, stop, and remove from the UI
- **Remote catalog sync**: Pull templates from the remote catalog with version filtering
- **Template variables**: Environment values can reference routing-aware variables

## Getting Started

1. Open the App Garden page in the Kamiwaza UI.
2. If the catalog is empty, click Import/Refresh (or ask your administrator to enable the remote catalog).
3. Browse the list and select an app to view details.
4. Click Deploy. App Garden will start the containers and assign a URL.
5. Click Open to launch the app in your browser.

## Deploying and Managing Apps

- **Deploy**: Choose an app and click Deploy. Most apps work out of the box with defaults.
- **Access**: After deployment, use the Open button or copy the provided URL.
- **Status**: Check deployment status, ports, and health in the App Garden page.
- **Stop/Remove**: Stop or remove an app anytime from its details panel.

## Using AI Models with Apps

Many apps can use models you’ve deployed in Kamiwaza. App Garden provides standard OpenAI‑compatible environment variables to the app automatically, so most apps need no manual configuration.

Tips:
- If your app has a model preference setting (e.g., fast, large, reasoning, vision), choose it in the app’s configuration panel before deploying.
- Ensure at least one model is deployed if your app requires AI.

## Remote template catalog

App Garden templates can sync from a remote catalog. Administrators can choose the catalog stage (LOCAL, DEV, STAGE, PROD) and refresh the catalog. The PROD stage is the default; the LOCAL stage is also available for internal app distribution.

## Template variable substitution

Template environment variables can reference routing-aware values. Examples include:

- `{openai_base_url}`: legacy port-based OpenAI base URL (no trailing `/v1`)
- `{openai_path_base_url}`: path-based OpenAI base URL (no trailing `/v1`)
- `{model_path_url}`: full HTTPS URL to the selected model (path-based)
- `{app_path_url}`: full HTTPS URL to the app (path-based)

Reserved `KAMIWAZA_*` and `FORWARDAUTH_SIGNATURE_SECRET` environment keys are protected and cannot be overridden by user input.

## When to Use App Garden

- You want a quick, reliable way to run common tools and demos
- You prefer a click‑to‑deploy experience over manual Docker commands
- You need apps that “just work” with your existing model deployments

## Troubleshooting

- **No apps in the catalog**: Click Import/Refresh on the App Garden page, then retry. If still empty, ask your administrator to enable the default catalog.
- **App won’t start**: Retry Deploy. If it persists, Stop/Remove and deploy again.
- **Can’t reach the app**: Use the Open button from the UI. Avoid direct container ports; App Garden routes traffic for you.
- **AI features not working**: Verify at least one model is deployed and healthy. Some apps expose a preference for model type—set it before deployment.

## Ephemeral Sessions

When deploying an app, you can enable **Ephemeral session** mode. This automatically cleans up the deployment when you log out or your session expires.

- **Check the box** during deployment to make the app ephemeral
- **Ephemeral apps** are automatically purged on logout or session timeout
- **Persistent apps** (unchecked) remain running until manually stopped

This is useful for demo environments or when you want automatic cleanup of test deployments.

:::tip Administrator Configuration
Administrators can force all deployments to be ephemeral by setting `KAMIWAZA_EPHEMERAL_EXTENSIONS=true`. See the [Administrator Guide](/docs/security/admin-guide#57-ephemeral-sessions-for-app-garden) for details.
:::

## Session tokens for apps

When an app is deployed in ephemeral mode, it receives a session token and endpoints it can call to keep the session alive or request cleanup:

- `KAMIWAZA_APP_SESSION_TOKEN`
- `KAMIWAZA_APP_SESSION_HEARTBEAT_ENDPOINT` (`/api/apps/sessions/heartbeat`)
- `KAMIWAZA_APP_SESSION_ENDPOINT` (`/api/apps/sessions/end`)

Apps should send periodic heartbeats when they remain active. Ending the session (or logging out) triggers cleanup of the associated deployment.

## Advanced Options

App customization is coming soon!
