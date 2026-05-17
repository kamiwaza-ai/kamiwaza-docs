---
sidebar_position: 6
title: Operations & Troubleshooting
---

# Operations & Troubleshooting

Operational runbook for federated mesh operations. Covers setup verification, common failure modes, job monitoring, and diagnostic queries.

## 1. Federation Setup

### Prerequisites

Before attempting to pair two clusters, verify:

1. **Both clusters run Istio** with `KAMIWAZA_ROUTING_PROVIDER=istio`
2. **STRICT mTLS** is configured (`PeerAuthentication` in the `kamiwaza` namespace)
3. **ReBAC is enabled** on both clusters
4. **Network connectivity** exists between clusters on port 443
5. **Gateway certs include node IPs** in Subject Alternative Names (SANs)
6. **NTP is synchronized** on both clusters (clock skew must be under 300 seconds)

### Step-by-Step Pairing

**1. Authenticate to both clusters:**

```bash
# Remote cluster (the receiver)
REMOTE_TOKEN=$(curl -sk "https://192.168.50.13/api/auth/token" -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin%40kamiwaza.localhost&password=kamiwaza&grant_type=password' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

# Local cluster (the initiator)
LOCAL_TOKEN=$(curl -sk "https://kamiwaza.test/api/auth/token" -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin%40kamiwaza.localhost&password=kamiwaza&grant_type=password' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
```

**2. Create WAITING receiver on the remote cluster:**

```bash
curl -sk -X POST "https://192.168.50.13/api/cluster/federations" \
  -H "Authorization: Bearer $REMOTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remote_cluster_name": "dev-laptop",
    "remote_ips": [{"ip": "192.168.50.168", "primary": true}],
    "preshared_key": "my-strong-shared-secret",
    "callback_hostname": "192.168.50.13",
    "role": "receiver"
  }'
```

**3. Create PAIRING initiator on the local cluster:**

```bash
FEDERATION_RESPONSE=$(curl -sk -X POST "https://kamiwaza.test/api/cluster/federations" \
  -H "Authorization: Bearer $LOCAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remote_cluster_name": "studio-1",
    "remote_ips": [{"ip": "192.168.50.13", "primary": true}],
    "preshared_key": "my-strong-shared-secret",
    "callback_hostname": "192.168.50.168"
  }')

FEDERATION_ID=$(echo "$FEDERATION_RESPONSE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
echo "Federation ID: $FEDERATION_ID"
```

**4. Initiate pairing:**

```bash
curl -sk -X POST "https://kamiwaza.test/api/cluster/federations/$FEDERATION_ID/pair" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
```

**5. Store remote CA certificate:**

```bash
# Fetch the remote cluster's root CA (run on the remote cluster or via SSH)
REMOTE_CA=$(kubectl get secret root-ca -n kamiwaza -o jsonpath='{.data.ca\.crt}' | base64 -d)

# Store in federation record on the local cluster
kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
  "UPDATE cluster_federations SET remote_ca_cert = '$(echo "$REMOTE_CA" | sed "s/'/''/g")' WHERE id = '$FEDERATION_ID';"
```

