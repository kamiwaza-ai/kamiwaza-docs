---
sidebar_position: 4
title: Job Submission
---

# Job Submission

Submit and manage Ray jobs on local or remote clusters. Jobs run Python entrypoints on the cluster's Ray runtime and can return structured results via a log marker protocol.

## Prerequisites

- Admin authentication (JWT token with admin role)
- Ray cluster running on the target cluster

## Tenant-mode ReBAC

On an authenticated tenant-mode install, ordinary cluster jobs work with
ReBAC enabled and the community fallback disabled. The request is authorized
at the Kamiwaza API, then the Core API submits the job to the in-cluster Ray
Dashboard Jobs API on port `8265`. The Core API is served by the Ray head
workload, so the chart's Ray-head `AuthorizationPolicy` must allow the
`core-ray` service account to use that port. The public ingress rule alone is
not sufficient for this east-west request, and the Ray Dashboard should not
be exposed as a public job-submission endpoint.

For a fresh strict-ReBAC install, verify the complete lifecycle before making
the environment available to users:

```bash
# Run from the stack root with the deploy checkout present.
KAMIWAZA_HOST=<tenant-host> \
KUBECONFIG=<tenant-kubeconfig> \
python3 deploy/scripts/kamiwaza-smoke.py recoverable-job
```

The check submits a small recoverable job, observes its status transition, and
retrieves the structured result. A
`502` containing `Ray submit failed (403)` indicates a mesh authorization
policy problem on the Ray Dashboard hop; inspect the rendered `ray-head`
policy and confirm the `core-ray` principal and port `8265` rule before
changing ReBAC fallback settings.

## Submit a Job (Async)

```bash
curl -sk -X POST "https://kamiwaza.test/api/cluster/jobs/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entrypoint": "python train.py --epochs 10",
    "runtime_env": {"pip": ["numpy", "pandas"]},
    "timeout_seconds": 300
  }'
```

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
