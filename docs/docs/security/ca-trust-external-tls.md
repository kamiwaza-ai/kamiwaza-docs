---
id: ca-trust-external-tls
title: CA Trust & External TLS Certificates
sidebar_label: CA Trust & TLS
---

# CA Trust & External TLS Certificates

This guide is for **administrators** who need Kamiwaza to work with their organization's
private certificate authority (CA). It covers two related needs:

- **Outbound CA trust** — make the platform trust your enterprise/private CA so it can call
  external HTTPS services (for example a private AWS Bedrock endpoint or an internal model
  mirror) with certificate verification **enabled** — no insecure flag.
- **Inbound external TLS** — serve a certificate on the platform domain that chains to your
  own CA, so browsers and clients on your network trust Kamiwaza without warnings.

Both are **self-service**: you supply a Kubernetes Secret and a few site-override values, then
re-run the installer. No changes to running pods are made by hand, and nothing requires
internet access — these work on air-gapped installs.

:::note Scope
This guide configures CA trust and the platform ingress certificate. Admin-UI certificate
management, audit-logged rotation, and per-endpoint CA fields are planned for a later release.
For peer-cluster (machine-to-machine) trust federation, see the
[Administrator Guide](admin-guide.md).
:::

## How to apply changes

All settings below go in the **site overrides file** and take effect when you re-run the
installer:

```bash
# Administrator-facing override file (same one used at install time):
/opt/kamiwaza/cluster/values/overrides.yaml
```

After editing it, re-run the installer you used to deploy — it is idempotent and re-syncs the
platform with your updated values:

```bash
sudo -E /opt/kamiwaza/scripts/install-prod.sh --domain "<your-domain-or-ip>" -y
```

You'll also use `kubectl` against the platform's Kubernetes cluster to create Secrets and to
verify results.

---

## 1. Outbound: trust an enterprise CA

Makes the platform's backend (the scheduler and its workers) trust your CA for outbound HTTPS.
The platform already distributes a combined trust bundle (its own CA **plus** the public CA
set) to its pods; you add your CA to that bundle and point the TLS-consuming variables at it.

> Adding your CA is **additive** — the public CA set and the platform's own CA are preserved,
> so calls to public services keep working.

:::warning Bedrock needs §1.4 (the certifi overlay)
The platform's Python clients split into two camps:
- **Env-driven** (stdlib, `requests`, `boto3` sigv4 transport, `aiohttp`) — read `SSL_CERT_FILE` /
  `REQUESTS_CA_BUNDLE` / `AWS_CA_BUNDLE`. Covered by step 1.2.
- **certifi-pinned** (`httpx`, and therefore **LiteLLM**, which is how Kamiwaza calls **AWS
  Bedrock** and most external chat models) — ignore env vars; pin `certifi.where()`. **Require
  the §1.4 certifi overlay.**

If you're trusting your CA for **Bedrock** (or any LiteLLM-routed model), §1.4 is part of the
recipe — not an optional extra. Skip §1.4 only if you have no httpx-based outbound path.
:::

**1.1 Create the CA Secret** in the `kamiwaza` namespace (root + any intermediates as PEM):

```bash
kubectl create secret generic kamiwaza-customer-ca \
  --from-file=enterprise-root.pem=/path/to/enterprise-root.pem \
  -n kamiwaza
```

Keep the PEM in your secrets store with restricted permissions — never put certificate
material in the overrides file.

**1.2 Add the site overrides** to `/opt/kamiwaza/cluster/values/overrides.yaml` (all three
work as a set):

```yaml
ca:
  trustBundle:
    customerCASecret: kamiwaza-customer-ca

core:
  trustManager:
    enabled: true
  scheduler:
    extraEnv:
      - name: AWS_CA_BUNDLE                       # boto3 sigv4 transport, urllib3
        value: /etc/ssl/certs/ca-certificates.crt
      - name: SSL_CERT_FILE                       # stdlib / aiohttp / OpenSSL defaults
        value: /etc/ssl/certs/ca-certificates.crt
```

> **Note:** These env vars cover env-driven HTTP clients only. They do **not** cover `httpx`,
> which the **AWS Bedrock** path and most external chat connectors use via LiteLLM. Configure
> §1.4 (certifi overlay) **in addition to** the above whenever any of those endpoints must
> trust your CA.

You don't set `REQUESTS_CA_BUNDLE` here — the platform already points it at the same bundle
for the Python `requests` library. That's why the verification step in §3 checks all three
variables even though you only configure two.

