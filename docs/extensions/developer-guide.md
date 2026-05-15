---
title: Developing Kamiwaza Extensions
sidebar_label: Developer Guide
---

# Developing Kamiwaza Extensions

This document describes how to build, test, and ship a Kamiwaza extension.

## What Is An Extension?

A Kamiwaza extension is a containerized application, service, or tool that runs inside the Kamiwaza platform.

| Type        | What It Is                                                   | Example                                                      |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **App**     | A multi-service application with a frontend and backend, deployed to the App Garden | AI chatbot, document analyzer, recruitment tool              |
| **Service** | A backend utility that other extensions can depend on        | Vector database, shared cache                                |
| **Tool**    | A server that exposes MCP functions and/or a REST API facade via the Tool Shed | Web scraper, code executor, API connector, document processor |

Extensions are packaged as Docker images, described by metadata (`kamiwaza.json`), and deployed to Kubernetes via the Kamiwaza platform. Each extension lives in its own repository.

## Extension Requirements

**Required artifacts:**

* `kamiwaza.json` — extension metadata (name, version, description, env defaults)
* `docker-compose.yml` — service definitions
* `Dockerfile` per service — container build instructions
* `README.md` — documentation

**Deployment requirements** (enforced when deploying to the platform, not during local development):

* No hardcoded host port bindings (`ports: ["8000"]` not `"8000:8000"`)
* No bind mounts (named volumes only)
* Resource limits defined for all services (`deploy.resources.limits`)
* Health endpoint at `GET /health` (apps)
* MCP endpoint at port 8000, path `/mcp` (tools)

Your local `docker-compose.yml` can and should use host port mappings, bind mounts, and whatever else makes local development convenient. When you run `kz-ext dev`, the CLI transforms your compose file to meet deployment requirements automatically — stripping host ports, replacing bind mounts with named volumes, and adding resource limits.

**Conventions:**

* Image tags follow `{version}` format (no `v` prefix)
* Tool names start with `tool-` or `mcp-`
* Service names start with `service-`

### Per-service `healthCheck`

An extension service can declare a per-service health probe in its service spec via a `healthCheck` block. When present, the platform uses it to gate readiness for that service independently of the app-level `/health` endpoint. Useful for tools or services that expose readiness on a non-default path or need custom timing.

```yaml
# inside your service spec
healthCheck:
  path: /healthz
  intervalSeconds: 10   # probe cadence, in seconds
  timeoutSeconds: 3     # per-probe timeout, in seconds
  failureThreshold: 3   # consecutive failures before the service is marked unready
```

All duration fields are **seconds** (not milliseconds). Minimums are `intervalSeconds: 1`, `timeoutSeconds: 1`, `failureThreshold: 1`.

If `healthCheck` is omitted, the platform keeps the previous app-level `/health` probe behavior.

## Getting Started

### Install the CLI

```bash
pip install kamiwaza-sdk
```

This installs the `kz-ext` command as part of the Kamiwaza SDK package. Build and deployment logic lives in this package rather than in copied template files in your repo.

Because CLI updates can change how your extension is built and deployed, `kamiwaza.json` declares the CLI version range your extension is compatible with:

```json
{
  "kz_ext_version": ">=1.0.0,<2.0.0"
}
```

The CLI checks this on every command and warns (or errors) if there is a mismatch. You can also run a compatibility check explicitly:

```bash
kz-ext doctor
```

This verifies CLI version compatibility, checks that required tools are installed (Docker, etc.), validates your Kamiwaza connection, and reports any issues.

**Optional extras for publishing and conversion:**

```bash
pip install kamiwaza-sdk[publish]   # Adds boto3 for kz-ext publish
pip install kamiwaza-sdk[convert]   # Adds anthropic + openai for kz-ext convert
pip install kamiwaza-sdk[all]       # Both
```

### Connect to a Kamiwaza instance

Most extensions need Kamiwaza platform features (model access, auth, workrooms). Set up your connection first:

```bash
kz-ext login https://your-cluster.kamiwaza.test
```

This authenticates via the Kamiwaza SDK, stores a PAT locally, and configures the CLI to target that instance for both local development and deployment. You only do this once per instance.

### Create an extension

```bash
mkdir my-app
cd my-app
kz-ext create --type app --name my-app
```

This creates a production-ready app with a styled frontend and fully-wired backend:

```
my-app/
├── kamiwaza.json
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── start.mjs
│   ├── package.json
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # SessionProvider + Google Fonts
│       │   ├── page.tsx            # AuthGuard + dashboard with session/models
│       │   ├── globals.css         # Tailwind + Kamiwaza dark theme
│       │   ├── providers.tsx       # SessionProvider wrapper
│       │   ├── logged-out/         # Logout redirect page
│       │   ├── session/            # Session proxy route
│       │   ├── auth/               # Auth proxy routes
│       │   └── api/[...path]/      # Catch-all backend proxy
│       └── components/
│           └── NavBar.tsx
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       └── main.py                 # Session router, auth, models, chat
└── README.md
```

No template infrastructure, no `scripts/` directory. The `kz-ext` CLI provides all tooling externally.

The generated code comes pre-wired with the Kamiwaza extension libraries:

* **Backend** (`requirements.txt`): `kamiwaza-extensions-lib` — auth middleware (`require_auth`), model client (`get_model_client`), model discovery (`list_available_models`), session endpoints (`create_session_router`)
* **Frontend** (`package.json`): `@kamiwaza-ai/extensions-lib` — `SessionProvider`, `AuthGuard`, `useSession()`, `useModels()`, proxy utilities (`createProxyHandlers`)
* **Frontend styling**: Tailwind CSS with a Kamiwaza dark theme (custom `kw-*` color tokens, CRT scanline effects, component classes)

