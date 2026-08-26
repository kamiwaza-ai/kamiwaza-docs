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

### Set display names before pairing

Supported Helmfile installations derive the cluster display name from the first
label of a custom DNS domain. Default or non-DNS domains fall back to the short
install hostname. Raw Helm installations retain the `Default Cluster` chart
value.

Set an explicit name in the persistent site overlay when the derived name is not
suitable:

```yaml
# deploy/cluster/values/overrides.yaml
core:
  initialClusterName: "fed-a"
```

Use a distinct value on each cluster and apply the normal Helmfile sync before
pairing. A later change renames the local cluster after the scheduler restarts,
but paired peers retain their cached old name. Ping does not refresh that name;
re-pair the federation to refresh peer labels and name-based selectors.

The cluster display name is separate from the hostname in `remote_ips`. The
display name labels and selects a federation, while the hostname controls the
HTTP Host header and TLS SNI.

For an IP-based connection, provide both the connect address and the hostname:

```json
{"ip": "10.0.0.12", "hostname": "fed-b.example.internal", "primary": true}
```

Kamiwaza connects to `ip` but sends `hostname` as the HTTP Host and TLS SNI.
Use the same hostname in the gateway certificate.

### Add Node IP to Gateway Certificate

Each cluster's Istio gateway cert must include its node IP as a Subject Alternative Name (SAN). Without this, TLS verification fails when the mesh proxy connects by IP.

**Option A: Via overrides.yaml (persistent)**

Add to `cluster/values/overrides.yaml`:

```yaml
global:
  ingress:
    gateway:
      ipAddresses:
        - "<THIS_CLUSTER_NODE_IP>"
      extraDnsNames:
        - "<THIS_CLUSTER_FQDN>"
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

## Recommended request/approve flow

The request/approve flow is the supported path for new pairings. The initiator
supplies connectivity and a freshly minted PSK; the receiver chooses the trust
mode and admits the request. Identity mode is never inferred from source
headers or silently changed during polling.

### 1. Initiator: mint a PSK and submit a request

```bash
LOCAL_TOKEN=...
PSK=$(curl --fail --silent --show-error -sk -X POST \
  "https://<LOCAL_IP>/api/cluster/federations/generate-psk" \
  -H "Authorization: Bearer $LOCAL_TOKEN" | jq -r .preshared_key)

curl --fail --silent --show-error -sk -X POST \
  "https://<LOCAL_IP>/api/cluster/federations/request" \
  -H "Authorization: Bearer $LOCAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg psk "$PSK" '{
    remote_cluster_name: "fed-b",
    remote_ips: [{ip: "<REMOTE_IP>", hostname: "<REMOTE_FQDN>", primary: true}],
    callback_hostname: "<LOCAL_FQDN>",
    preshared_key: $psk
  }')"
```

The PSK is stored in the platform secret catalog and is not included in the
unauthenticated receiver intake. Deliver the value to the receiver operator
through the approved out-of-band channel; do not put it in shell history,
issue comments, or logs.

### 2. Receiver: review and approve

The receiver's native administrator lists the pending request, verifies the
requester's advertised route, and approves it with the same PSK:

```bash
REMOTE_TOKEN=...
curl --fail --silent --show-error -sk \
  "https://<REMOTE_IP>/api/cluster/federations" \
  -H "Authorization: Bearer $REMOTE_TOKEN"

curl --fail --silent --show-error -sk -X POST \
  "https://<REMOTE_IP>/api/cluster/federations/<REQUEST_ID>/approve" \
  -H "Authorization: Bearer $REMOTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_mode": "receiver_realm",
    "realm_scope": "per_federation",
    "preshared_key": "<PSK_FROM_OUT_OF_BAND_CHANNEL>"
  }'
```

Inspect the returned rows for `status: "REQUESTED"`; the list filter is
reserved for the public federation lifecycle values (`PAIRING`, `PAIRED`,
`DISCONNECTED`, and `DELETED`).

For a shared realm, use `identity_mode: "shared_idp"` and provide
`shared_issuer_url` (plus `shared_jwks_url` and, when needed, `shared_ca_pem`).
The issuer must already be in the receiver's `scheduler.trustedSharedIssuers`
allow-list. `peer_kc` is not accepted by this new approval schema.

To refuse a request instead:

```bash
curl --fail --silent --show-error -sk -X POST \
  "https://<REMOTE_IP>/api/cluster/federations/<REQUEST_ID>/deny" \
  -H "Authorization: Bearer $REMOTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"operator rejected the proposed peer"}'