Repeat the CA cert step in the other direction (store the local CA on the remote cluster's federation record).

### Verifying Pairing Succeeded

```bash
# Check federation status
curl -sk "https://kamiwaza.test/api/cluster/federations/$FEDERATION_ID" \
  -H "Authorization: Bearer $LOCAL_TOKEN" | python3 -m json.tool

# Expected: "status": "PAIRED"

# Test cross-cluster connectivity by listing remote datasets
curl -sk "https://kamiwaza.test/api/mesh/studio-1/api/catalog/datasets/" \
  -H "Authorization: Bearer $LOCAL_TOKEN"

# Test remote model listing
curl -sk "https://kamiwaza.test/api/mesh/studio-1/api/serving/deployments" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
```

---

## 2. Mesh Proxy Troubleshooting

### HMAC Signature Failures (403)

**Symptoms:** 403 response on mesh proxy requests. No `rebac_denied` detail in the response body -- the request is rejected before reaching the endpoint.

**Diagnosis:**

1. **Check PSK match** -- The `preshared_key` must be identical on both sides of the federation:

   ```bash
   # On the local cluster
   kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
     "SELECT id, remote_cluster_name, preshared_key FROM cluster_federations WHERE status = 'PAIRED';"
   ```

   Compare with the same query on the remote cluster. The PSK values must match exactly.

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

- If PSKs do not match: disconnect and re-pair the federation with matching keys.
- If clock skew exceeds 300 seconds: synchronize NTP on both clusters.
- If headers are missing from ext-authz config: update the Istio mesh config and restart the ext-authz pod.

### ReBAC Denied (403 rebac_denied)

**Symptoms:** 403 with `rebac_denied` detail in the response body. The HMAC signature was valid (the request reached the endpoint), but the user lacks authorization on the target cluster.

**Diagnosis:**

1. Check the `authorization_relations` table on the **target** cluster:

   ```bash
   kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
     "SELECT subject_namespace, subject_id, relation, object_namespace, object_id
      FROM authorization_relations
      WHERE subject_id = '<remote-user-uuid>';"
   ```

2. For catalog/retrieval operations, the remote user needs a `viewer` relation on the `dataset` namespace for each dataset they access.

3. **Admin bypass is suppressed for mesh requests.** Even if the remote user has an `admin` role on their home cluster, they still need explicit ReBAC grants on the target cluster for per-resource operations.

**Resolution:**

Seed the required ReBAC relation on the target cluster:

```bash
# Grant viewer access to a specific dataset
curl -sk -X POST "https://192.168.50.13/api/auth/tuples" \
  -H "Authorization: Bearer $REMOTE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {"namespace": "user", "id": "<remote-user-uuid>"},
    "relation": "viewer",
    "object": {"namespace": "dataset", "id": "<dataset-urn>"}
  }'
```

For federation operator access on the source cluster (needed to use the mesh proxy at all):

```bash
# Grant operator on federation namespace (normally seeded during pairing)
curl -sk -X POST "https://kamiwaza.test/api/auth/tuples" \
  -H "Authorization: Bearer $LOCAL_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {"namespace": "user", "id": "<user-uuid>"},
    "relation": "operator",
    "object": {"namespace": "federation", "id": "<federation-id>"}
  }'
```

### CA Trust Errors (TLS)

**Symptoms:** `502 mesh_proxy_bad_gateway` response. Connection refused or TLS handshake failure in the core service logs.

**Diagnosis:**

1. Check that `remote_ca_cert` is populated in the `cluster_federations` table:

   ```bash
   kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
     "SELECT id, remote_cluster_name,
             CASE WHEN remote_ca_cert IS NOT NULL THEN 'SET' ELSE 'NULL' END AS ca_cert_status
      FROM cluster_federations WHERE status = 'PAIRED';"
   ```

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

- If `remote_ca_cert` is NULL: re-pair the federation, or manually inject the CA cert (see setup step 5).
- If the remote cert does not include the node IP: update the gateway certificate SANs (see [Federation Setup](./setup.md#add-node-ip-to-gateway-certificate)).

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
| `X-KZ-Mesh-User-Id` | Authenticated user ID from the source cluster. Becomes the identity for ReBAC checks on the target. |
| `X-KZ-Mesh-User-Roles` | Comma-separated roles of the authenticated user (e.g., `admin,editor`). |
| `X-KZ-Mesh-Signature` | HMAC-SHA256 signature over the canonical payload (cluster ID, user ID, roles, route, method, URI). |
| `X-KZ-Mesh-Signature-Ts` | Unix timestamp (seconds) when the signature was issued. Must be within TTL window (default 300s). |
| `X-KZ-Mesh-Route` | Comma-separated list of cluster IDs this request has traversed. Used for loop detection (max 8 hops). |
| `X-KZ-Mesh-Correlation-Id` | UUID for cross-cluster request tracing. Preserved across hops; generated on the first hop if absent. |

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
