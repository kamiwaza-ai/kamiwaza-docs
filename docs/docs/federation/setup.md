---
sidebar_position: 2
title: Federation Setup
---

# Federation Setup

This guide pairs two Kamiwaza 1.2.0 clusters using the receiver-controlled
`shared_idp` identity mode. The receiver validates the caller's shared-realm
token, then applies its own onboarding, ReBAC, and policy gates.

`receiver_realm` is reserved for the future receiver-owned guest-identity
workflow and is rejected by Kamiwaza 1.2.0. `peer_kc` remains available for
compatibility, but new `peer_kc` pairs are refused unless the operator
explicitly enables `ALLOW_UNTRUSTED_FEDERATION`.

## Prerequisites

- Two Kamiwaza 1.2.0 clusters with mutually reachable HTTPS endpoints.
- Istio selected through the supported deployment values for both clusters.
- Distinct cluster display names and distinct, mutually reachable hostnames.
- Gateway certificates whose SANs cover the hostnames used for Host and TLS
  SNI routing.
- One independently owned shared OIDC realm and its issuer and JWKS URLs.
- The shared issuer enrolled in `core.scheduler.trustedSharedIssuers` on both
  clusters.
- A native-realm cluster administrator on each cluster.

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
Use the same hostname in the gateway certificate. Configure certificate SANs
with the current chart keys:

```yaml
global:
  ingress:
    gateway:
      ipAddresses:
        - "10.0.0.12"
      extraDnsNames:
        - "fed-b.example.internal"
```

## 1. Verify both routes before pairing

In the console, select **Cluster > Federations > Add Request**, enter the peer
address, and use **Test Connection**. Resolve DNS, TCP, TLS, or L7 failures
before creating either record.

The API equivalent is admin-only:

```bash
curl --fail --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $ADMIN_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"remote_ips":[{"ip":"10.0.0.12","hostname":"fed-b.example.internal","primary":true}]}' \
  "$LOCAL_API/cluster/federations/preflight" | jq .
```

Run the same check in the opposite direction. Pairing needs bidirectional
reachability.

## 2. Create the receiver record

On the receiving cluster:

1. Select **Cluster > Federations > Add Request**.
2. Choose **Wait for remote cluster**.
3. Enter the initiator's unique cluster name, connect address, and hostname.
4. Enter a strong PSK from your approved secret manager.
5. Choose **shared_idp**.
6. Enter the shared issuer and JWKS URLs. If the issuer uses a private CA,
   supply the complete CA chain.
7. Create the request.

The receiver should show a `WAITING` record.

## 3. Create and pair the initiator

On the initiating cluster:

1. Select **Cluster > Federations > Add Request**.
2. Choose **Initiate connection**.
3. Enter the receiver's unique name, connect address, and hostname.
4. Use **Test Connection**.
5. Enter the same PSK and shared-realm values.
6. Create the request and approve the confirmation.

Both cards should reach `PAIRED` and show **Receiver-controlled** with the same
shared issuer. Use **Ping** and verify that **Last Ping** updates.

Pairing automatically exchanges the platform CA certificates. Do not update
`cluster_federations.remote_ca_cert` with SQL and do not copy a raw PSK from
the database.

## Raw API equivalent

The console uses a two-step API:

1. `POST /api/cluster/federations` creates the receiver and initiator records.
2. `POST /api/cluster/federations/{id}/pair` on the initiator drives the
   handshake.

Keep the PSK in mode-`0600` request files so it does not appear in process
arguments or shell history. The initiator request shape is:

```json
{
  "remote_cluster_name": "fed-b",
  "remote_ips": [
    {
      "ip": "10.0.0.12",
      "hostname": "fed-b.example.internal",
      "primary": true
    }
  ],
  "preshared_key": "read-from-a-private-file",
  "callback_hostname": "fed-a.example.internal",
  "role": "initiator",
  "shared_issuer_url": "https://idp.example.internal/realms/federation",
  "shared_jwks_url": "https://idp.example.internal/realms/federation/protocol/openid-connect/certs",
  "shared_ca_pem": "optional-private-ca-chain"
}
```

