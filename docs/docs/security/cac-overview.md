  # CAC Authentication and Testing Guide

  ## Prerequisites

  - Gateway/ingress supports mTLS and can forward client certificate details.
  - CAC root/intermediate CAs are trusted by the gateway and the identity provider (IdP) (e.g., Keycloak).
  - A valid CAC (or test client certificate) for validation.

  ## Required Gateway/Auth Configuration

  Set these environment variables:

  - KAMIWAZA_USE_AUTH=true
  - AUTH_GATEWAY_CAC_ENABLED=true
  - AUTH_GATEWAY_MTLS_REQUIRED=true (required when CAC is enabled)
  - `AUTH_GATEWAY_CAC_ALLOWED_ISSUERS="<issuer1>,<issuer2>"` (DNs or SHA-256 hashes; required)
  - Optional subject parsing (e.g., EDIPI):
      - `AUTH_GATEWAY_CAC_SUBJECT_REGEX='(?P<last>[^.]+)\.(?P<first>[^.]+)\.(?P<middle>[^.]+)\.(?P<edipi>\d+)'`

  ### Revocation (recommended)

  - `AUTH_GATEWAY_CAC_CRL_URLS=<url1,url2,...>`
  - AUTH_GATEWAY_CAC_CRL_CACHE_TTL_SECONDS=86400 (default)
  - Dev-only fail-open: AUTH_GATEWAY_CAC_FAIL_OPEN=true to allow logins if revocation data is missing (default false blocks in that case).

  ### Edge Header Protection (optional)

  - `AUTH_GATEWAY_CAC_EDGE_HEADER=<header name>`
  - `AUTH_GATEWAY_EDGE_SHARED_SECRET=<16+ chars>`

  ### TLS Hardening

  - Set AUTH_GATEWAY_TLS_INSECURE=false in production.

  ## Ingress/Header Expectations

  The ingress (e.g., Traefik) must:

  - Request/require client certificates on auth routes.
  - Forward the sanitized client cert PEM in X-Forwarded-Tls-Client-Cert (required).
  - Forward a verification flag in X-Forwarded-Tls-Client-Cert-Verified (e.g., SUCCESS, recommended).
  - If forwarding subject/issuer/SAN separately, align with:
      - AUTH_GATEWAY_CAC_SUBJECT_HEADER, AUTH_GATEWAY_CAC_ISSUER_HEADER, AUTH_GATEWAY_CAC_SAN_HEADER.
  - If using an edge header, inject the edge header and shared secret.

  ## IdP (Keycloak or equivalent) Setup

  - Import CAC (or test CA) root/intermediates into the IdP truststore.
  - Enable X.509 auth and configure a principal mapper (Subject DN, email, SAN) to link the cert to a user (or auto-link).
  - Ensure realm/client configuration matches your deployment and whitelist redirect URIs.

  ## Test Flow

  1. Apply the configuration above and restart services.
  2. If no CRL/OCSP data in non-prod, either load a CRL cache or set AUTH_GATEWAY_CAC_FAIL_OPEN=true temporarily.
  3. From a client with a CAC (or test client cert), call:
      - POST `https://<gateway>/api/auth/cac/login` via the ingress (not localhost).
  4. Expected: 200 with JWT/session cookies. Failures return 4xx with reasons (issuer not allowed, revocation, missing/invalid headers).
  5. Validate token/cookies by calling a simple endpoint with the bearer token (e.g., /api/ping).

  ## Troubleshooting

  - 400/401: Missing/invalid client cert headers; issuer not in AUTH_GATEWAY_CAC_ALLOWED_ISSUERS; IdP client/realm mismatch; redirect URIs
  not whitelisted.
  - Revocation failures: Verify CRL URLs/TTL; in non-prod you can set AUTH_GATEWAY_CAC_FAIL_OPEN=true.
  - mTLS handshake issues: Gateway not trusting CAC root or client cert not presented; fix ingress TLS client auth.
  - User not found: Adjust X.509 mapper in the IdP (map Subject/SAN/EDIPI to username/email) or enable auto-link.
  - Check gateway/IdP logs for the specific rejection reason (issuer mismatch, revocation, header missing).

  ## Minimal Lab Setup

  - Use a lab CA and client cert; trust the lab CA in gateway and IdP.
  - Set AUTH_GATEWAY_CAC_ALLOWED_ISSUERS to the lab CA.
  - In strictly local/dev, you may temporarily set AUTH_GATEWAY_TLS_INSECURE=true and AUTH_GATEWAY_CAC_FAIL_OPEN=true; revert to secure
  settings for real testing.
