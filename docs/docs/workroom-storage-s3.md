---
id: workroom-storage-s3
title: AWS S3 Workroom Storage
sidebar_label: AWS S3 Workroom Storage
---

# AWS S3 Workroom Storage

Kamiwaza uses S3-compatible object storage for two platform workflows:

- workroom context file persistence
- Skills Library package import and download

If object storage is not configured, file-backed user workflows can fail with errors such as:

```text
Workroom storage is not configured for Skills Library.
```

Use this guide when your deployment stores workroom content in **external AWS S3** instead of the default in-cluster object storage.

:::warning Default SeaweedFS installs need no configuration — do not apply this page to them

Default self-managed installs use namespace-local SeaweedFS and wire workroom storage automatically. On those installs workroom storage already works, and applying this page's overrides without a real external-S3 requirement — or leaving them behind after one — will break it.

In particular, a `core.context.objectStorage` override pointing at a `core-s3` Secret — for example, left over in `deploy/cluster/values/overrides.yaml` from an earlier external-S3 setup — silently overrides the automatic wiring, and core then references a Secret the installer never creates. A fresh install never completes: the deploy blocks on the kamiwaza release's post-install hooks while core pods sit in `CreateContainerConfigError: secret "core-s3" not found`. See [Troubleshooting](#secret-core-s3-not-found) for diagnosis and cleanup.
:::

## When You Need This

Configure AWS S3 if your workroom content must live in an external AWS S3 bucket and you want the following to work reliably:

- context file upload and persistence
- Skills Library package import
- Skills Library package download

If the default SeaweedFS backend meets your requirements, you do not need this page.

## Prerequisites

Before you start, make sure you have:

- an AWS S3 bucket
- an IAM user or role with access to that bucket
- `kubectl` access to the target cluster
- a values override file for the deployment configuration

The IAM identity should be allowed to perform at least:

- `s3:ListBucket`
- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`

## Choose a Configuration Surface

There are two ways to configure external S3 workroom storage, depending on how you deploy:

| Deployment | Configure via |
|---|---|
| `deploy` repo Helmfile install (v1.0 storage platform) | `storage.workrooms` in `deploy/cluster/values/storage-overrides.yaml` — **preferred** |
| Direct `core` chart values (no umbrella chart / no Helmfile) | `context.objectStorage` in your core values file |

On Helmfile installs, the external-storage adapter materializes `storage.workrooms.*` into the core chart's `context.objectStorage` block and keeps SeaweedFS and registry settings consistent with it. This applies to `install-prod.sh` installs too: they deploy through the same Helmfile environment, so a storage block in `cluster/values/storage-overrides.yaml` is honored there as well.

Do not use `deploy/cluster/values/overrides.yaml` for storage configuration. It is a late umbrella-chart override that takes precedence over the storage adapter's wiring (see the warning above), it deep-merges per key — so a partial block silently mixes with the rendered storage values — and it does not reconfigure SeaweedFS or the registry. Deployments configured on 0.13.x used `overrides.yaml` for this purpose; migrate the block to `storage-overrides.yaml`, or remove it entirely when returning to the default SeaweedFS backend. The only supported `overrides.yaml` use on this page is the minimal session-token fragment in Option 1, step 2a.

## Configuration Model

Under the hood, the `core` chart exposes a single object-storage configuration block. The storage platform fills it in from `storage.workrooms.*`; direct chart consumers set it themselves:

```yaml
context:
  objectStorage:
    enabled: true
    defaultBucket: ""
    defaultRegion: ""
    defaultPrefix: "context/raw"
    endpointUrl: ""
    credentialsSecretRef:
      name: ""
      accessKeyIdKey: "access_key_id"
      secretAccessKeyKey: "secret_access_key"
      sessionTokenKey: "session_token"
```

When `enabled` is omitted, the chart infers it: object storage turns on only when **both** `defaultBucket` and `credentialsSecretRef.name` are non-empty. Set `enabled: true` explicitly whenever you configure this block directly — the ambient-credentials path (empty Secret name) does not work without it.

This configuration is rendered into:

- the `core-config` ConfigMap for non-secret S3 settings
- the `core-scheduler` deployment for secret-backed AWS credentials
- the Ray head and worker pods for the same credentials
- the storage-janitor CronJob (picks up changes on its next run; no restart needed)

## Option 1: Static AWS Access Keys

Use this option when your cluster does not already provide AWS credentials to the pods.

### 1. Create a Kubernetes Secret

Core pods wait on this Secret, so create it before deploying — or, on installer-bootstrapped paths where the cluster does not exist yet (for example k0s-lima / k0s-podman), as soon as the `kamiwaza` namespace appears during the install. The kubelet retries automatically and stuck pods recover once the Secret exists.

On an existing cluster, create the namespace first if it is not there yet (idempotent and safe — the installer adopts a pre-existing namespace):

```bash
kubectl create namespace kamiwaza --dry-run=client -o yaml | kubectl apply -f -
```

Then create the Secret:

```bash
kubectl create secret generic core-s3 \
  -n kamiwaza \
  --from-literal=access_key_id="<aws-access-key-id>" \
  --from-literal=secret_access_key="<aws-secret-access-key>"
