---
sidebar_position: 6
title: Operations and troubleshooting
---

# Operations and troubleshooting

Operational runbook for federated mesh operations. Covers setup verification, common failure modes, job monitoring, and diagnostic queries.

## 1. Pairing and first verification

Use the receiver-controlled `shared_idp` workflow in the
[Federation Setup](./setup.md) guide. Preflight both routes, create the
receiver record first, create and pair the initiator, then add the shared
subject to the receiver's allowlist. The handshake exchanges platform CA trust; do not
inject certificates or PSKs with SQL.

After both cards reach `PAIRED`, verify the exact record and route:

```bash
# Check federation status
curl --fail --silent --show-error \
  --header "Authorization: Bearer $LOCAL_TOKEN" \
  "$LOCAL_API/cluster/federations/$FEDERATION_ID" | jq \
  '{id,status,identity_mode,trust_posture,remote_ips,shared_issuer_url}'

# Expected: "status": "PAIRED"

# Test cross-cluster connectivity by listing remote datasets
curl --fail --silent --show-error \
  --header "Authorization: Bearer $SHARED_USER_TOKEN" \
  "$LOCAL_API/mesh/$FEDERATION_ID/api/catalog/datasets/" | jq .

# Test remote model listing
curl --fail --silent --show-error \
  --header "Authorization: Bearer $SHARED_USER_TOKEN" \
  "$LOCAL_API/mesh/$FEDERATION_ID/api/serving/deployments" | jq .
```

---

## 2. Mesh Proxy Troubleshooting

### Duplicate or stale cluster names

**Symptoms:** Federation cards show the same peer label, a renamed peer still
shows its old label, a new name returns `404 mesh_target_not_found`, or a shared
name or prefix returns `409 mesh_target_ambiguous`.

**Diagnosis:** Read the stored selector and UUID for every active federation:

```bash
curl --fail --silent --show-error \
  --header "Authorization: Bearer $LOCAL_TOKEN" \
  "$LOCAL_API/cluster/federations?status=PAIRED" | jq \
  '.[] | {id, remote_cluster_id, remote_cluster_name, status}'
```

`remote_cluster_name` is stored when the federation is created or paired.
Renaming the peer changes its local cluster row, but ping does not refresh the
cached federation row.

**Resolution:** Use the exact federation UUID for automation. Assign a distinct
`core.initialClusterName` on every cluster, then re-pair existing federations to
adopt renamed peer labels. Until re-pairing, the cached old name and federation
UUID continue to select the existing pair.

### HMAC Signature Failures (403)

**Symptoms:** 403 response on mesh proxy requests. No `rebac_denied` detail in the response body -- the request is rejected before reaching the endpoint.

**Diagnosis:**

1. **Run the typed route diagnostic** -- do not read PSK material from the
   database:

   ```bash
   curl --fail --silent --show-error --request POST \
     --header "Authorization: Bearer $LOCAL_TOKEN" \
     "$LOCAL_API/cluster/federations/$FEDERATION_ID/diagnose" | jq .
   ```

2. **Check clock skew** -- The HMAC signature includes a timestamp. The receiving cluster rejects signatures older than 300 seconds (configurable via `auth_forward_header_signature_ttl_seconds`):

   ```bash
   # Compare times on both clusters
   date -u  # Run on both clusters and compare
   ```

3. **Check that Istio forwards mesh headers** -- The ext-authz configuration must include all `X-KZ-Mesh-*` headers in `includeRequestHeadersInCheck`:

   ```bash
   kubectl get configmap istio -n istio-system -o yaml | grep -A 20 "extensionProviders"
   # Verify X-KZ-Mesh-Source-Cluster-Id, X-KZ-Mesh-Signature, etc. are listed
   ```

**Resolution:**

- If the diagnostic reports an HMAC or PSK failure: disconnect and re-pair both
  local federation records with a new out-of-band PSK. The current API does not
  provide an in-place PSK rotation endpoint. Never compare or copy stored secret
  references as if they were raw keys.