:::note
If your `overrides.yaml` already has a `core.scheduler.extraEnv` list (for example a
`LICENSE_KEY` or ReBAC entry from install time), **append** these two entries to that existing
list — don't add a second `core.scheduler.extraEnv`, which would replace it.
:::

:::warning
Use `core.trustManager`, not a top-level `trustManager:` key — only the `core`-scoped value
takes effect, and it is off by default. (This mirrors the `core.security` rule for banners.)
:::

**1.3 Apply and restart.** Re-run the installer (see [How to apply changes](#how-to-apply-changes)).
The trust bundle is mounted in a way that does **not** hot-reload, so after the first enable —
and after any later change to the CA Secret — restart the backend to pick it up:

```bash
kubectl rollout restart deployment/core-scheduler -n kamiwaza
kubectl delete pod -n kamiwaza -l ray.io/cluster=core-raycluster   # recreated automatically
```

**1.4 Extend trust to `httpx` (certifi overlay) — REQUIRED for Bedrock and LiteLLM paths.**
The variables in 1.2 cover env-driven clients. They do **not** cover `httpx`, which is what
LiteLLM uses for AWS Bedrock chat and most external chat connectors. Skip this step only if
you have no httpx-based outbound path that must trust your CA — for Bedrock, this step is
mandatory.

Overlay the trust bundle onto the `certifi` store. The path is image-specific — discover it,
then add a volume mount under `core.scheduler`:

```bash
kubectl exec deploy/core-scheduler -n kamiwaza -- python -c "import certifi; print(certifi.where())"
```
```yaml
core:
  scheduler:
    extraVolumes:
      - name: trust-bundle-certifi
        configMap:
          name: kamiwaza-trust-bundle
          items:
            - key: ca-certificates.crt
              path: ca-certificates.crt
    extraVolumeMounts:
      - name: trust-bundle-certifi
        mountPath: <path-from-the-command-above>
        subPath: ca-certificates.crt
        readOnly: true
```

---

## 2. Inbound: serve your own ingress certificate

By default Kamiwaza serves a wildcard certificate it issues from an internal CA, so external
clients see an untrusted issuer unless they trust that internal CA. Set `network.tls.mode` to
change what is served:

| `network.tls.mode` | What is served | You provide |
|--------------------|----------------|-------------|
| `cert-manager` (default) | platform wildcard from the internal CA | nothing (unchanged) |
| `byo` | your finished leaf certificate | a TLS Secret (cert chain + key) |
| `customerCA` | platform wildcard reissued from your CA | a Secret with your CA cert **and key** |

> Leaving `network.tls.mode` unset keeps the default behavior exactly as before.

### 2.1 `mode=byo` — provide a ready leaf certificate

Use this when your security office hands you a finished certificate for the platform domain.

```bash
kubectl create secret tls acme-corp-wildcard-tls \
  --cert=/path/to/fullchain.pem --key=/path/to/privkey.pem -n kamiwaza
```
```yaml
network:
  tls:
    mode: byo
    secretName: acme-corp-wildcard-tls
```

Make sure the certificate covers your domain and its subdomains (`<domain>` and `*.<domain>`).
In `byo` mode the platform issues no certificate of its own — it serves only your Secret. If
`secretName` is missing, the install **stops with a clear error** rather than serving an empty
certificate.

:::warning Renewal is your responsibility in `byo` mode
The platform's cert-manager does **not** manage this certificate. Nothing in the cluster
watches `notAfter` or renews automatically. **If you do not replace the Secret before the
certificate expires, the platform ingress will break** — every client gets a TLS handshake
error. Add the certificate's expiry to your standard PKI monitoring and rotate well before
the renewal lead time.
:::

To rotate:

```bash
# Inspect current expiry
kubectl get secret <secretName> -n kamiwaza -o jsonpath='{.data.tls\.crt}' \
  | base64 -d | openssl x509 -noout -enddate

# Replace the Secret in place (idempotent — smaller blast radius than delete + create)
kubectl create secret tls <secretName> \
  --cert=fullchain.pem --key=privkey.pem -n kamiwaza \
  --dry-run=client -o yaml | kubectl apply -f -

# Reload Traefik so it picks up the new chain
kubectl rollout restart deployment/traefik -n kamiwaza
```

If you want automatic renewal instead, use §2.2 (`customerCA` mode) — the platform's
cert-manager owns rotation there, at the cost of holding your CA's private key in-cluster.

### 2.2 `mode=customerCA` — let the platform issue from your CA

Use this when you give the platform your **CA itself** (certificate and private key) and want
it to mint and auto-rotate the platform certificate from that CA.

:::warning
This places your CA's **private key** in the cluster as a Secret. Choose it only if issuing a
subordinate CA to Kamiwaza is acceptable to your security office — otherwise prefer `byo`
(§2.1), which never exposes a signing key.
:::

:::warning Apply §1 outbound trust with the same CA when you use `customerCA`
When the platform serves a certificate chained to your CA, **in-cluster clients calling the
platform's public hostname will fail TLS verification unless they also trust your CA.** The
chart does not auto-link this — `network.tls.customerCASecretName` is a `kubernetes.io/tls`
Secret (cert + key), and §1's `ca.trustBundle.customerCASecret` is a generic Secret (cert
PEM). You need both. Apply §1 with the same CA whenever you set
`network.tls.mode=customerCA`. The same coupling applies in `byo` mode if your
operator-issued leaf chains to a CA the platform does not already trust.
:::

The Secret type **must** be `kubernetes.io/tls`, with `tls.crt` (your CA cert) and `tls.key`
(your CA private key) — that is, `kubectl create secret tls`:

```bash
kubectl create secret tls acme-corp-ca \
  --cert=/path/to/your-ca.pem --key=/path/to/your-ca-key.pem -n kamiwaza
```
```yaml
network:
  tls:
    mode: customerCA
    customerCASecretName: acme-corp-ca
```

:::warning A generic Secret with only `ca.crt` is NOT enough
cert-manager's CA Issuer reads `tls.crt` + `tls.key` from a `kubernetes.io/tls` Secret. If
you point `customerCASecretName` at a generic Secret (or a TLS Secret missing the key), the
Issuer comes up `Ready=False` and **silently never reissues** the platform certificate — the
previous one keeps serving until it expires. Confirm the type before installing:
```bash
kubectl get secret acme-corp-ca -n kamiwaza -o jsonpath='{.type}'
# expect: kubernetes.io/tls
```
After applying, also check that the Issuer is `Ready=True` (§3 verification).
:::

The platform creates an issuer from your CA and reissues its wildcard certificate from it,
rotating on the normal schedule. If `customerCASecretName` is missing, the install stops with
a clear error.

---

## 3. Verify

```bash
# Outbound: your CA is in the trust bundle (replace <CA-NAME> with a fragment of its subject):
kubectl get configmap kamiwaza-trust-bundle -n kamiwaza \
  -o jsonpath='{.data.ca-certificates\.crt}' \
  | openssl crl2pkcs7 -nocrl -certfile /dev/stdin \
  | openssl pkcs7 -print_certs -noout | grep -i "<CA-NAME>"

# Outbound: the backend points at the bundle (expect the same path three times):
kubectl exec deploy/core-scheduler -n kamiwaza -- \
  printenv AWS_CA_BUNDLE SSL_CERT_FILE REQUESTS_CA_BUNDLE

# Outbound (Bedrock/LiteLLM path): the certifi store contains your CA. AWS_CA_BUNDLE does
# NOT cover this layer — if this check fails, §1.4 (certifi overlay) has not been applied:
kubectl exec deploy/core-scheduler -n kamiwaza -- python -c "
import ssl, certifi
print(any('<CA-NAME>' in str(c) for c in ssl.create_default_context(cafile=certifi.where()).get_ca_certs()))
"
# expect: True

# Inbound: the served certificate chains to your CA:
echo | openssl s_client -connect <your-domain>:443 -servername <your-domain> 2>/dev/null \
  | openssl x509 -noout -issuer

# Inbound (customerCA mode only): the CA Issuer is Ready=True. If False, your Secret is the
# wrong type (must be kubernetes.io/tls with tls.crt + tls.key) and the platform certificate
# is silently NOT being reissued from your CA:
kubectl get issuer kamiwaza-customer-ca-issuer -n kamiwaza \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
# expect: True
```

---

## 4. Recovery

All recovery paths take minutes and need no reinstall.

- **Wrong/expired outbound CA:** replace the `kamiwaza-customer-ca` Secret, then restart the
  backend (§1.3). To back out entirely, remove the §1.2 values and re-run the installer.
- **Bad ingress certificate** (browsers fail on the platform domain): set `network.tls.mode`
  back to `cert-manager` (or remove the `network.tls` block), re-run the installer, and
  `kubectl rollout restart deployment/traefik -n kamiwaza`. Only the ingress restarts.

After any recovery, re-run the §3 checks.

---

## Related

- [Administrator Guide](admin-guide.md) — broader administrator responsibilities, including
  peer-cluster trust federation.
- [RHEL Offline Installation](../installation/redhat_offline_install.md) — the site overrides
  file and installer flow used here.