```

If you are using temporary session credentials, include the session token (and read the session-token note under step 2a):

```bash
kubectl create secret generic core-s3 \
  -n kamiwaza \
  --from-literal=access_key_id="<aws-access-key-id>" \
  --from-literal=secret_access_key="<aws-secret-access-key>" \
  --from-literal=session_token="<aws-session-token>"
```

### 2a. Helmfile installs: configure `storage.workrooms` (preferred)

Add this to `deploy/cluster/values/storage-overrides.yaml`. Create the file if it does not exist — it is intentionally not tracked in git; see `cluster/values/storage-overrides.yaml.example` for a template:

```yaml
storage:
  workrooms:
    backend: s3
    s3:
      region: "us-west-2"
      bucket: "my-kamiwaza-artifacts"
      prefix: "context/raw"
      endpoint: ""
      existingSecret: "core-s3"
```

Notes:

- `region` and `bucket` are required; the render fails if either is empty. `prefix` is also required by render validation but defaults to `context/raw` — do not set it to an empty string.
- The Secret key names default to `access_key_id` / `secret_access_key`, matching the Secret created in step 1. If your Secret uses different key names, set `accessKeyIdKey` / `secretAccessKeyKey` alongside `existingSecret`.
- Leave `endpoint` empty for AWS S3. Set it only for S3-compatible endpoints.
- This changes the **workroom** backend only; model/registry storage keeps its configured backend.

**Session tokens.** `storage.workrooms` cannot express a session-token key. If you must use temporary session credentials, keep the block above and add only this minimal fragment to `deploy/cluster/values/overrides.yaml` — it merges onto the storage platform's rendered values and restores just the session-token key:

```yaml
core:
  context:
    objectStorage:
      credentialsSecretRef:
        sessionTokenKey: "session_token"
```

Do not put the full `objectStorage` block in `overrides.yaml`: values deep-merge per key, so a partial block mixes with the storage platform's rendered settings (for example, the in-cluster RGW `endpointUrl` would survive underneath your AWS bucket settings). Also note that session credentials expire and must be rotated, and remove the fragment when you no longer need it.

### 2b. Direct core chart values (no Helmfile)

If you apply values directly to the `core` chart — outside the deploy-repo Helmfile workflow — set the object-storage block in your core values. Set `enabled` and `endpointUrl` explicitly:

```yaml
context:
  objectStorage:
    enabled: true
    defaultBucket: "my-kamiwaza-artifacts"
    defaultRegion: "us-west-2"
    defaultPrefix: "context/raw"
    endpointUrl: ""
    credentialsSecretRef:
      name: "core-s3"
      accessKeyIdKey: "access_key_id"
      secretAccessKeyKey: "secret_access_key"
      sessionTokenKey: "session_token"
```

When applying through the umbrella chart directly (not via the deploy-repo Helmfile), nest the same structure under a top-level `core:` key. On deploy-repo Helmfile installs, do not use this form — use step 2a (plus the session-token fragment if needed).

### 3. Apply the Updated Configuration

- Deploy-repo Helmfile installs: re-run your usual deploy target — `make install` (or the matching environment target), which wraps `helmfile -f cluster/helmfile.yaml.gotmpl -e <env> sync`.
- Direct chart consumers: `helm upgrade --install <release> <chart> -n kamiwaza -f <your-values>.yaml`.

## Option 2: Ambient AWS Credentials

Use this option if your cluster already provides AWS credentials to pods through
IAM roles or another AWS-native mechanism.

In this case, do not create a Secret.

On Helmfile installs, add this to `deploy/cluster/values/storage-overrides.yaml` — leaving `existingSecret` empty means no credential environment variables are rendered and the AWS SDK falls back to ambient credentials:

```yaml
storage:
  workrooms:
    backend: s3
    s3:
      region: "us-west-2"
      bucket: "my-kamiwaza-artifacts"
      prefix: "context/raw"
      endpoint: ""
      existingSecret: ""
```

If you are applying values directly to the `core` chart, set the same shape with an empty Secret name. `enabled: true` is **required** here — with an empty Secret name the chart cannot infer it, and omitting it silently disables workroom storage:

```yaml
context:
  objectStorage:
    enabled: true
    defaultBucket: "my-kamiwaza-artifacts"
    defaultRegion: "us-west-2"
    defaultPrefix: "context/raw"
    endpointUrl: ""
    credentialsSecretRef:
      name: ""