These are published packages (`pip install` / `npm install`), not copied source files. The health endpoint, session router, auth dependencies, and model endpoints are already configured in the generated `main.py`. The frontend includes proxy routes for session, auth, and all backend API calls.

## The Development Loop

### Local development

Your first feedback loop runs containers locally via docker-compose, with the Kamiwaza SDK pointing at your connected instance for platform features:

```bash
kz-ext dev local
```

This runs `docker-compose up --build` with environment variables configured so that:

* Your backend can call Kamiwaza-managed models via the OpenAI-compatible endpoint
* `KAMIWAZA_USE_AUTH` is set to `false` so the session router returns an anonymous identity
* The SDK can make platform API calls (model discovery, etc.) via your connected instance

You get a working app at `http://localhost:3000` and iterate with normal development tools.

#### Port auto-detection

If ports are already in use, the CLI automatically remaps to the next available port:

```
$ kz-ext dev local
Port 3000 in use — remapping frontend to 3001
Port 8000 in use — remapping backend to 8001
frontend: http://localhost:3001
backend:  http://localhost:8001
```

This lets you run multiple extensions simultaneously without port conflicts. The internal Docker networking (frontend → backend) is unaffected — only the host-mapped ports change.

#### Hot reload

Your local `docker-compose.yml` can use host port mappings, bind mounts, and dev server entrypoints — none of the deployment restrictions apply locally. To get hot reload, use the standard mechanisms for your stack:

* **Frontend (Next.js/Vite):** Bind-mount your `src/` directory and use the dev server entrypoint. The generated Dockerfile includes a dev stage for this.
* **Backend (FastAPI):** Bind-mount your `app/` directory and run with `uvicorn --reload`.

These bind mounts and dev entrypoints exist only in your local `docker-compose.yml`. When you run `kz-ext dev` for deployed development, the CLI strips them and uses immutable container images instead.

For extensions that don't need Kamiwaza integration (e.g., a standalone tool that will be accessed by apps but doesn't call Kamiwaza APIs itself), `kz-ext dev local` still works — it just runs docker-compose without the SDK configuration.

#### Local auth bridge (`--auth`)

By default, `kz-ext dev local` runs with `KAMIWAZA_USE_AUTH=false` so the session router returns an anonymous identity. To exercise the real ForwardAuth flow against your connected instance — useful when iterating on auth-gated routes, role checks, or workroom scoping — pass `--auth`:

```bash
kz-ext dev local --auth
```

This stands up a local sidecar that injects the same identity headers (`X-User-Id`, `X-User-Email`, `X-Workroom-Id`, etc.) the platform would inject in a deployed extension, sourced from your `kz-ext login` session. `X-Workroom-Id` defaults to the global-workroom sentinel (`ffffffff-ffff-ffff-ffff-ffffffffffff`); set `--workroom <uuid>` to scope to a specific workroom. The bridge also configures Docker `host-gateway` routing so the local backend can reach a host-loopback Kamiwaza ingress (e.g. `https://kamiwaza.test`) without manual `host.docker.internal` plumbing.

`--auth` is most useful for `app` scaffolds that exercise authenticated browser flows. Tool and service scaffolds typically don't need it.

### Deployed development

When you need to test in the full platform environment — real ingress, real auth flows, real workroom scoping:

```bash
kz-ext dev
```

This:

1. Builds Docker images with a unique dev tag (e.g., `1.0.0-dev+abc1234.1711900800`). No version bump needed.
2. Pushes images to the container registry.
3. Creates or updates a `KamiwazaExtension` on the target cluster.
4. Waits for the rollout to complete.
5. Prints the URL.

```
Building my-app (1.0.0-dev+abc1234.1711900800)...
  ✓ backend image built
  ✓ frontend image built
Pushing to your-cluster.kamiwaza.test...
  ✓ extension updated
  ✓ rollout complete (18s)

my-app is running at:
https://your-cluster.kamiwaza.test/runtime/apps/my-app-a1b2c3
```

### Iterating

The deployed dev loop is:

1. Change code.
2. Run `kz-ext dev`.
3. Test at the printed URL.
4. Repeat.

Each run builds only what changed (Docker layer caching), pushes a uniquely-tagged image, and updates the running extension. The Kubernetes operator handles the rolling update. No version bumps. No registry builds. No manual redeploy.

:::note Rollout characteristics

The PATCH-update path uses the standard Kubernetes rolling-update strategy on the underlying Deployment. In-flight requests at the moment a pod is replaced may be dropped — under default container settings this typically registers as a small spike of `connection reset` / `502` errors during the rollout window (low-loss, but not strictly zero-downtime). For most dev iteration this is invisible; for live user traffic, design idempotent retries on the client or pin pods with a `lifecycle.preStop` hook in your service spec.

:::

Options:

```bash
kz-ext dev --no-build         # Push only (image already built)
kz-ext dev --service backend  # Rebuild and update one service only
kz-ext dev --revision custom  # Custom image tag
```

### Local SDK development (`--sdk-repo`)

When iterating on the runtime libraries themselves (`kamiwaza-extensions-lib` or `@kamiwaza-ai/extensions-lib`), use `--sdk-repo` to override the published packages with your local SDK source:

```bash
# Via CLI flag
kz-ext dev local --sdk-repo ~/repos/kamiwaza-sdk
```

This mounts the SDK repo into containers and overrides the published package installs:

* **Python backend**: `pip install -e /sdk/kamiwaza_extensions_lib --no-deps` replaces the PyPI package
* **TypeScript frontend**: `npm pack` + `npm install` from the local `kamiwaza-ai-extensions-lib/` replaces the npm package

