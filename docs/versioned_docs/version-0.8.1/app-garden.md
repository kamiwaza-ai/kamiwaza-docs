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

## Getting Started

1. Open the App Garden page in the Kamiwaza UI.
2. If the catalog is empty, click Import/Refresh (or ask your administrator to enable the default catalog).
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

## When to Use App Garden

- You want a quick, reliable way to run common tools and demos
- You prefer a click‑to‑deploy experience over manual Docker commands
- You need apps that “just work” with your existing model deployments

## Troubleshooting

- **No apps in the catalog**: Click Import/Refresh on the App Garden page, then retry. If still empty, ask your administrator to enable the default catalog.
- **App won’t start**: Retry Deploy. If it persists, Stop/Remove and deploy again.
- **Can’t reach the app**: Use the Open button from the UI. Avoid direct container ports; App Garden routes traffic for you.
- **AI features not working**: Verify at least one model is deployed and healthy. Some apps expose a preference for model type—set it before deployment.

## Advanced Options

App customization is coming soon!