```

Apply the updated values as in Option 1, step 3.

## Restart Existing Deployments

If the cluster is already running, restart the core workloads after applying the updated config:

```bash
kubectl rollout restart deployment/core-scheduler -n kamiwaza
kubectl delete pod -n kamiwaza -l ray.io/node-type=head
kubectl delete pod -n kamiwaza -l ray.io/node-type=worker
```

The Ray operator recreates the deleted head and worker pods.

## Verify the Configuration

### Check the ConfigMap

Verify that the non-secret S3 settings are present:

```bash
kubectl get configmap core-config -n kamiwaza -o yaml | grep CONTEXT_SERVICE_S3
```

You should see values like:

```text
CONTEXT_SERVICE_S3_DEFAULT_BUCKET: my-kamiwaza-artifacts
CONTEXT_SERVICE_S3_DEFAULT_REGION: us-west-2
CONTEXT_SERVICE_S3_DEFAULT_PREFIX: context/raw
```

### Check the Scheduler

If you are using Secret-backed credentials, verify the rendered credential reference without echoing any secret values:

```bash
kubectl get deploy core-scheduler -n kamiwaza -o yaml | grep -A4 CONTEXT_SERVICE_S3_ACCESS_KEY_ID
```

The `secretKeyRef` should name your Secret (`core-s3`) and key (`access_key_id`).

You can also inspect the live environment, although `kubectl exec` may fail on production images (they are distroless, without a shell):

```bash
kubectl exec -n kamiwaza deploy/core-scheduler -- env | grep CONTEXT_SERVICE_S3
```

### Check the Ray Head Pod

Verify the Ray head pod carries the same configuration:

```bash
kubectl get pod -n kamiwaza -l ray.io/node-type=head -o yaml | grep -A4 CONTEXT_SERVICE_S3_ACCESS_KEY_ID
```

### Validate in the Product

Retry a workflow that depends on workroom storage:

- import a Skills Library package
- upload a context file
- reopen the affected workflow and confirm the asset is still available

## Troubleshooting

### Error: secret "core-s3" not found (CreateContainerConfigError) {#secret-core-s3-not-found}

Core pods (`core-scheduler`, `core-raycluster-head`) are stuck in `CreateContainerConfigError` (shown as `0/1`, or `1/2` on Istio-injected installs), the pod events show `secret "core-s3" not found`, and a fresh install never completes — the deploy blocks on the kamiwaza release's post-install hooks while most other pods run normally.

This means core was configured to read S3 credentials from a Secret that does not exist in the `kamiwaza` namespace. It usually means a stale `core.context.objectStorage` override — for example in `deploy/cluster/values/overrides.yaml`, left over from an earlier external-S3 setup — is overriding the default SeaweedFS wiring.

Check which Secret and key names core actually references:

```bash
kubectl get deploy core-scheduler -n kamiwaza -o yaml | grep -A4 CONTEXT_SERVICE_S3_ACCESS_KEY_ID
```

- `key: access_key_id` with `name: core-s3` — this page's external-S3 override is in effect
- a SeaweedFS endpoint with `name: seaweedfs-s3-credentials` — the default wiring is in effect

Fix:

- If you intended the default SeaweedFS storage: remove the `core.context.objectStorage` block from your overrides and re-apply the release.
- If you intended external S3: create the Secret (Option 1, step 1). The kubelet retries automatically and the pods recover within a few minutes (container-creation backoff caps at 5 minutes). To force an immediate retry, delete the stuck pods:

```bash
kubectl delete pod -n kamiwaza -l app.kubernetes.io/name=core-scheduler
kubectl delete pod -n kamiwaza -l ray.io/node-type=head
```

### Error: Workroom storage is not configured for Skills Library

This usually means core does not see `CONTEXT_SERVICE_S3_DEFAULT_BUCKET`.

Check:

- your Helm values file includes `context.objectStorage.defaultBucket` (or, on Helmfile installs, `storage.workrooms.s3.bucket`)
- if you configured the block directly with an empty `credentialsSecretRef.name` (ambient credentials), `enabled: true` is set explicitly — without it the chart disables object storage
- if you are using the `deploy` repo umbrella chart, make sure any direct override is nested under `core.context.objectStorage`, not top-level `context.objectStorage`
- the `core-config` ConfigMap contains `CONTEXT_SERVICE_S3_DEFAULT_BUCKET`
- the scheduler and Ray pods were restarted after the config change

### Error: Unable to locate credentials

This means the bucket settings are present but AWS authentication is not.

Check:

- the Secret exists in the `kamiwaza` namespace
- `credentialsSecretRef.name` (or `storage.workrooms.s3.existingSecret`) matches the Secret name
- the Secret keys match the configured key names
- the scheduler and Ray pods were restarted after the Secret was created

### Error: AccessDenied or SignatureDoesNotMatch

This usually means the credentials are present but not valid for the target bucket or region.

Check:

- the bucket name
- the AWS region
- the IAM policy attached to the user or role
- whether the credentials belong to the AWS account that owns the bucket

## Security Notes

- Do not store AWS secrets in workroom attributes or user-editable metadata.
- Prefer Kubernetes Secrets or ambient AWS identity over plain-text credentials in values files.
- Leave `endpointUrl` empty for AWS S3. Set it only when using a non-AWS S3-compatible service.