The overrides are ephemeral — your extension repo's `docker-compose.yml` and Dockerfiles are never modified.

#### Repo-local config

Instead of passing `--sdk-repo` every time, create a gitignored config file:

```yaml
# .kz-ext/local.yaml
sdk_repo: /Users/you/repos/kamiwaza-sdk
runtime_libs:
  python: local       # override Python lib (default when sdk_repo is set)
  typescript: local   # override TypeScript lib
build_typescript: true  # auto-build TS package if dist/ is missing or stale
```

Then just run `kz-ext dev local` — it reads the config automatically. CLI flags override the config file.

You can override only one library:

```yaml
sdk_repo: /Users/you/repos/kamiwaza-sdk
runtime_libs:
  python: local
  typescript: published   # keep using npm version
```

#### Remote deploy with local SDK

The `--sdk-repo` flag also works with `kz-ext dev` for remote deployment:

```bash
kz-ext dev --sdk-repo ~/repos/kamiwaza-sdk
```

Instead of volume mounts, this bakes the local runtime libraries into the Docker images at build time using Docker BuildKit additional build contexts. The resulting images contain your local lib code and are pushed to the cluster normally.

This requires Docker BuildKit (Docker 20.10+). The CLI checks and fails with a clear message if BuildKit is not available.

#### Validating the override

`kz-ext doctor` validates the SDK override configuration:

```
$ kz-ext doctor

  ✓ Python 3.11.2
  ✓ Docker 24.0.7
  ✓ Docker Compose v2.23.0
  ✓ Connection: dev-cluster (healthy)

  SDK Override (.kz-ext/local.yaml):
  ✓ SDK repo exists: /Users/you/repos/kamiwaza-sdk
  ✓ Python runtime lib: kamiwaza_extensions_lib/ found
  ✓ TypeScript runtime lib: kamiwaza-ai-extensions-lib/ found
  ✓ TypeScript dist/: built, up to date
  ✓ Template contract: requirements.txt ✓  package.json ✓
```

## Authentication

### How it works

You do not implement auth protocols. No login pages, no token validation, no OAuth flows, no session storage. The platform handles all of that at the ingress layer before requests reach your code.

What you do is wire up the provided libraries to read user identity from platform-injected headers and, on the frontend, wrap your app in the session/auth components. If you use the generated scaffolding from `kz-ext create`, this wiring is already done for you.

The platform flow:

```
Browser → Traefik → ForwardAuth (validates session) → Your Extension
                                                       ↓
                                         Request includes identity headers
                                         set by the platform auth service
```

Your extension receives identity headers on every authenticated request. The exact headers are part of the **platform runtime contract** (see below).

### Login redirects

When an unauthenticated user tries to access your extension, the platform handles the redirect automatically:

**Direct URL access** (user navigates to your extension in the browser):

* The platform detects the unauthenticated browser request and redirects to the login page with a return URL.
* After login, the user is sent back to the original extension URL.
* Your extension is not involved — this happens entirely at the ingress layer.

