---
sidebar_position: 2
title: Federation Setup
---

# Federation Setup Guide

This guide walks through creating a federation between two Kamiwaza clusters and verifying cross-cluster operations.

## Prerequisites

Before pairing, ensure each cluster has:

1. **Istio routing enabled**: `KAMIWAZA_ROUTING_PROVIDER=istio`
2. **STRICT mTLS**: `PeerAuthentication` in the `kamiwaza` namespace
3. **Node IP in gateway cert SANs**: The mesh proxy connects by IP; the TLS cert must include it

### Add Node IP to Gateway Certificate

Each cluster's Istio gateway cert must include its node IP as a Subject Alternative Name (SAN). Without this, TLS verification fails when the mesh proxy connects by IP.

**Option A: Via overrides.yaml (persistent)**

Add to `cluster/values/overrides.yaml`:

```yaml
global:
  istio:
    ingress:
      ipAddresses:
        - "192.168.50.168"       # This cluster's node IP
      extraDnsNames:
        - "studio-1.example.com" # Optional hostname
```

Then sync: `helmfile -f cluster/helmfile.yaml.gotmpl sync -l name=kamiwaza`

**Option B: Direct kubectl patch (quick)**

```bash
kubectl patch certificate kamiwaza-gateway-tls -n istio-system --type merge -p '{
  "spec": {
    "ipAddresses": ["192.168.50.168"],
    "dnsNames": ["localhost","kamiwaza.test","*.kamiwaza.test","studio-1.example.com"]
  }
}'
# Force re-issue
kubectl delete secret kamiwaza-tls -n istio-system
```

**Verify:**

```bash
kubectl get secret kamiwaza-tls -n istio-system -o jsonpath='{.data.tls\.crt}' \
  | base64 -d | openssl x509 -noout -text | grep -A5 "Subject Alternative Name"
# Should include: IP Address:192.168.50.168
```

:::note
On k0s-lima clusters, `install-dev.sh` auto-detects the node IP and writes it to `overrides.yaml`.
:::

## Step 1: Create Receiver on Remote Cluster

The receiver creates a WAITING federation record. Authenticate to the remote cluster and create it:

```bash
# Login to remote cluster
REMOTE_TOKEN=$(curl -sk "https://<REMOTE_IP>/api/auth/token" -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin%40kamiwaza.localhost&password=<PASSWORD>&grant_type=password' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

# Create WAITING receiver
curl -sk -X POST "https://<REMOTE_IP>/api/cluster/federations" \
  -H "Authorization: Bearer $REMOTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remote_cluster_name": "<local-cluster-name>",
    "remote_ips": [{"ip": "<LOCAL_IP>", "primary": true}],
    "preshared_key": "<shared-secret>",
    "callback_hostname": "<REMOTE_IP>",
    "role": "receiver"
  }'
```

:::important
Use the same `preshared_key` on both clusters. Set `callback_hostname` to the cluster's bridged VM IP — without it, the internal pod hostname is used, which is unreachable from the other cluster.
:::

## Step 2: Create Initiator on Local Cluster

```bash
# Login to local cluster
LOCAL_TOKEN=$(curl -sk "https://<LOCAL_IP>/api/auth/token" -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin%40kamiwaza.localhost&password=<PASSWORD>&grant_type=password' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

# Create PAIRING initiator
curl -sk -X POST "https://<LOCAL_IP>/api/cluster/federations" \
  -H "Authorization: Bearer $LOCAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remote_cluster_name": "<remote-cluster-name>",
    "remote_ips": [{"ip": "<REMOTE_IP>", "primary": true}],
    "preshared_key": "<shared-secret>",
    "callback_hostname": "<LOCAL_IP>"
  }'
# Note the federation ID from the response
```

## Step 3: Pair

```bash
curl -sk -X POST "https://<LOCAL_IP>/api/cluster/federations/<FEDERATION_ID>/pair" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
# Response: status should be "PAIRED"
```

On success, both clusters transition to `PAIRED` and ReBAC relations are seeded:
- **Source cluster**: `federation:{id}:operator` for the admin who paired
- **Target cluster**: `cluster_jobs:__all__:executor` for the remote admin

## Step 4: Store Remote CA Certificate

The mesh proxy needs to trust the remote cluster's TLS certificate. Fetch the remote cluster's root CA and store it in the federation record:

```bash
# Get remote cluster's root CA cert
REMOTE_CA=$(kubectl get secret root-ca -n kamiwaza -o jsonpath='{.data.ca\.crt}' | base64 -d)
# On the remote cluster, or via SSH

# Store in federation record
kubectl exec core-postgres-0 -n kamiwaza -- psql -U core -d kamiwaza -c \
  "UPDATE cluster_federations SET remote_ca_cert = '$(echo "$REMOTE_CA" | sed "s/'/''/g")' WHERE id = '<FEDERATION_ID>';"
```

:::note
CA cert exchange will be automated in the pairing handshake in a future release. For now, manual storage is required.
:::

## Step 5: Verify

```bash
# Query remote catalog through mesh proxy
curl -sk "https://<LOCAL_IP>/api/mesh/<remote-cluster-name>/api/catalog/datasets/" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
# Should return dataset list from the remote cluster

# List remote models
curl -sk "https://<LOCAL_IP>/api/mesh/<remote-cluster-name>/api/serving/deployments" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
# Should return deployment list from the remote cluster
```

## Disconnecting

```bash
curl -sk -X POST "https://<IP>/api/cluster/federations/<FEDERATION_ID>/disconnect" \
  -H "Authorization: Bearer $TOKEN"
```

Disconnecting immediately blocks new mesh proxy requests. Running operations on the remote cluster are not cancelled.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 `mesh_proxy_bad_gateway` | TLS verification failed | Store remote CA cert (Step 4) or add IP to gateway cert SANs |
| 401 on remote cluster | Mesh HMAC verification failed | Check PSK matches; check Istio `includeRequestHeadersInCheck` includes `x-kz-mesh-*` headers |
| 403 `rebac_denied` on source | User lacks `federation:operator` relation | Re-pair the federation (seeding happens at pair time) |
| 403 `namespace_unsupported` | `federation` namespace not registered | Ensure `authz/constants.py` includes `federation` in `ALLOWED_OBJECT_NAMESPACES` |
| 400 `missing_object_id` | Cluster selector did not resolve to a PAIRED federation — unknown name/UUID, a local-cluster selector, or a non-PAIRED federation. The mesh request guard returns this *before* the route runs, so the service-layer `mesh_target_not_found` (404) / `mesh_target_is_local` (400) codes are not reached on this path (ENG-7520). | Check federation status; selector must match a PAIRED federation by name, UUID, or prefix |
| 403 `not_authorized_to_probe_cluster` on `/cluster_capabilities` | Mesh-origin capabilities probe lacks a `cluster:<local_uuid>` viewer grant — federation pairing seeds `federation:operator` only, **not** `cluster:viewer` (ENG-7892) | Grant the federated subject the `cluster:<local_uuid>` viewer relation explicitly before probing |
| 307 redirect | Missing trailing slash | Add `/` to the API path |