- If clock skew exceeds 300 seconds: synchronize NTP on both clusters.
- If headers are missing from ext-authz config: update the Istio mesh config and restart the ext-authz pod.

### ReBAC Denied (403 rebac_denied)

**Symptoms:** 403 with `rebac_denied` detail in the response body. The HMAC signature was valid (the request reached the endpoint), but the user lacks authorization on the target cluster.

**Diagnosis:**

1. Check the `authorization_relations` table on the **target** cluster. Note the relevant `subject_id` is the **local brokered KC UUID** (auto-provisioned on first mesh request), **not** the source cluster's user UUID — query by relation/object, or list the brokered user's local UUID first via `GET /api/cluster/federations/{id}/users`:

   ```bash
   kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
     "SELECT subject_namespace, subject_id, relation, object_namespace, object_id
      FROM authorization_relations
      WHERE object_namespace = 'dataset' AND object_id = '<dataset-urn>';"
   ```

2. For catalog/retrieval operations, the remote user needs a `viewer` relation on the `dataset` namespace for each dataset they access.

3. **Admin bypass is suppressed for mesh requests.** Even if the remote user has an `admin` role on their home cluster, they still need explicit ReBAC grants on the target cluster for per-resource operations.

**Resolution:**

Seed the per-dataset grant through the brokered-user allowlist's `initial_tuples` field. Do **not** use `/api/auth/tuples` for a brokered user: that user has no local account on the target cluster until their first mesh request, when brokering auto-provisions a local Keycloak user with a freshly-minted UUID. The check authorizes against **that local UUID**, so a tuple written against the source UUID returns `204` but never matches (access stays `404`). `initial_tuples` resolves the `{{user_id}}` placeholder to the local UUID at provision time.

```bash
# Grant viewer on a dataset to a brokered user, via the allowlist. Re-POSTing
# the entry for an already-provisioned user is idempotent.
curl -sk -X POST "https://<TARGET_IP>/api/cluster/federations/<FEDERATION_ID>/users" \
  -H "Authorization: Bearer $REMOTE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "<source-user-uuid>@<source-cluster-uuid>",
    "initial_tuples": [
      {"subject": "user:{{user_id}}", "relation": "viewer", "object": "dataset:<dataset-urn>"}
    ]
  }'
```

:::note No longer needed in 1.1
Earlier releases required a `federation:operator` relation on the source cluster to
use the mesh proxy. In 1.1 the mesh egress is **authenticated-only** — that grant is
no longer required, and a mesh `403` now originates from the **receiver's**
per-resource ReBAC or per-record gate, not a missing source-side operator relation.
:::

### CA Trust Errors (TLS)

**Symptoms:** `502 mesh_proxy_bad_gateway` response. Connection refused or TLS handshake failure in the core service logs.

**Diagnosis:**

1. Run `POST /api/cluster/federations/{id}/diagnose` and inspect the TLS layer's
   stable reason. Re-pair if the handshake did not persist peer trust.

2. Verify the remote cluster's gateway cert includes its node IP in SANs:

   ```bash
   # Run on the remote cluster
   kubectl get secret kamiwaza-tls -n istio-system -o jsonpath='{.data.tls\.crt}' \
     | base64 -d | openssl x509 -noout -text | grep -A5 "Subject Alternative Name"
   ```

3. Test TLS connectivity manually:

   ```bash
   openssl s_client -connect 192.168.50.13:443 -CAfile /tmp/remote-ca.pem
   ```

**Resolution:**

- If peer trust is absent: re-pair the federation. Do not manually inject a CA.
- If the remote certificate does not cover the configured route, update
  `global.ingress.gateway.{ipAddresses,extraDnsNames}` and reconcile the
  deployment.

### Trailing Slash Redirects (307 -> auth loss)

