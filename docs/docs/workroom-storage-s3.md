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

Use this guide when your deployment stores workroom content in AWS S3.

## When You Need This

Configure AWS S3 if you want any of the following to work reliably:

- context file upload and persistence
- Skills Library package import
- Skills Library package download

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

## Configuration Model

*(Note: `install-prod.sh` natively supports configuring these values during deployment via standard Helm values overrides.)*

The `core` chart exposes a single object-storage configuration block:

```yaml
context:
  objectStorage:
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

This configuration is rendered into:

- the `core-config` ConfigMap for non-secret S3 settings
- the `core-scheduler` deployment for secret-backed AWS credentials
- the Ray head and worker pods for the same credentials

## Option 1: Static AWS Access Keys

Use this option when your cluster does not already provide AWS credentials to the pods.

### 1. Create a Kubernetes Secret

Create a Secret in the `kamiwaza` namespace:

```bash
kubectl create secret generic core-s3 \
  -n kamiwaza \
  --from-literal=access_key_id="<aws-access-key-id>" \
  --from-literal=secret_access_key="<aws-secret-access-key>"
```

If you are using temporary session credentials, include the session token:

```bash
kubectl create secret generic core-s3 \
  -n kamiwaza \
  --from-literal=access_key_id="<aws-access-key-id>" \
  --from-literal=secret_access_key="<aws-secret-access-key>" \
  --from-literal=session_token="<aws-session-token>"
```

### 2. Prepare a Configuration Override

If you deploy Kamiwaza through the `deploy` repo Helmfile workflow, add this to
`deploy/cluster/values/overrides.yaml`.

The umbrella chart passes these values to the `core` subchart, so the override
must be nested under `core.context.objectStorage`:

```yaml
core:
  context:
    objectStorage:
      defaultBucket: "my-kamiwaza-artifacts"
      defaultRegion: "us-west-2"
      defaultPrefix: "context/raw"
      credentialsSecretRef:
        name: "core-s3"
        accessKeyIdKey: "access_key_id"
        secretAccessKeyKey: "secret_access_key"
        sessionTokenKey: "session_token"
```

If you are applying values directly to the `core` chart instead of the umbrella
chart, use the same structure without the top-level `core:` wrapper.

For AWS S3, leave `endpointUrl` empty.

### 3. Apply the Updated Configuration

Apply the updated values through your standard Helm or cluster release workflow.

## Option 2: Ambient AWS Credentials

Use this option if your cluster already provides AWS credentials to pods through
IAM roles or another AWS-native mechanism.

In this case, do not create a Secret. If you deploy through the `deploy` repo,
add this to `deploy/cluster/values/overrides.yaml`:

```yaml
core:
  context:
    objectStorage:
      defaultBucket: "my-kamiwaza-artifacts"
      defaultRegion: "us-west-2"
      defaultPrefix: "context/raw"
      credentialsSecretRef:
        name: ""
```

If you are applying values directly to the `core` chart instead of the umbrella
chart, use the same structure without the top-level `core:` wrapper.

Apply the updated values through your standard Helm or cluster release workflow.

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

### Check the Scheduler Pod

Verify the scheduler sees the expected environment variables:

```bash
kubectl exec -n kamiwaza deploy/core-scheduler -- env | grep CONTEXT_SERVICE_S3
```

If you are using Secret-backed credentials, also verify the credential variables exist:

```bash
kubectl exec -n kamiwaza deploy/core-scheduler -- env | grep '^CONTEXT_SERVICE_S3_'
```

### Check the Ray Head Pod

Verify the Ray head pod also has the S3 configuration:

```bash
kubectl exec -n kamiwaza "$(kubectl get pod -n kamiwaza -l ray.io/node-type=head -o name | head -1)" -- env | grep CONTEXT_SERVICE_S3
```

### Validate in the Product

Retry a workflow that depends on workroom storage:

- import a Skills Library package
- upload a context file
- reopen the affected workflow and confirm the asset is still available

## Troubleshooting

### Error: Workroom storage is not configured for Skills Library

This usually means core does not see `CONTEXT_SERVICE_S3_DEFAULT_BUCKET`.

Check:

- your Helm values file includes `context.objectStorage.defaultBucket`
- if you are using the `deploy` repo umbrella chart, make sure the override is nested under `core.context.objectStorage`, not top-level `context.objectStorage`
- the `core-config` ConfigMap contains `CONTEXT_SERVICE_S3_DEFAULT_BUCKET`
- the scheduler and Ray pods were restarted after the config change

### Error: Unable to locate credentials

This means the bucket settings are present but AWS authentication is not.

Check:

- the Secret exists in the `kamiwaza` namespace
- `credentialsSecretRef.name` matches the Secret name
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
