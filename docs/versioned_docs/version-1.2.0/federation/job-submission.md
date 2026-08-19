---
sidebar_position: 4
title: Job Submission
---

# Job Submission

Submit and manage Ray jobs on local or remote clusters. Jobs run Python entrypoints on the cluster's Ray runtime and can return structured results via a log marker protocol.

## Prerequisites

- Admin authentication (JWT token with admin role)
- Ray cluster running on the target cluster

Federated delegated jobs additionally require receiver-side onboarding,
`cluster_jobs:__all__#executor`, the delegated-job deployment profile, and
exact receiver-local resource grants.

## Submit a Job (Async)

```bash
curl -sk -X POST "https://kamiwaza.test/api/cluster/jobs/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entrypoint": "python train.py --epochs 10",
    "runtime_env": {"env_vars": {"REPORT_FORMAT": "json"}},
    "timeout_seconds": 300
  }'
```

`runtime_env` accepts environment variables only. Kamiwaza strips Ray
execution-environment keys such as `pip`, `working_dir`, `py_modules`, and
`conda`. Use the approved dependency mechanism below for Python packages.

## Governed delegated access and approved dependencies

A receiver-executed job must name every dataset or model operation it needs.
The receiver checks the submitting identity against those exact resources
before dispatch and issues renewable, job-bound authority only for that set.

Python dependencies use exact `name==version` coordinates from the
receiver-owned package catalog:

```json
{
  "entrypoint": "python analysis.py",
  "timeout_seconds": 900,
  "delegated_access": {
    "datasets": [
      {
        "urn": "urn:li:dataset:(urn:li:dataPlatform:postgres,nps_verbatims,PROD)",
        "operations": ["discover", "retrieve"]
      }
    ],
    "models": []
  },
  "python_packages": ["humanize==4.13.0"]
}
```

Packages are not resolved from public PyPI at request time. The operator must
enable the package contract, approve each exact version and wheel SHA-256, and
configure one PyPI-compatible repository. The request receives no repository
URL or credential and cannot add an unapproved package.

For an air-gapped or restricted receiver, point the package installer at an
operator-owned mirror by mounting a Secret containing a mode-`0600`
`pip.conf`. Keep the repository URL, CA configuration, and credential out of
Helm values and job payloads. Restrict the delegated driver NetworkPolicy to
the repository's exact CIDRs and ports:

```yaml
core:
  delegatedJobs:
    enabled: true
    pythonPackages:
      enabled: true
      catalog:
        - name: humanize
          version: 4.13.0
          sha256:
            - <exact-64-character-wheel-sha256>
      repository:
        existingSecret: private-pypi
      repositoryCIDRs:
        - 10.42.0.8/32
      repositoryPorts:
        - 8443
```

Kubernetes NetworkPolicy works with CIDRs, not repository DNS names. Keep the
address set exact and update it when the mirror moves. A package coordinate
that is absent from the catalog, has the wrong digest, or cannot be fetched
fails closed before the entrypoint starts.

Response:
```json
{"job_id": "uuid", "ray_job_id": "raysubmit_...", "status": "PENDING"}
```

## Run a Job (Synchronous)

Submits and blocks until completion, returning the extracted result:

```bash
curl -sk -X POST "https://kamiwaza.test/api/cluster/jobs/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entrypoint": "python inference.py",
    "timeout_seconds": 60
  }'
```

Response:
```json
{
  "job_id": "uuid",
  "ray_job_id": "raysubmit_...",
  "status": "SUCCEEDED",
  "result": {"accuracy": 0.95},
  "duration_seconds": 12.3
}
```

## Check Job Status

```bash
curl -sk "https://kamiwaza.test/api/cluster/jobs/{job_id}/status" \
  -H "Authorization: Bearer $TOKEN"
```

Returns the full job record including status, timestamps, and error details if failed.

## Get Job Logs

```bash
curl -sk "https://kamiwaza.test/api/cluster/jobs/{job_id}/logs" \
  -H "Authorization: Bearer $TOKEN"
```

Returns Ray stdout/stderr for the job.

## Extract Job Result

```bash
curl -sk "https://kamiwaza.test/api/cluster/jobs/{job_id}/result" \
  -H "Authorization: Bearer $TOKEN"
```

Extracts structured JSON from the job's stdout. The job code must print a result marker:

```python
import json
result = {"accuracy": 0.95, "model": "v2"}
print(f"KZ_MESH_RUN_ON_JSON::{json.dumps(result)}")
```

| Status Code | Meaning |
|-------------|---------|
| 200 | Result extracted successfully |
| 409 | Job has not succeeded yet |
| 410 | Ray logs expired (result no longer available) |

## Cancel a Job

```bash
curl -sk -X POST "https://kamiwaza.test/api/cluster/jobs/{job_id}/cancel" \
  -H "Authorization: Bearer $TOKEN"
```

Requests cancellation of a running job. The job transitions to STOPPED status.

## Job Lifecycle

| Status | Description |
|--------|-------------|
| PENDING | Submitted to Ray, not yet running |
| RUNNING | Executing on Ray cluster |
| SUCCEEDED | Completed successfully |
| FAILED | Exited with error |
| STOPPED | Cancelled by user or timed out |

## Timeout and Auto-Cancel

Set `timeout_seconds` on submission. If the job exceeds this duration during a `/run` call, it is automatically cancelled and marked with `timed_out: true`.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/cluster/jobs/submit` | Async submission |
| POST | `/cluster/jobs/run` | Sync submit + poll + result |
| GET | `/cluster/jobs/{id}/status` | Job status with Ray refresh |
| GET | `/cluster/jobs/{id}/result` | Extract structured result |
| GET | `/cluster/jobs/{id}/logs` | Ray stdout/stderr |
| POST | `/cluster/jobs/{id}/cancel` | Cancel running job |