**Symptoms:** 307 redirect followed by 401 or 403 on the redirected request. The HMAC signature headers are lost during the redirect because the mesh proxy has `follow_redirects=False`.

**Diagnosis:**

Check the logs for 307 status codes:

```bash
kubectl logs deployment/core-scheduler -n kamiwaza | grep "307"
```

The HMAC signature binds to the specific request path. If the server redirects (e.g., `/api/catalog/datasets` to `/api/catalog/datasets/`), the signature becomes invalid for the new path.

**Resolution:**

Ensure API paths in mesh requests use the canonical form (with or without trailing slash as the endpoint expects). Most list endpoints expect a trailing slash:

```bash
# Correct
curl -sk "https://kamiwaza.test/api/mesh/studio-1/api/catalog/datasets/" ...

# May cause 307 redirect
curl -sk "https://kamiwaza.test/api/mesh/studio-1/api/catalog/datasets" ...
```

### Clock Skew

**Symptoms:** Intermittent 403 errors on mesh requests. Requests succeed sometimes and fail at other times, especially near the TTL boundary.

**Diagnosis:**

```bash
# Check the time on both clusters
ssh cluster-a "date -u '+%s'"
ssh cluster-b "date -u '+%s'"
# Difference must be < 300 seconds for mesh, < 60 seconds for pairing
```

The mesh signature TTL is 300 seconds by default (`auth_forward_header_signature_ttl_seconds`). The allowed future skew is 60 seconds (`auth_forward_header_signature_allowed_future_skew_seconds`).

**Resolution:**

Synchronize NTP on both clusters:

```bash
# On each cluster node
sudo timedatectl set-ntp true
timedatectl status
```

---

## 3. Job Monitoring

### Job States

| Status | Description |
|--------|-------------|
| `PENDING` | Submitted to Ray, queued for execution |
| `RUNNING` | Actively executing on the Ray cluster |
| `SUCCEEDED` | Completed successfully |
| `FAILED` | Exited with an error |
| `STOPPED` | Cancelled by user or timed out |

### Checking Job Status

**Local job:**

```bash
curl -sk "https://kamiwaza.test/api/cluster/jobs/<job-id>/status" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Federated job (submitted via mesh):**

```bash
curl -sk "https://kamiwaza.test/api/mesh/studio-1/cluster/jobs/<job-id>/status" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Checking Job Logs

```bash
# Local job logs
curl -sk "https://kamiwaza.test/api/cluster/jobs/<job-id>/logs" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Federated job logs
curl -sk "https://kamiwaza.test/api/mesh/studio-1/cluster/jobs/<job-id>/logs" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Result Extraction

Jobs return structured results via a log marker protocol. The job code prints a marker to stdout:

```python
import json
result = {"accuracy": 0.95, "model": "v2"}
print(f"KZ_MESH_RUN_ON_JSON::{json.dumps(result)}")
```

The platform scans the job's Ray logs (reverse, last match wins) for `KZ_MESH_RUN_ON_JSON::` and parses the JSON payload that follows.

**Extract the result:**

```bash
curl -sk "https://kamiwaza.test/api/cluster/jobs/<job-id>/result" \
  -H "Authorization: Bearer $TOKEN"
```

**Error responses:**

| Status Code | Meaning |
|-------------|---------|
| 200 | Result extracted successfully |
| 409 Conflict | Job has not reached `SUCCEEDED` status yet |
| 410 Gone | Ray logs have expired or the `KZ_MESH_RUN_ON_JSON::` marker was not found |

### Timeout and Auto-Cancel

When `timeout_seconds` is set on job submission and the job is executed via the synchronous `/run` endpoint, the platform polls Ray until the timeout elapses. If the job is still running at that point:

1. The job is cancelled via the Ray Dashboard API
2. The `timed_out` flag is set to `true` in the `federated_jobs` table
3. The job status transitions to `STOPPED`

The timeout applies only during synchronous `/run` calls. Async `/submit` does not enforce timeouts automatically.

---

## 4. Database Queries

Useful `psql` queries for monitoring federation state. Connect via:

```bash
kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza
```

### List all federations and their status

```sql
SELECT id, remote_cluster_name, status, last_ping,
       CASE WHEN remote_ca_cert IS NOT NULL THEN 'yes' ELSE 'NO' END AS has_ca_cert,
       created_at