The receiver request uses `role: "receiver"` and the reciprocal name and
route. Create the receiver first, then the initiator, then pair the returned
initiator ID:

```bash
curl --fail --silent --show-error \
  --request POST --header "Authorization: Bearer $B_ADMIN_TOKEN" \
  --header 'Content-Type: application/json' \
  --data-binary @receiver-create-private.json \
  "$B_API/cluster/federations" > receiver.json

curl --fail --silent --show-error \
  --request POST --header "Authorization: Bearer $A_ADMIN_TOKEN" \
  --header 'Content-Type: application/json' \
  --data-binary @initiator-create-private.json \
  "$A_API/cluster/federations" > initiator.json

FEDERATION_ID="$(jq -er .id initiator.json)"
curl --fail --silent --show-error \
  --request POST --header "Authorization: Bearer $A_ADMIN_TOKEN" \
  "$A_API/cluster/federations/$FEDERATION_ID/pair" | jq .
```

Delete the private request files after pairing.

## 4. Onboard receiver-local access

Pairing establishes trust; it does not grant access to datasets, models, or
jobs. On the receiver, open the federation's **Access** panel and add each
shared-realm subject that may use the pair. Assign only the required
receiver-local grants, for example:

- `dataset:<dataset-urn>#viewer` for discovery and retrieval;
- the exact model relation required for chat; and
- `cluster_jobs:__all__#executor` for job submission.

The receiver creates and controls the local brokered identity. Source-cluster
administrator roles do not cross the federation boundary.

## 5. Verify the pair

Use the exact federation UUID when scripting. Name prefixes are rejected when
they are ambiguous.

```bash
curl --fail --silent --show-error \
  --request POST --header "Authorization: Bearer $A_ADMIN_TOKEN" \
  "$A_API/cluster/federations/$FEDERATION_ID/ping" | jq -e '.reachable == true'

curl --fail --silent --show-error \
  --header "Authorization: Bearer $SHARED_USER_TOKEN" \
  "$A_API/mesh/$FEDERATION_ID/api/catalog/datasets/" | jq .
```

The catalog response must contain only datasets authorized on the receiver.
Continue with [Federated Retrieval](./retrieval.md) and
[Job Submission](./job-submission.md).

## Diagnose a failure

Run the stored-route diagnostic before changing records:

```bash
curl --fail --silent --show-error \
  --request POST --header "Authorization: Bearer $A_ADMIN_TOKEN" \
  "$A_API/cluster/federations/$FEDERATION_ID/diagnose" | jq .
```

Common stable reasons include `dns_unresolvable`, `connection_failed`,
`connection_timeout`, `tls_untrusted_ca`, `tls_hostname_mismatch`,
`peer_identity_aliases_local`, `psk_propagation_timeout`, and
`peer_ca_projection_forbidden`.

If CA inspection is required, support both deployed certificate layouts and
never assume `root-ca` lives in the `kamiwaza` namespace:

```bash
if kubectl get secret core-internal-ca-tls -n kamiwaza >/dev/null 2>&1; then
  kubectl get secret core-internal-ca-tls -n kamiwaza \
    -o jsonpath='{.data.ca\.crt}' | base64 -d
else
  kubectl get secret root-ca -n kamiwaza-ca \
    -o jsonpath='{.data.ca\.crt}' | base64 -d
fi
```

This command is diagnostic only. Normal pairing exchanges and stores the CA.

## Disconnect

Use **Disconnect** in the federation card or call the disconnect endpoint.
Disconnect blocks new mesh admission and revokes delegated authority. Running
work is reconciled through the job lifecycle; confirm terminal status before
deleting evidence or receiver-local grants.