**SPA session expiry** (user's session expires while using your app):

* API calls from your frontend will receive 401 responses.
* The `AuthGuard` component handles this automatically — it detects session errors, redirects to login, and restores the session when the user returns.

The scaffolded frontend wraps your app in `SessionProvider` and `AuthGuard` from the start:

```tsx
// This is generated for you by kz-ext create
import { SessionProvider, AuthGuard } from '@kamiwaza-ai/extensions-lib/client';

export default function RootLayout({ children }) {
  return (
    <SessionProvider>
      <AuthGuard>
        {children}
      </AuthGuard>
    </SessionProvider>
  );
}
```

This gives you:

* Automatic redirect to login when the session expires or is missing
* Session state available via `useSession()` hook
* Session expiry countdown tracking
* Configurable public routes that skip auth (e.g., `/logged-out`)
* Loading and redirecting states while auth is being resolved

```tsx
import { useSession } from '@kamiwaza-ai/extensions-lib/client';

function Dashboard() {
  const { session, loading, logout } = useSession();

  if (loading) return <Loading />;

  return (
    <div>
      <h1>Welcome, {session.name}</h1>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

You do not need to build a login page, handle OAuth callbacks, manage tokens, or implement session storage. If you use the generated scaffolding, `SessionProvider` + `AuthGuard` + `create_session_router()` are already wired up. If you're integrating into an existing app, you add these yourself — but you still never implement auth protocols.

### Reading user identity

#### Python (FastAPI)

The `kamiwaza-extensions-lib` package extracts identity from the platform's forwarded auth headers:

```python
from kamiwaza_extensions_lib import Identity, get_identity, require_auth, create_session_router
from fastapi import Depends, Request

# Add session endpoints to your app (/session, /auth/login-url, /auth/logout)
app.include_router(create_session_router())

# Require authentication on a route
@app.get("/api/documents")
async def list_documents(identity: Identity = Depends(require_auth)):
    # identity.user_id, identity.email, identity.name, identity.roles, identity.workroom_id
    return await get_documents_for_user(identity.user_id)

# Or get identity without requiring auth (returns unauthenticated identity if no session)
@app.get("/api/public")
async def public_endpoint(request: Request):
    identity = await get_identity(request)
    if identity.is_authenticated:
        return {"greeting": f"Hello, {identity.name}"}
    return {"greeting": "Hello, guest"}

# Require a specific role
from kamiwaza_extensions_lib import require_role

@app.get("/api/admin")
async def admin_only(identity: Identity = Depends(require_role("admin"))):
    return {"admin": identity.email}
```

`create_session_router()` adds three endpoints that the frontend's `SessionProvider` relies on:

* `GET /session` — returns the current user's session info
* `GET /auth/login-url` — builds a login redirect URL
* `POST /auth/logout` — logs out and returns redirect URLs

#### TypeScript (Next.js)

On the server side, extract identity from request headers:

```typescript
import { extractIdentity } from '@kamiwaza-ai/extensions-lib/server';
import { headers } from 'next/headers';

export default async function Page() {
  const headersList = await headers();
  const identity = extractIdentity(headersList);
  // identity.userId, identity.email, identity.name, identity.resolvedUuid
  return <h1>Welcome, {identity?.name}</h1>;
}
```

In API route handlers, use the proxy utilities to forward requests to your backend with auth headers preserved:

```typescript
import { createProxyHandlers } from '@kamiwaza-ai/extensions-lib/server';

const { GET, POST, PUT, DELETE } = createProxyHandlers({
  target: process.env.BACKEND_URL || 'http://backend:8000',
});

export { GET, POST, PUT, DELETE };
```

### Calling Kamiwaza APIs from your backend

When your extension's backend needs to call Kamiwaza platform APIs (e.g., model discovery, data catalog), forward the user's auth headers:

```python
from kamiwaza_extensions_lib import KamiwazaExtClient, forward_auth_headers

@app.get("/api/available-models")
async def list_models(request: Request, identity: Identity = Depends(require_auth)):
    client = KamiwazaExtClient.from_env()
    models = await client.get_models(request.headers)  # Forwards auth context
    return models
```

For background tasks that outlive the original request (e.g., long-running document processing), use a service account key:

```python
import httpx
import os

# Uses KAMIWAZA_API_KEY (injected by platform) — no user context needed
async def background_task():
    headers = {"Authorization": f"Bearer {os.getenv('KAMIWAZA_API_KEY')}"}
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(f"{os.getenv('KAMIWAZA_API_URL')}/models/", headers=headers)
        return resp.json()
```

### Local development

During `kz-ext dev local`, the CLI injects environment variables (`KAMIWAZA_API_URL`, `KAMIWAZA_USE_AUTH`, etc.) so that the same library code works without a real auth flow. When `KAMIWAZA_USE_AUTH` is `false`, `create_session_router()` returns an anonymous identity and the `AuthGuard` allows access without authentication. Your code doesn't need to change between local and deployed modes.

### Workroom context

Extensions are workroom-scoped. The `workroom_id` is available on the `Identity` dataclass:

```python
@app.get("/api/projects")
async def list_projects(request: Request, identity: Identity = Depends(require_auth)):
    return await get_projects(workroom_id=identity.workroom_id)
```

You do not need to validate workroom membership — the platform enforces this at the ingress layer before requests reach your extension.

## Model Integration

### How models work with extensions

Kamiwaza manages model deployments. Your extension declares what kind of model it needs, and the platform provides access. Extensions don't deploy, manage, or health-check models — the platform does that.

### Declaring model requirements

In `kamiwaza.json`, declare what your extension needs:

```json
{
  "preferred_model_type": "reasoning",
  "env_defaults": {
    "MODEL_CAPABILITIES": "chat,function_calling"
  }
}
```

### Using models in your code

The extensions library provides a `get_model_client()` helper that returns an OpenAI-compatible async client:

```python
from kamiwaza_extensions_lib import get_model_client, require_auth, Identity
from fastapi import Depends, Request

@app.post("/api/chat")
async def chat(request: Request, messages: list[dict], identity: Identity = Depends(require_auth)):
    client = await get_model_client(request)
    response = await client.chat.completions.create(
        model="auto",
        messages=messages,
    )
    return response
```

### Letting users select a model

For apps that want to offer model choice (e.g., a chatbot where users pick which model to talk to):

```python
from kamiwaza_extensions_lib import list_available_models

@app.get("/api/models")
async def available_models(request: Request, identity: Identity = Depends(require_auth)):
    models = await list_available_models(request)
    return [{"id": m.id, "name": m.name, "type": m.model_type} for m in models]

@app.post("/api/chat")
async def chat(request: Request, model_id: str, messages: list[dict], identity: Identity = Depends(require_auth)):
    client = await get_model_client(request)
    response = await client.chat.completions.create(
        model=model_id,
        messages=messages,
    )
    return response
```

### Streaming

For streaming responses (the common case for chat apps):

```python
from starlette.responses import StreamingResponse

@app.post("/api/chat/stream")
async def chat_stream(request: Request, messages: list[dict], identity: Identity = Depends(require_auth)):
    client = await get_model_client(request)
    stream = await client.chat.completions.create(
        model="auto",
        messages=messages,
        stream=True,
    )

    async def generate():
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {chunk.model_dump_json()}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Local development

During `kz-ext dev local`, the `KamiwazaExtClient.from_env()` reads `KAMIWAZA_ENDPOINT` (model access) and `KAMIWAZA_API_URL` (API access) from the environment. The CLI configures these to point at your connected Kamiwaza instance. You use real models during local development — no mocks or stubs.

## Runtime Environment

When your extension is deployed, the platform injects environment variables and HTTP headers that your code can use.

### Platform runtime contract (stable)

These are injected by the extension operator and can be relied on by extensions:

**Environment variables:**

| Variable                  | Description                            | Example                                                 |
| ------------------------- | -------------------------------------- | ------------------------------------------------------- |
| `KAMIWAZA_DEPLOYMENT_ID`  | Unique identifier for this deployment  | `my-app-a1b2c3d4`                                       |
| `KAMIWAZA_APP_NAME`       | Extension name from kamiwaza.json      | `my-app`                                                |
| `KAMIWAZA_APP_PORT`       | Port the primary service is exposed on | `8000`                                                  |
| `KAMIWAZA_APP_PATH`       | Ingress path prefix                    | `/runtime/apps/my-app-a1b2c3d4`                         |
| `KAMIWAZA_APP_URL`        | Full public URL for the extension      | `https://cluster.test/runtime/apps/my-app-a1b2c3d4`     |
| `KAMIWAZA_API_URL`        | Internal Kamiwaza API endpoint         | `http://core-raycluster-headless.kamiwaza.svc:7777/api` |
| `KAMIWAZA_PUBLIC_API_URL` | Public Kamiwaza API endpoint           | `https://cluster.test/api`                              |
| `KAMIWAZA_ORIGIN`         | Platform origin for CORS               | `https://cluster.test`                                  |
| `KAMIWAZA_USE_AUTH`       | Whether auth is enabled                | `true`                                                  |

**Identity headers** (set by ForwardAuth on authenticated requests):

| Header          | Description                       |
| --------------- | --------------------------------- |
| `X-User-Id`     | User's unique identifier          |
| `X-User-Email`  | User's email address              |
| `X-User-Name`   | User's display name               |
| `X-User-Roles`  | Comma-separated list of roles     |
| `X-Workroom-Id` | Workroom the user is operating in |
| `X-Request-Id`  | Unique request identifier         |

**Headers with limited documentation** (present in the platform but not yet formally part of the extension contract — use via the libraries rather than reading directly):

| Header / Variable  | Notes                                                        |
| ------------------ | ------------------------------------------------------------ |
| `X-Auth-Token`     | Raw JWT token; prefer forwarding via `forward_auth_headers()` |
| `KAMIWAZA_API_KEY` | Service account key; injection mechanism TBD                 |

### Model variables

| Variable              | Description                                          | Example                |
| --------------------- | ---------------------------------------------------- | ---------------------- |
| `KAMIWAZA_MODEL_PORT` | Port for the paired model endpoint                   | `8080`                 |
| `KAMIWAZA_MODEL_URL`  | Full URL for the paired model                        | (cluster-internal URL) |
| `KAMIWAZA_ENDPOINT`   | Alias for model endpoint (legacy, may be deprecated) | (cluster-internal URL) |

### Template variables in kamiwaza.json

In your `kamiwaza.json` `env_defaults`, you can use template variables that are resolved at deployment time:

| Variable          | Resolves To                            |
| ----------------- | -------------------------------------- |
| `{app_port}`      | The assigned port for your extension   |
| `{model_port}`    | The assigned port for the paired model |
| `{deployment_id}` | The deployment identifier              |
| `{app_name}`      | The extension name                     |

Example:

```json
{
  "env_defaults": {
    "PUBLIC_URL": "https://localhost:{app_port}",
    "CALLBACK_URL": "https://localhost:{app_port}/api/auth/callback"
  }
}
```

### Deployment inspection

For deployment inspection and day-to-day operations, prefer the supported SDK and CLI surfaces
instead of hardcoding raw platform endpoints in your extension code. In practice that means
leaning on commands such as `kz-ext status` and the shared runtime libraries rather than treating
the platform's internal API paths as part of your extension contract.

### Workroom-scoped runtime sessions {#runtime-launch-tokens}

If your extension launches a runtime inside a workroom, use the generated auth and session
scaffolding plus the shared SDK helpers instead of wiring token handling by hand.

- Keep `SessionProvider`, `AuthGuard`, and `create_session_router()` in place for browser and
  session lifecycle behavior.
- Use `KamiwazaExtClient.from_env()` and `forward_auth_headers()` when your backend calls
  Kamiwaza APIs on behalf of the active user.
- Treat any runtime launch token as opaque and short-lived. Do not parse it, log it, persist it
  outside the active runtime session, or pass it in a URL query string.
- If a downstream platform call returns `401`, fetch a fresh runtime launch token through the
  supported platform flow and retry once rather than looping retries.

For the public platform contract around workroom-scoped runtimes, membership enforcement, and
collaboration streams, see [Workroom Runtime Contract](/workrooms/runtime-contract).

### Writing portable code

Use the library's config and client classes rather than reading environment variables directly. This ensures your code works in both local and deployed modes:

```python
from kamiwaza_extensions_lib import AuthConfig, KamiwazaExtClient

# AuthConfig reads from environment automatically
config = AuthConfig.from_env()
# config.api_url      — KAMIWAZA_API_URL
# config.use_auth     — KAMIWAZA_USE_AUTH (bool)

# KamiwazaExtClient reads endpoints from environment
client = KamiwazaExtClient.from_env()
# client.api_base     — KAMIWAZA_API_URL
# client.openai_base  — KAMIWAZA_ENDPOINT
```

The CLI configures these environment variables for both `kz-ext dev local` and `kz-ext dev`, so the same code works in both modes.

## Debugging

### Logs

Stream logs from your deployed extension:

```bash
kz-ext logs                    # All services
kz-ext logs --service backend  # One service only
kz-ext logs --follow           # Stream continuously
```

### Shell access

Exec into a running container:

```bash
kz-ext shell                    # Primary service
kz-ext shell --service backend  # Specific service
```

### Status

Check the deployment state:

```bash
kz-ext status
```

Shows:

* Extension name, version, and dev revision
* Per-service status (image tag, ready replicas, restart count)
* Ingress URL
* Recent events (image pulls, probe failures, restarts)

### Port forwarding

Access a service directly without going through the platform ingress:

```bash
kz-ext port-forward --service backend --port 8000
# Backend is now available at localhost:8000
```

Useful for testing backend APIs directly, connecting a debugger, or inspecting a database. Auto-detects the service and port if not specified.

## Bringing an Existing App to Kamiwaza

If you have an existing containerized application and want to run it as a Kamiwaza extension:

```bash
kz-ext convert /path/to/existing-app
```

The conversion tool uses an AI agent to analyze and modify your existing code:

1. **Analyze** the existing Dockerfiles, compose files, and application code.
2. **Check requirements** — verify the app meets extension requirements (no host ports, no bind mounts, has health endpoint, etc.) and report what needs to change.
3. **Generate** `kamiwaza.json` — infer metadata from existing configuration.
4. **Modify files** — add `kamiwaza-extensions-lib` to Python backends, `@kamiwaza-ai/extensions-lib` to Node.js frontends, wire in health endpoints, auth middleware, session router, and resource limits.
5. **Report** — show what was created, what was modified, and what needs manual attention.

All file modifications are tracked by git — review with `git diff` and revert anything you disagree with.

The AI agent supports multiple LLM providers, picked in this order:

* **Claude CLI** / **Codex CLI** (subscription auth): If `claude` or `codex` is on your `PATH` and already authenticated (e.g. you've run `claude login`), `kz-ext convert` reuses that session — no API key needed. This is the most convenient path if you already use either CLI day-to-day.
* **OpenAI-compatible** (API key): Set `OPENAI_API_KEY`. Set `OPENAI_BASE_URL` for Kamiwaza, vLLM, Ollama, or any OpenAI-compatible endpoint.
* **Anthropic** (API key): Set `ANTHROPIC_API_KEY`.
* **No credentials**: Falls back to basic `kamiwaza.json` generation with a compatibility report — useful for a quick read on what would need to change without mutating files.

The agent also handles monorepo layouts (it discovers per-app `Dockerfile` / `package.json` / `requirements.txt` under a configurable subdirectory), and can vendor template files via copy rather than symlink when needed for distroless dev-local builds.

Preview without modifying files:

```bash
kz-ext convert /path/to/existing-app --dry-run
```

After conversion:

```bash
cd /path/to/existing-app
git diff                # Review changes
kz-ext validate         # Verify everything passes
kz-ext dev local        # Test locally
kz-ext dev              # Deploy to Kamiwaza
```

## Updating Scaffolds When the Template Evolves

When the `kz-ext` CLI ships a newer template (new generated files, refreshed proxy routes, updated `AGENTS.md`, etc.), existing scaffolded extensions can pick up the changes without a full rescaffold:

```bash
kz-ext update
```

`update` reconciles only **template-owned files** — the wiring scaffolded by `kz-ext create`. Author-owned files (your `src/`, your routes, anything you've added or substantially edited) are never touched. Each template-owned file gets one of three strategies:

* **`overwrite`** — replaced unconditionally; a `.orig` backup is written if your on-disk copy differs from the new template.
* **`preserve_if_modified`** — replaced only if the on-disk copy is identical to the previous template render. If you've edited it, the file is skipped (or, in interactive mode, you see a unified diff and choose `apply` / `keep`).
* **`merge`** — reserved for future smart-merge; v1 behaves as `preserve_if_modified`.

Modes:

```bash
kz-ext update                     # interactive — prompts on every conflict
kz-ext update --dry-run           # print planned changes only; no writes
kz-ext update --force             # apply all template-owned updates, write .orig on conflicts
kz-ext update --non-interactive   # fail with non-zero exit on the first conflict (for CI)
kz-ext update --bootstrap         # adopt current state as baseline for older scaffolds
```

The set of template-owned files is enumerated explicitly in code (not glob-based) — there are no surprises about what `update` can or can't touch. Use `--dry-run` first when in doubt; review the proposed diff with `git diff` after running.

## Validation

Before opening a PR:

```bash
kz-ext validate
```

This checks:

* `kamiwaza.json` is well-formed and complete
* Docker images build successfully
* Compose file is App Garden-compatible
* No host port bindings, no bind mounts
* Resource limits defined
* Health endpoint exists (apps)
* Preview image path is valid (if specified)
* `kamiwaza_version` constraint is valid semver (if specified)

Testing beyond structural validation is the developer's responsibility. Use whatever test framework fits your stack.

### Configure publishing

If you plan to publish extensions to a catalog (not just deploy to a single instance), configure your publish profiles:

```bash
kz-ext config publish-profile dev \
  --registry ghcr.io/my-org \
  --catalog-endpoint https://my-account.r2.cloudflarestorage.com \
  --catalog-bucket extensions-dev \
  --catalog-credentials aws-profile:my-dev-profile

kz-ext config publish-profile prod \
  --registry ghcr.io/my-org \
  --catalog-endpoint https://my-account.r2.cloudflarestorage.com \
  --catalog-bucket extensions-prod \
  --catalog-credentials aws-profile:my-prod-profile
```

This stores named profiles that `kz-ext publish --stage <profile>` uses to determine where images and catalog JSON go. Each profile specifies:

* **registry** — where Docker images are pushed (GHCR, ECR, private registry, etc.)
* **catalog-endpoint** — S3-compatible endpoint for the extension catalog
* **catalog-bucket** — bucket name for the catalog
* **catalog-credentials** — how to authenticate (`aws-profile:<name>`, `env`, etc.)

Profiles can be stored at the user level (`~/.kamiwaza/profiles/`) or at the repo level (`.kz-ext/profiles/` — useful for team-shared configs). Repo-level profiles override user-level profiles by name.

You do not need publish profiles for the dev loop — `kz-ext dev` only needs the Kamiwaza instance connection from `kz-ext login`.

#### Profile JSON shape

Behind the CLI, each profile is just a JSON file at `~/.kamiwaza/profiles/<name>.json` (file mode `0600`). You can edit it directly if you'd rather not re-run the CLI:

```json
{
  "name": "dev",
  "registry": "ghcr.io/my-org",
  "catalog_endpoint": "https://my-account.r2.cloudflarestorage.com",
  "catalog_bucket": "dev-info",
  "catalog_credentials": "aws-profile:my-dev-profile",
  "catalog_prefix": "",
  "created_at": "2026-05-06T00:00:00.000000+00:00"
}
```

The `catalog_credentials` field accepts:

* **`aws-profile:<name>`** — `kz-ext` runs `boto3.Session(profile_name="<name>")`, which reads `~/.aws/credentials`. This is the most reliable option for Cloudflare R2 (where you've already configured an `r2.cloudflarestorage.com` profile in `~/.aws/config` with `region = auto`).
* **`env`** — `kz-ext` runs `boto3.Session()` with no args. boto3 then resolves credentials from the standard chain: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` exported in the shell, or `AWS_PROFILE` if set. **Note:** `kz-ext publish` does not load `.env` files — these env vars must be exported in the shell that runs the command (or set in your CI environment). If you have a repo-level `.env` with custom variable names like `AWS_PROFILE_DEV=…`, those are not picked up; either export them with `eval $(grep '^AWS_' .env | xargs)` first, or switch the profile to `aws-profile:<name>` (recommended).
* **`sso`** — reserved for Cloudflare SSO; not yet implemented for `kz-ext publish`. Use `aws-profile:<name>` with an SSO-configured AWS profile instead.

#### Endpoint and credentials must match

The `catalog_endpoint` and the credentials you point at have to be for the same provider. R2 keys talk to R2 endpoints; AWS S3 keys talk to AWS S3 endpoints. Common signs of a mismatch:

* `Unable to locate credentials` — boto3 can't find any credentials at all. Either `~/.aws/credentials` has no `[<profile>]` section by that name, or `catalog_credentials` is `"env"` and no AWS env vars are exported. Fix: confirm `aws --profile <name> sts get-caller-identity` works from your shell, then make sure your kz-ext profile points at that AWS profile.
* `An error occurred (InvalidAccessKeyId) when calling the GetObject operation` — boto3 found credentials, but the *provider* rejected them. This usually means the endpoint and the keys are for different providers (e.g., R2 keys hitting `s3.amazonaws.com`, or AWS keys hitting `r2.cloudflarestorage.com`). Fix: align `catalog_endpoint` with whichever provider holds the keys.

A quick way to check whether an AWS profile is configured for R2: `grep -A2 '\[profile <name>\]' ~/.aws/config` — R2 profiles typically have `region = auto`.

## Releasing

When your extension is ready for a wider audience:

1. Bump the version in `kamiwaza.json`:

```json
{
  "version": "1.1.0"
}
```

2. Validate and publish:

```bash
kz-ext validate
kz-ext publish --stage prod
```

The `--stage` flag selects a named publish profile (see "Configure publishing" above). This determines where images are pushed and where the catalog entry is published. For example, `--stage prod` uses the `prod` profile's registry and catalog bucket.

This builds production-tagged images (`1.1.0`), generates the registry entry, and publishes to the extension catalog. The release path is intentionally more deliberate than the dev loop — version bumps, registry generation, and catalog publishing happen here but never during normal development.

You can dry-run to see what would happen:

```bash
kz-ext publish --stage prod --dry-run
```

Use `--force` to republish an existing version (e.g., fixing a bad publish):

```bash
kz-ext publish --stage prod --force
```

## CI/CD

`kz-ext` works in automated pipelines. Use PAT-based authentication (no interactive login):

```bash
# In your CI environment
export KAMIWAZA_API_KEY=pat-...
export KAMIWAZA_URL=https://your-cluster.kamiwaza.test/api

# Validate
kz-ext validate

# Publish (uses publish profile configured in repo or env)
kz-ext publish --stage prod
```

Publish profile settings can also be provided via environment variables for CI:

```bash
export KZ_PUBLISH_REGISTRY=ghcr.io/my-org
export KZ_PUBLISH_CATALOG_ENDPOINT=https://my-account.r2.cloudflarestorage.com
export KZ_PUBLISH_CATALOG_BUCKET=extensions-prod
```

## Extension Anatomy

### kamiwaza.json

Every extension has a `kamiwaza.json` at its root. This is the single source of truth for the extension's identity and version.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "source_type": "kamiwaza",
  "description": "A brief description of what this extension does",
  "risk_tier": 1,
  "verified": false,
  "env_defaults": {
    "PUBLIC_URL": "https://localhost:{app_port}",
    "CALLBACK_URL": "https://localhost:{app_port}/api/auth/callback"
  },
  "preferred_model_type": "reasoning",
  "preview_image": "images/preview.png",
  "kamiwaza_version": ">=0.8.0"
}
```

### docker-compose.yml

Your development compose file. This is what you use for `kz-ext dev local` and what the tooling transforms for App Garden deployment.

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - BACKEND_URL=http://backend:8000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - backend_data:/app/data
    environment:
      - OPENAI_BASE_URL=${KAMIWAZA_ENDPOINT:-http://host.docker.internal:8080}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-not-needed-kamiwaza}

volumes:
  backend_data:
```

When deploying to Kamiwaza, the CLI automatically transforms this for the cluster: host ports removed, bind mounts removed, build contexts replaced with image references, tags synced from `kamiwaza.json`. References to `host.docker.internal` (used for local dev to reach the host machine) are replaced by cluster-internal service URLs that the platform injects automatically via environment variables.

## Key Patterns

### Health endpoint

Apps must expose a health check:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Frontend-backend communication

In Docker, services communicate by service name:

```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export async function GET(request: NextRequest) {
  const response = await fetch(`${BACKEND_URL}${request.nextUrl.pathname}`);
  return NextResponse.json(await response.json());
}
```

### MCP tools

Tools implement the MCP protocol on port 8000:

```python
from mcp import FastMCP

mcp = FastMCP("my-tool")

@mcp.tool()
async def search(query: str) -> dict:
    """Search for documents matching the query."""
    results = await do_search(query)
    return {"results": results}

app = mcp.create_fastapi_app()
```

## Command Reference

| Command                                           | What It Does                                                 |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `kz-ext login <url>`                              | Connect to a Kamiwaza instance                               |
| `kz-ext create --type app --name my-app`          | Create a new extension                                       |
| `kz-ext dev local`                                | Run locally with docker-compose + SDK (auto-detects port conflicts) |
| `kz-ext dev local --auth`                         | Run locally with the ForwardAuth identity bridge enabled     |
| `kz-ext dev local --sdk-repo <path>`              | Run locally with local SDK runtime libs (volume mount)       |
| `kz-ext dev`                                      | Build, push, and deploy to Kamiwaza                          |
| `kz-ext dev --sdk-repo <path>`                    | Build with local SDK libs baked into images, then deploy     |
| `kz-ext dev --no-build`                           | Push and deploy (skip build)                                 |
| `kz-ext dev --service backend`                    | Rebuild one service only                                     |
| `kz-ext update`                                   | Reconcile a scaffold against the current template (interactive by default; supports `--dry-run` / `--force` / `--non-interactive` / `--bootstrap`) |
| `kz-ext bump <major\|minor\|patch>`               | Bump the version in `kamiwaza.json`                          |
| `kz-ext validate`                                 | Check extension requirements                                 |
| `kz-ext doctor`                                   | Check CLI compatibility, tools, connection, SDK override config, and per-failure-class auth hints |
| `kz-ext convert /path`                            | AI-powered conversion of existing app to extension           |
| `kz-ext config publish-profile <name>`            | Configure a named publish profile                            |
| `kz-ext config publish-profile --list`            | List all publish profiles                                    |
| `kz-ext publish --stage <profile>`                | Publish to extension catalog                                 |
| `kz-ext publish --stage <profile> --dry-run`      | Preview what would be published                              |
| `kz-ext publish --stage <profile> --revision <sha>` | Override the published image tag (CI integration)          |
| `kz-ext status`                                   | Show deployment status and URL                               |
| `kz-ext logs [--service name] [--follow]`         | Stream logs from deployed extension                          |
| `kz-ext shell [--service name]`                   | Exec into a running container                                |
| `kz-ext port-forward [--service name] [--port N]` | Forward a port locally                                       |

## FAQ

### Do I need to bump the version to test a change?

No. During development, `kz-ext dev` generates a unique image tag on every build using the git SHA and a timestamp. Version bumps are only needed when you release.

### Can I develop without a Kamiwaza instance?

Partially. `kz-ext dev local` runs your containers with plain docker-compose, but most extensions need Kamiwaza features (model access, auth). Connect to a Kamiwaza instance for the best local development experience.

### How do I iterate on the runtime libraries?

Use `kz-ext dev local --sdk-repo ~/repos/kamiwaza-sdk` or create a `.kz-ext/local.yaml` config. This overrides the published packages with your local SDK source — no compose surgery needed. See the [Local SDK development](<#local-sdk-development---sdk-repo>) section.

### How do I update my tooling?

```bash
pip install --upgrade kamiwaza-sdk                     # CLI + SDK
pip install --upgrade kamiwaza-extensions-lib           # Python runtime library
npm update @kamiwaza-ai/extensions-lib                  # TypeScript runtime library
```

After upgrading, run `kz-ext doctor` to verify compatibility with your extension's declared `kz_ext_version` range. The intelligence lives in installed packages, not copied files in your repo — but a small set of generated wiring (proxy routes, `AGENTS.md`, etc.) is template-owned. To pick up template changes shipped with a newer CLI, run `kz-ext update` (see [Updating Scaffolds When the Template Evolves](<#updating-scaffolds-when-the-template-evolves>)).

### How do I handle authentication?

You don't. The platform authenticates requests before they reach your extension and injects identity headers. Use the SDK middleware to read user identity. See the [Authentication](<#authentication>) section.

### How do I access models?

Use the `get_model_client()` helper from `kamiwaza-extensions-lib`. It returns an OpenAI-compatible async client. See the [Model Integration](<#model-integration>) section.

### What is the difference between `kz-ext dev` and `kz-ext publish`?

`kz-ext dev` is the fast inner loop — no registry build, no catalog artifacts, unique dev tags, immediate deployment. `kz-ext publish` is the release path — version-tagged images, registry generation, catalog publication to a configured publish profile.

### How do I convert an existing app?

Run `kz-ext convert /path/to/app`. The AI agent analyzes your existing code, generates `kamiwaza.json`, and wires in SDK integration. All changes are git-tracked. See the [Bringing an Existing App to Kamiwaza](<#bringing-an-existing-app-to-kamiwaza>) section.

### Does `kz-ext` work in CI?

Yes. Use `KAMIWAZA_API_KEY` and `KAMIWAZA_URL` environment variables for headless authentication. See the [CI/CD](<#cicd>) section.