```

### 3. Initiator: poll to complete

```bash
curl --fail --silent --show-error -sk \
  "https://<LOCAL_IP>/api/cluster/federations/<REQUEST_ID>/request-status" \
  -H "Authorization: Bearer $LOCAL_TOKEN"
```

Poll until the response is `APPROVED`/`PAIRED` or `DENIED`. The poll performs
the signed handshake and CA exchange; a non-2xx peer response is surfaced as a
structured refusal and does not leave a phantom local credential.

### 4. Enroll receiver-realm guests (if selected)

After the federation is paired, a receiver administrator enrolls each source
identity with `POST /api/cluster/federations/{id}/guests`. The response contains
the receiver-issued `offline_token` once. The source stores it encrypted and
uses it as the per-user federation credential. Use the guest attribute and
relation endpoints to assign receiver-owned access; revocation returns a
terminal `revoked_guest`/`revoked_brokered_user` response and purges the source
credential on its next mesh call.

:::warning
The legacy two-sided create/`/pair` steps below remain only for draining old
in-flight rows. Do not use them for a new federation; they can create the
source-trusted `peer_kc` posture and are deprecated in the API.
:::

## Legacy compatibility (drain only)

Rows created by the deprecated symmetric wizard can still be completed, but the
flow is source-trusted and may be refused when `ALLOW_UNTRUSTED_FEDERATION` is
disabled. Keep each request body in a mode-`0600` file and use the supported API;
do not write federation or certificate columns directly in the database.

1. Authenticate as a native-realm administrator on both clusters using the
   normal login procedure described in the [Quickstart](../quickstart.md).
2. Create the reciprocal rows with private files that contain only your actual
   deployment values:

   ```bash
   curl --fail --silent --show-error --request POST \
     --header "Authorization: Bearer $REMOTE_ADMIN_TOKEN" \
     --header 'Content-Type: application/json' \
     --data-binary @receiver-create-private.json \
     "$REMOTE_API/cluster/federations"

   curl --fail --silent --show-error --request POST \
     --header "Authorization: Bearer $LOCAL_ADMIN_TOKEN" \
     --header 'Content-Type: application/json' \
     --data-binary @initiator-create-private.json \
     "$LOCAL_API/cluster/federations"
   ```

3. Pair the initiator row returned by the second call:

   ```bash
   curl --fail --silent --show-error --request POST \
     --header "Authorization: Bearer $LOCAL_ADMIN_TOKEN" \
     "$LOCAL_API/cluster/federations/$FEDERATION_ID/pair"
   ```

4. If a legacy peer certificate was rotated, use
   `POST /api/cluster/federations/{id}/refresh-peer-ca` with the new PEM and its
   independently compared fingerprint. The request/approve flow performs the
   CA exchange automatically; no SQL recovery is needed for new pairings.

## Verify

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

Disconnecting immediately blocks new mesh proxy requests. Running operations on the remote cluster are not canceled.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 `mesh_proxy_bad_gateway` | TLS verification failed | Re-run the signed pairing/CA exchange or use `refresh-peer-ca` with an independently verified fingerprint; add the peer IP/hostname to gateway cert SANs |
| 401 on remote cluster | Mesh HMAC verification failed | Check PSK matches; check Istio `includeRequestHeadersInCheck` includes `x-kz-mesh-*` headers |
| 403 on source before the request forwards | Cross-cluster egress is authenticated-only in the current flow — there is no `federation:operator` gate; a 403 here means the caller is not authenticated | Ensure the caller presents a valid token to the source cluster |
| 403 `namespace_unsupported` | `federation` namespace not registered | Ensure `authz/constants.py` includes `federation` in `ALLOWED_OBJECT_NAMESPACES` |
| 400 `missing_object_id` | Cluster selector did not resolve to a PAIRED federation (unknown name/UUID, a local-cluster selector, or a non-PAIRED federation). The mesh guard's id-resolver (`mesh/guards.py resolve_federation_id`) returns `None`, so `@guarded` raises this *before* the route runs — the service-layer `mesh_target_not_found` (404) / `mesh_target_is_local` (400) codes are never reached on this path (ENG-7520). | Check federation status; selector must match a PAIRED federation by name, UUID, or prefix |
| 403 `not_authorized_to_probe_cluster` on `/api/cluster/cluster_capabilities` | Mesh-origin capabilities probe lacks a `cluster:<local_uuid>` viewer grant, which federation pairing does not seed (ENG-7892) | Grant the federated subject the `cluster:<local_uuid>` viewer relation explicitly before probing |
| 307 redirect | Missing trailing slash | Add `/` to the API path |