FROM cluster_federations
ORDER BY created_at DESC;
```

### List all federated jobs

```sql
SELECT id, status, source, source_cluster_id, source_cluster_name,
       user_id, timed_out, submitted_at, ended_at
FROM federated_jobs
ORDER BY submitted_at DESC
LIMIT 20;
```

### List mesh-originated jobs only

```sql
SELECT id, status, source_cluster_name, user_id,
       entrypoint, timed_out, error_type
FROM federated_jobs
WHERE source = 'mesh'
ORDER BY submitted_at DESC;
```

### Check ReBAC relations for federation

```sql
SELECT subject_namespace, subject_id, relation, object_namespace, object_id
FROM authorization_relations
WHERE object_namespace = 'federation'
ORDER BY created_at DESC;
```

### Find failed jobs with error details

```sql
SELECT id, source_cluster_name, entrypoint,
       error_type, error_message, ended_at
FROM federated_jobs
WHERE status = 'FAILED'
ORDER BY ended_at DESC
LIMIT 10;
```

### Check for timed-out jobs

```sql
SELECT id, source, source_cluster_name, entrypoint,
       timeout_seconds, submitted_at, ended_at
FROM federated_jobs
WHERE timed_out = true
ORDER BY ended_at DESC;
```

---

## 5. Useful Headers for Debugging

All cross-cluster mesh requests include these headers. They are set by the mesh proxy on the source cluster and verified by ext-authz on the target cluster.

| Header | Purpose |
|--------|---------|
| `X-KZ-Mesh-Source-Cluster-Id` | UUID of the originating cluster. Used to look up the federation record and PSK on the receiving side. |
| `X-KZ-Mesh-User-Id` | Source-asserted user id. Whether the target adopts it as the identity is identity-mode-dependent (see note). |
| `X-KZ-Mesh-User-Roles` | Source-asserted roles (e.g., `admin,editor`). Source-asserted cluster roles are stripped for receiver-controlled modes. |
| `X-KZ-Mesh-Signature` | HMAC-SHA256 signature over the canonical payload (cluster ID, user ID, roles, route, method, URI). |
| `X-KZ-Mesh-Signature-Ts` | Unix timestamp (seconds) when the signature was issued. Must be within TTL window (default 300s). |
| `X-KZ-Mesh-Route` | Comma-separated list of cluster IDs this request has traversed. Used for loop detection (max 8 hops). |
| `X-KZ-Mesh-Correlation-Id` | UUID for cross-cluster request tracing. Preserved across hops; generated on the first hop if absent. |

:::note Identity-mode-dependent trust
In `shared_idp` (receiver-controlled) mode the target establishes identity from the
caller's **own validated shared-realm token**, not the source-asserted
`X-KZ-Mesh-User-Id`/`-Roles`. The source-asserted values are the identity only in
source-trusted `peer_kc`/grandfathered mode. See
[Identity Trust Modes](./identity-trust-modes.md).
:::

### Signature Payload

The HMAC signature binds to these fields (all lowercased in the canonical form):

| Field | Source |
|-------|--------|
| `x-kz-mesh-source-cluster-id` | Source cluster UUID |
| `x-kz-mesh-user-id` | Authenticated user ID |
| `x-kz-mesh-user-roles` | Comma-separated roles |
| `x-kz-mesh-route` | Hop trace |
| `x-forwarded-method` | HTTP method (uppercased) |
| `x-forwarded-uri` | Request path (query string stripped) |

Changing any of these fields after signing invalidates the signature. This prevents replay attacks across different endpoints or methods.
