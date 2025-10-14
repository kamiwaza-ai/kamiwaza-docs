---
id: admin-guide
title: Administrator Guide
sidebar_label: Administrator Guide
---

# Administrator Guide

## 0. Installation & Deployment Planning

### 0.1 Installation Time Estimates & Phase Breakdown

- **Typical end-to-end:** **65–130 minutes** (≈90 minutes median; first model pulls dominate variance)
- **Start-to-first-login (no optimizations):**
  - **Development (single node):** 45–90 minutes – Docker Desktop/WSL provisioning and initial model download
  - **Staging (multi-node):** 75–110 minutes – TLS, DNS, IdP hand-off, shared storage wiring
  - **Production (HA):** 90–130 minutes – hardened secrets, load balancer, cloud infrastructure changes

| Phase | Key Activities | Dev (min) | Staging (min) | Production (min) |
|-------|----------------|-----------|---------------|------------------|
| **0. Prep** | Validate prerequisites, fetch release, warm GPU drivers | 5 | 10 | 15 |
| **1. Platform bootstrap** | Unpack release, seed `.env`, pull containers | 15 | 20 | 25 |
| **2. Auth & RBAC** | Keycloak realm import, configure `env.sh`, sync policies | 10 | 15 | 20 |
| **3. Networking** | TLS certs, DNS, Traefik routes, ForwardAuth wiring | 10 | 20 | 30 |
| **4. Models & data** | Download demo models, validate storage, seed vectordb | 5 | 15 | 20 |
| **5. Verification** | Smoke tests, SSO trial login, RBAC spot checks | 10 | 10 | 20 |

**Installation speed-ups:**
- Pre-pull container images on your registry (`docker pull ghcr.io/kamiwaza-ai/*`)
- Pre-stage model weights on NVMe or shared cache to avoid first-run delays
- Pin toolchains (`NODE_VERSION=22`, `PYTHON_VERSION=3.10`) to skip recompile steps
- Use parallel shells: one for platform, one for Keycloak/IdP updates
- Ensure GPU drivers & CUDA toolkit are current before starting the install

### 0.2 Rollback Procedures

**Emergency rollback (5–10 minutes)** — use when a deployment breaks core access:
1. Stop platform services: `bash startup/kamiwazad.sh stop`
2. Restore last known good `docker-compose.yml`, `env.sh`, and policy files
3. Re-apply TLS certs and IdP JSON if they changed
4. Start services: `bash startup/kamiwazad.sh start`
5. Run the quick verification steps in [0.3](#03-post-install-verification-checklist)

**Phase-based rollback** — revert only the last changed layer:

| Last Changed Phase | Typical Symptoms | Rollback Action |
|--------------------|------------------|-----------------|
| TLS / Traefik | 404s, cert errors | Restore previous Traefik static/dynamic config bundle |
| Identity Provider | 401/403 on all routes | Re-import previous Keycloak realm or client secret |
| RBAC Policy | Role-specific failures | Restore prior `auth_gateway_policy.yaml` |
| Application | API errors, 5xx | Roll back container tag or revert compose override |

**Pre-upgrade backup checklist** — capture before major changes:

- `env.sh`, `docker-compose.yml`, any `docker-compose.override*.yml`
- `config/auth_gateway_policy.yaml` and additional policy fragments
- TLS assets (`*.crt`, `*.key`), DNS zone exports, Traefik dynamic config
- Keycloak realm export (`kcadm.sh get realms/kamiwaza -f realm-export.json`)
- Database snapshots or storage snapshots for vector DB and metadata

**Automated snapshot helper:**

```bash
backup_dir="${BACKUP_ROOT:-$KAMIWAZA_ROOT/backups}/$(date +%Y%m%d-%H%M)"
mkdir -p "$backup_dir"
tar czf "$backup_dir/kamiwaza-config.tgz" \
  env.sh docker-compose*.yml config/auth_gateway_policy.yaml \
  config/traefik/*.yaml startup/*.sh 2>/dev/null || true
docker exec keycloak \
  /opt/keycloak/bin/kc.sh export --file /tmp/realm-export.json --realm kamiwaza
docker cp keycloak:/tmp/realm-export.json "$backup_dir/keycloak-realm.json"
echo "Backup ready at $backup_dir"
```

**Rollback decision matrix:**

| Checklist Item | All Clear? | Suggested Path |
|----------------|------------|----------------|
| Backup verified & stored off-host | ✅ | Proceed with upgrade |
| Verification script in [0.3](#03-post-install-verification-checklist) passes | ✅ | Promote to next environment |
| Critical service down and timeboxed? | ❌ | Trigger emergency rollback |
| Scoped regression isolated to last phase | ❌ | Perform targeted phase rollback |

### 0.3 Post-Install Verification Checklist

**Essential checks (≈5 minutes):**
1. Platform health endpoint returns `200 OK`
2. Keycloak reports `READY` on health probe
3. JWKS endpoint reachable and returns signing keys
4. ForwardAuth validates a freshly minted access token

```bash
# 1) Platform health
curl -sSf http://localhost:7777/health | jq .

# 2) Keycloak readiness (adjust host/tunnel as needed)
curl -sSf http://localhost:8080/health/ready

# 3) JWKS reachable (set ISS/AUD for your realm)
ISS="https://auth.example.com/realms/kamiwaza"
AUD="kamiwaza-platform"
curl -sSf "$ISS/protocol/openid-connect/certs" | jq .keys[0].kid >/dev/null

# 4) Mint token + validate via ForwardAuth
TOKEN=$(curl -s -X POST "$ISS/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$AUD" \
  -d username="$AUTH_TEST_USER" \
  -d password="$AUTH_TEST_PASS" | jq -r .access_token)

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: /api/models" \
  -H "X-Forwarded-Method: GET" \
  http://localhost:7777/auth/validate
```

**Comprehensive verification (≈15 minutes):**
- Run model catalog CRUD smoke tests (admin + user tokens)
- Validate RBAC for `viewer`, `user`, `admin` roles across key endpoints
- Confirm Traefik dashboards show all backends healthy
- Ensure background workers and vector DB report expected metrics
- Check container logs for warnings (`docker compose logs --since 10m`)

**Security validation (production focus):**
- Confirm TLS certificate chain and cipher suite via `openssl s_client`
- Verify Keycloak admin password rotated and stored in secret manager
- Ensure `KAMIWAZA_USE_AUTH` is `true` and bypass endpoints disabled
- Review audit logs for the installation window

**Automated verification script (combine the above):**

```bash
#!/usr/bin/env bash
set -euo pipefail

ISS="${ISS:-https://auth.example.com/realms/kamiwaza}"
AUD="${AUD:-kamiwaza-platform}"
AUTH_TEST_USER="${AUTH_TEST_USER:-testadmin}"
AUTH_TEST_PASS="${AUTH_TEST_PASS:-testpass}"
FORWARDAUTH_URL="${FORWARDAUTH_URL:-http://localhost:7777/auth/validate}"
HEALTH_URL="${HEALTH_URL:-http://localhost:7777/health}"
KEYCLOAK_HEALTH="${KEYCLOAK_HEALTH:-http://localhost:8080/health/ready}"

echo "[1/6] Platform health"
curl -sf "$HEALTH_URL" | jq .status

echo "[2/6] Keycloak readiness"
curl -sf "$KEYCLOAK_HEALTH" | jq .status

echo "[3/6] JWKS availability"
curl -sf "$ISS/protocol/openid-connect/certs" | jq '.keys[0].kid' >/dev/null

echo "[4/6] Minting access token for $AUTH_TEST_USER"
TOKEN=$(curl -sf -X POST "$ISS/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$AUD" \
  -d username="$AUTH_TEST_USER" \
  -d password="$AUTH_TEST_PASS" | jq -r .access_token)

echo "[5/6] ForwardAuth validation"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: /api/models" \
  -H "X-Forwarded-Method: GET" "$FORWARDAUTH_URL")
test "$STATUS" -eq 200

echo "[6/6] RBAC spot check"
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:7777/api/models >/dev/null

echo "✅ Verification complete"
```

## 1. Authentication & Access Control

Kamiwaza provides enterprise-grade authentication built on **Keycloak** with OpenID Connect (OIDC) and JWT token validation.

### 1.1 Authentication Architecture

```
User → Keycloak (IdP) → JWT Token → Traefik → ForwardAuth → API Services
                                       ↓
                                  [Validated] → Access Granted
                                       ↓
                                  [Rejected] → 401/403 Error
```

**Components:**
- **Keycloak**: Identity provider managing users, authentication, and token issuance
- **ForwardAuth Service**: Validates JWT tokens and enforces access policies
- **Traefik**: Reverse proxy routing requests through ForwardAuth middleware
- **RBAC Policy Engine**: YAML-based endpoint access control

### 1.2 Authentication Modes

Kamiwaza supports two operational modes:

| Mode | Use Case | Configuration |
|------|----------|---------------|
| **With Authentication** | Production, staging, secure environments | `KAMIWAZA_USE_AUTH=true` |
| **Bypass Mode** | Local development, debugging | `KAMIWAZA_USE_AUTH=false` |

**To enable authentication:**
```bash
# In env.sh or environment
export KAMIWAZA_USE_AUTH=true
bash startup/kamiwazad.sh restart
```

**⚠️ Warning:** Bypass mode (`KAMIWAZA_USE_AUTH=false`) disables all authentication. Use only in secure development environments.

### 1.3 Authentication Decision Matrix

| Environment | Recommended `KAMIWAZA_USE_AUTH` | Why | Supporting Actions |
|-------------|----------------------------------|-----|--------------------|
| **Production** | `true` (mandatory) | Enforces JWT validation, RBAC, audit controls | Configure TLS, rotate secrets, enable SSO |
| **Staging / QA** | `true` | Mirrors production, validates policy migrations | Use non-prod IdP realm, run verification script |
| **Developer workstation** | `true` (default) | Exercises full auth stack locally | Use `docker compose` profiles and test tokens |
| **Ephemeral sandbox / demo** | `true` | Avoids leaked endpoints during demos | Provision read-only demo users instead |
| **Diagnostics in isolated network** | `false` (time-boxed) | Only when unlocking critical-path debugging | Re-enable immediately after test window |

**Quick decision guide:**
- Need to test RBAC, SSO, or production parity? → Keep `KAMIWAZA_USE_AUTH=true`
- Troubleshooting startup without IdP access? → Temporarily set `false`, add reminder to revert
- Automating integration tests? → Keep `true`; use service accounts or test users
- Air-gapped appliance install? → Keep `true`; import realm and JWKS offline

When toggling modes:

```bash
# Enable auth (recommended default)
export KAMIWAZA_USE_AUTH=true
bash startup/kamiwazad.sh restart

# Emergency bypass (time-boxed, non-production)
export KAMIWAZA_USE_AUTH=false
bash startup/kamiwazad.sh restart
```

**Note:** `KAMIWAZA_USE_AUTH=false` disables ForwardAuth but does **not** stop Keycloak from running. IdP configuration, realm exports, and admin console access continue to work and should be maintained.

### 1.4 Token-Based Authentication

Kamiwaza uses **RS256 JWT tokens** with asymmetric cryptographic signatures.

**Token Lifecycle:**
1. **Acquisition**: User authenticates with Keycloak via username/password or SSO
2. **Validation**: ForwardAuth validates token signature against JWKS endpoint
3. **Authorization**: User roles checked against RBAC policy
4. **Expiration**: Access tokens expire (default: 1 hour), require refresh
5. **Revocation**: Logout invalidates tokens

**Token Delivery Methods:**
- HTTP `Authorization: Bearer <token>` header (recommended for APIs)
- Secure HTTP-only cookie (automatic for browser sessions)

---

## 2. User Management

### 2.1 Accessing Keycloak Admin Console

**Development (local install):**
- URL: `http://localhost:8080`
- Username: `admin`
- Password: set via `KEYCLOAK_ADMIN_PASSWORD` in `env.sh`
- `docker compose ps keycloak` to confirm container is running

**Staging / production (remote environments):**
- Keycloak typically runs behind internal networking (private subnet or Kubernetes service)
- Reach the admin console through one of:
  - **VPN** into the VPC / corporate network
  - **Bastion SSH tunnel**:
    ```bash
    ssh -N -L 8080:keycloak.internal:8080 admin@bastion.example.com
    open http://localhost:8080
    ```
  - **Reverse proxy** via Traefik with dedicated admin hostname (`https://auth-admin.example.com`)
- Credentials must be rotated and stored in your secret manager—never commit to source control

**Security notes:**
- Keycloak availability is **independent** of `KAMIWAZA_USE_AUTH`. Even in bypass mode the IdP must stay reachable for future re-enablement and SSO flows.
- Restrict admin console access to trusted networks/IPs; enforce MFA through IdP policies.
- Use `kcadm.sh` on the Keycloak host for scripted changes instead of sharing web credentials.

```bash
# Example: rotate admin password (run once per environment)
docker exec keycloak \
  /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 \
  --realm master --user admin --password "$KEYCLOAK_ADMIN_PASSWORD"
```

### 2.2 Creating User Accounts

**Via Keycloak Admin Console:**

1. Navigate to **Users** in left sidebar
2. Click **Add User**
3. Fill in required fields:
   - **Username** (required)
   - **Email** (required for password reset)
   - **First Name / Last Name** (optional)
4. Toggle **Email Verified** to `ON`
5. Click **Save**
6. Go to **Credentials** tab
7. Set temporary or permanent password
8. Assign roles (see Role Management below)

**Pre-configured Test Users:**

| Username | Password | Roles | Use Case |
|----------|----------|-------|----------|
| `testuser` | `testpass` | viewer | Read-only testing |
| `testadmin` | `testpass` | admin | Administrative testing |

**⚠️ Important:** Remove or secure test users before production deployment.

### 2.3 User Roles and Permissions

Kamiwaza defines three primary roles:

| Role | Permissions | Typical Users |
|------|-------------|---------------|
| **admin** | Full access: read, write, delete, configure | System administrators, platform operators |
| **user** | Standard access: read, write (no delete/admin) | Data scientists, developers, analysts |
| **viewer** | Read-only access | Auditors, observers, stakeholders |

**Assigning Roles:**

1. Navigate to **Users** → Select user
2. Go to **Role Mappings** tab
3. Under **Realm Roles**, select appropriate roles
4. Click **Add selected**
5. Changes take effect immediately (no logout required)

### 2.4 Password Policies

**Configuring Password Requirements:**

1. Navigate to **Realm Settings** → **Security Defenses** → **Password Policy**
2. Add policies:
   - **Minimum Length**: 12 characters (recommended)
   - **Uppercase Characters**: Require at least 1
   - **Lowercase Characters**: Require at least 1
   - **Digits**: Require at least 1
   - **Special Characters**: Require at least 1
   - **Not Username**: Prevent username as password
   - **Password History**: Prevent last 3 passwords
   - **Expire Password**: 90 days (recommended)

**Password Reset Flow:**

1. User clicks "Forgot Password" on login page
2. Keycloak sends password reset email
3. User follows link and sets new password
4. New password must meet policy requirements

**⚠️ Important:** Configure SMTP settings in Keycloak for email-based password reset to function.

---

## 3. Role-Based Access Control (RBAC)

### 3.1 RBAC Policy File

Access control is defined in **YAML policy files** that map endpoints to required roles.

**Default Location:**
- Host installs: `$KAMIWAZA_ROOT/config/auth_gateway_policy.yaml`
- Docker installs: Mounted at `/app/config/auth_gateway_policy.yaml`

**Policy File Structure:**

```yaml
version: 1
env: production
default_deny: true  # Block all endpoints unless explicitly allowed

roles:
  - id: admin
    description: "Full system access"
  - id: user
    description: "Standard user access"
  - id: viewer
    description: "Read-only access"

endpoints:
  # Model Management
  - path: "/api/models*"
    methods: ["GET"]
    roles: ["viewer", "user", "admin"]

  - path: "/api/models*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["user", "admin"]

  # Cluster Management (Admin-only)
  - path: "/api/cluster*"
    methods: ["*"]
    roles: ["admin"]

  # Vector Database (User and Admin)
  - path: "/api/vectordb*"
    methods: ["GET"]
    roles: ["viewer", "user", "admin"]

  - path: "/api/vectordb*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["user", "admin"]

  # Public endpoints (no auth required)
  - path: "/health"
    methods: ["GET"]
    roles: ["*"]  # Public

  - path: "/docs"
    methods: ["GET"]
    roles: ["*"]  # Public API documentation
```

### 3.2 Path Matching Rules

**Wildcard Patterns:**
- `*` matches zero or more characters within a path segment
- `**` matches across multiple path segments
- Patterns are case-sensitive

**Examples:**
- `/api/models*` matches `/api/models`, `/api/models/123`, `/api/models/search`
- `/api/*/health` matches `/api/models/health`, `/api/cluster/health`
- `/api/**` matches all paths under `/api/`

### 3.3 Hot Reload (No Restart Required)

The RBAC policy file is automatically reloaded when modified:

1. Edit `auth_gateway_policy.yaml`
2. Save the file
3. Changes take effect within seconds
4. Monitor logs for reload confirmation:
   ```
   INFO: Policy reloaded successfully from /app/config/auth_gateway_policy.yaml
   ```

**⚠️ Important:** Invalid YAML syntax will prevent reload and retain the previous valid configuration.

### 3.4 RBAC Policy Troubleshooting

**YAML syntax validation**
- Run a quick lint: `yamllint config/auth_gateway_policy.yaml` (or use `pip install yamllint`)
- Fallback: `python - <<'PY'` block to load with `yaml.safe_load` and detect parse failures
- Keep indentation consistent (two spaces) and quote glob patterns containing `*`

**Policy reload verification**
- Containers: `docker compose logs forwardauth | grep -i "Policy reloaded"` — expect success message within seconds
- Kubernetes: `kubectl logs deploy/forwardauth -n kamiwaza --tail=20`
- If you do not see a reload, ensure the policy file path matches `$AUTH_GATEWAY_POLICY_PATH`

**Path matching debugging**
- Enable debug logging temporarily: `export AUTH_GATEWAY_LOG_LEVEL=debug`
- Hit the ForwardAuth endpoint with the suspected path:
  ```bash
  TOKEN="..."  # supply viewer/user/admin token
  curl -v -H "Authorization: Bearer $TOKEN" \
    -H "X-Forwarded-Uri: /api/example/path" \
    -H "X-Forwarded-Method: GET" \
    http://localhost:7777/auth/validate
  ```
- Check logs for `matching endpoint` lines to confirm which rule matched (or if default deny triggered)
- Use `rg "/api"` inside the policy file to ensure paths include wildcards where required

**Quick policy validation script**

```bash
#!/usr/bin/env bash
set -euo pipefail

POLICY_FILE="${POLICY_FILE:-config/auth_gateway_policy.yaml}"
ROLE="${ROLE:-viewer}"
PATH_UNDER_TEST="${PATH_UNDER_TEST:-/api/models}"
METHOD="${METHOD:-GET}"
ISS="${ISS:-https://auth.example.com/realms/kamiwaza}"
AUD="${AUD:-kamiwaza-platform}"
USER="${USER:-testuser}"
PASS="${PASS:-testpass}"

python - <<'PY' "$POLICY_FILE"
import sys, yaml
try:
    with open(sys.argv[1]) as f:
        yaml.safe_load(f)
    print("YAML syntax ✅")
except Exception as exc:
    print(f"YAML syntax ❌: {exc}")
    sys.exit(1)
PY

TOKEN=$(curl -sf -X POST "$ISS/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$AUD" \
  -d username="$USER" \
  -d password="$PASS" | jq -r .access_token)

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: $PATH_UNDER_TEST" \
  -H "X-Forwarded-Method: $METHOD" \
  http://localhost:7777/auth/validate)

echo "ForwardAuth returned HTTP $STATUS for $ROLE hitting $METHOD $PATH_UNDER_TEST"
```

### 3.5 Adding Custom Endpoints

**Example: Protecting a new analytics endpoint**

```yaml
endpoints:
  # Add new analytics endpoint
  - path: "/api/analytics/reports*"
    methods: ["GET"]
    roles: ["user", "admin"]

  - path: "/api/analytics/reports*"
    methods: ["POST", "DELETE"]
    roles: ["admin"]
```

**Testing Access Control:**

```bash
# Get token for viewer role (should be denied POST)
VIEWER_TOKEN=$(curl -s -X POST http://localhost:8080/realms/kamiwaza/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=kamiwaza-platform" \
  -d "username=testuser" \
  -d "password=testpass" | jq -r .access_token)

# Test (expect 403 Forbidden)
curl -H "Authorization: Bearer $VIEWER_TOKEN" \
  -X POST http://localhost:7777/api/analytics/reports

# Get token for admin role (should succeed)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/realms/kamiwaza/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=kamiwaza-platform" \
  -d "username=testadmin" \
  -d "password=testpass" | jq -r .access_token)

# Test (expect 200 OK)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -X POST http://localhost:7777/api/analytics/reports
```

---

## 4. Identity Provider Integration

### 4.1 Keycloak Configuration

**Realm:** `kamiwaza`
**Client ID:** `kamiwaza-platform`

**Client Configuration Settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| **Access Type** | Public (SPA) or Confidential (backend) | Authentication flow type |
| **Valid Redirect URIs** | `https://your-domain.com/*` | Allowed OAuth callback URLs |
| **Web Origins** | `https://your-domain.com` | CORS configuration |
| **Direct Access Grants** | Enabled (dev), Disabled (prod) | Password grant for testing |

### 4.2 OAuth 2.0 / OpenID Connect Integration

Kamiwaza supports standard OIDC authentication flows.

**Environment Configuration:**

```bash
# Keycloak OIDC Settings
AUTH_GATEWAY_KEYCLOAK_URL=https://auth.yourdomain.com
AUTH_GATEWAY_KEYCLOAK_REALM=kamiwaza
AUTH_GATEWAY_KEYCLOAK_CLIENT_ID=kamiwaza-platform

# JWT Validation
AUTH_GATEWAY_JWT_ISSUER=https://auth.yourdomain.com/realms/kamiwaza
AUTH_GATEWAY_JWT_AUDIENCE=kamiwaza-platform
AUTH_GATEWAY_JWKS_URL=https://auth.yourdomain.com/realms/kamiwaza/protocol/openid-connect/certs
```

**OIDC Discovery Endpoint:**
```
https://auth.yourdomain.com/realms/kamiwaza/.well-known/openid-configuration
```

### 4.3 SAML Integration

**Configure SAML Identity Provider in Keycloak:**

1. Navigate to **Identity Providers** in Keycloak admin console
2. Select **SAML v2.0**
3. Configure SAML settings:
   - **Single Sign-On Service URL**: Your IdP's SSO endpoint
   - **Single Logout Service URL**: Your IdP's logout endpoint
   - **NameID Policy Format**: `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
   - **Principal Type**: Subject NameID
4. Upload IdP metadata XML or configure manually
5. Map SAML attributes to Keycloak user attributes
6. Enable identity provider in login flow

**Attribute Mapping Example:**
```
SAML Attribute        → Keycloak Attribute
-----------------       -------------------
email                 → email
firstName             → firstName
lastName              → lastName
memberOf              → roles
```

### 4.4 LDAP / Active Directory Integration

**Configure LDAP Federation:**

1. Navigate to **User Federation** → **Add provider** → **ldap**
2. Configure connection settings:
   - **Connection URL**: `ldap://ldap.company.com:389` or `ldaps://` for SSL
   - **Bind DN**: `cn=admin,dc=company,dc=com`
   - **Bind Credential**: LDAP admin password
3. Configure LDAP search settings:
   - **Users DN**: `ou=users,dc=company,dc=com`
   - **User Object Classes**: `inetOrgPerson, organizationalPerson`
   - **Username LDAP attribute**: `uid` or `sAMAccountName` (AD)
   - **RDN LDAP attribute**: `uid` or `cn`
   - **UUID LDAP attribute**: `entryUUID` or `objectGUID` (AD)
4. Save and test connection
5. Synchronize users: **Synchronize all users** button

**Active Directory Specific Settings:**
- **Vendor**: Active Directory
- **Username LDAP attribute**: `sAMAccountName`
- **RDN LDAP attribute**: `cn`
- **UUID LDAP attribute**: `objectGUID`
- **User Object Classes**: `person, organizationalPerson, user`

**Role Mapping from LDAP Groups:**

1. Go to **Mappers** tab in LDAP federation
2. Create new mapper: **group-ldap-mapper**
   - **Mapper Type**: `group-ldap-mapper`
   - **LDAP Groups DN**: `ou=groups,dc=company,dc=com`
   - **Group Name LDAP Attribute**: `cn`
   - **Group Object Classes**: `groupOfNames`
   - **Membership LDAP Attribute**: `member`
   - **Mode**: `READ_ONLY` or `LDAP_ONLY`
3. Map LDAP groups to Keycloak roles in **Role Mappings**

### 4.5 Single Sign-On (SSO) Setup

**Google SSO Integration:**

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Configure authorized redirect URI:
   ```
   https://auth.yourdomain.com/realms/kamiwaza/broker/google/endpoint
   ```
3. In Keycloak, navigate to **Identity Providers** → **Google**
4. Enter **Client ID** and **Client Secret** from Google Console
5. Save and enable

**Environment Configuration:**
```bash
# Google SSO
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Microsoft Azure AD / Office 365:**

1. Register application in [Azure Portal](https://portal.azure.com)
2. Configure redirect URI: `https://auth.yourdomain.com/realms/kamiwaza/broker/oidc/endpoint`
3. In Keycloak, add **OpenID Connect v1.0** provider
4. Configure with Azure AD settings:
   - **Authorization URL**: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
   - **Token URL**: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - **Client ID**: Azure application ID
   - **Client Secret**: Azure client secret

**Testing SSO:**

1. Navigate to Kamiwaza login page
2. Click SSO provider button (Google, Azure, etc.)
3. Authenticate with external identity provider
4. First-time users automatically create Keycloak account
5. Subsequent logins use existing account

### 4.6 SSO Testing Workflow – Complete Pre-Flight Checklist

**Phase checklist:**

| Phase | Goal | Owner | Exit Criteria |
|-------|------|-------|---------------|
| **1. Provider Prep** | Ensure IdP tenant/app exists and enabled | IdP admin | Service principals created, redirect URIs approved |
| **2. Keycloak Broker** | Configure identity provider in Keycloak | Kamiwaza admin | Broker status `Enabled`, test user mapped |
| **3. Environment Config** | Wire env vars & secrets | Platform ops | `AUTH_GATEWAY_*` + provider secrets present and encrypted |
| **4. Functional Test** | Validate login, role mapping, logout | QA / admin | SSO user reaches dashboard, correct roles issued |
| **5. Production Readiness** | Enforce policies, capture runbook | Security | MFA required, audit logs stored, incident rollback path |

**Provider account setup validation**
- Confirm IdP app registration has:
  - Redirect URI: `https://auth.<env-domain>/realms/kamiwaza/broker/<provider>/endpoint`
  - Logout URI (if supported) pointing to Keycloak end-session endpoint
  - Required scopes (`openid email profile` minimal; add `offline_access` if refresh tokens needed)
- Ensure test accounts exist with representative roles (admin, user, viewer)
- Validate IdP-side conditional access (MFA, device trust) aligns with environment requirements

**Configuration verification**
- Check secrets loaded: `printenv | rg PROVIDER | sort`
- Confirm Keycloak broker displays green checkmarks under **Identity Providers → <provider>**
- Verify `AUTH_GATEWAY_SSO_PROVIDER` environment variable matches expected provider slug
- Run `curl -I https://auth.<env-domain>/.well-known/openid-configuration` to confirm TLS chain

**Testing & security validation**
- Perform login flow in incognito/private browser window to avoid cached sessions
- Confirm role mappings: check Keycloak **Users → Attributes** after SSO login
- Validate logout: `https://auth.<env-domain>/realms/kamiwaza/protocol/openid-connect/logout`
- Ensure failed login attempts are logged in both IdP audit logs and Keycloak events

**Quick SSO validation script**

```bash
#!/usr/bin/env bash
set -euo pipefail

REALM_URL="${REALM_URL:-https://auth.example.com/realms/kamiwaza}"
PROVIDER="${PROVIDER:-google}"
CLIENT_ID="${CLIENT_ID:-kamiwaza-platform}"
REDIRECT_URI="${REDIRECT_URI:-https://app.example.com/oauth/callback}"

echo "[1/4] Checking IdP configuration"
curl -sf "$REALM_URL/.well-known/openid-configuration" >/dev/null && echo "Oidc discovery ✔️"

echo "[2/4] Verifying broker status"
curl -sf "$REALM_URL/broker/$PROVIDER/endpoint" -o /dev/null && echo "Broker endpoint reachable ✔️"

echo "[3/4] Performing auth code flow (manual step)"
echo "Open the following URL in your browser to complete the test login:"
echo "$REALM_URL/protocol/openid-connect/auth?client_id=$CLIENT_ID&response_type=code&scope=openid&redirect_uri=$REDIRECT_URI&kc_idp_hint=$PROVIDER"

echo "[4/4] After login, inspect returned code and exchange with:"
echo "curl -X POST $REALM_URL/protocol/openid-connect/token \\"
echo "  -d grant_type=authorization_code \\"
echo "  -d code=<paste_code_here> \\"
echo "  -d client_id=$CLIENT_ID \\"
echo "  -d redirect_uri=$REDIRECT_URI"
```

**Common issues & solutions**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Login page loops back to provider selection | Redirect URI mismatch | Update IdP app registration to match Keycloak callback |
| `invalid_grant` on token exchange | Clock skew or client secret mismatch | Sync time (NTP) and verify secret/tenant |
| Missing roles after SSO login | Mapper not attached to broker | Add **Mapper** in Keycloak identity provider settings |
| Logout keeps session alive | Front-channel logout disabled | Enable front-channel logout or configure post-logout redirect |
| MFA bypassed for admin users | IdP policy excludes service | Enforce conditional access for the SSO app client |

---

## 5. Security Configuration

### 5.1 JWT Token Configuration

**Token Security Settings:**

```bash
# JWT Validation (in env.sh)
AUTH_GATEWAY_JWT_AUDIENCE=kamiwaza-platform  # Required audience claim
AUTH_GATEWAY_JWT_ISSUER=https://auth.yourdomain.com/realms/kamiwaza
AUTH_GATEWAY_JWKS_URL=https://auth.yourdomain.com/realms/kamiwaza/protocol/openid-connect/certs

# Security Hardening
AUTH_REQUIRE_SUB=true  # Require 'sub' claim (user ID) in tokens
AUTH_EXPOSE_TOKEN_HEADER=false  # Don't expose tokens in response headers (production)
AUTH_ALLOW_UNSIGNED_STATE=false  # Require signed OIDC state parameter (production)
```

**Token Algorithms:**
- **Supported**: RS256 (RSA with SHA-256) - asymmetric cryptography
- **Not Supported**: HS256, ES256, or other algorithms

### 5.2 Session Management

**Access Token Expiration:**

Configure in Keycloak: **Realm Settings** → **Tokens**
- **Access Token Lifespan**: 1 hour (default), 5-15 minutes (high security)
- **Refresh Token Lifespan**: 30 days (default)
- **SSO Session Idle**: 30 minutes
- **SSO Session Max**: 10 hours

**Session Timeout Configuration:**

```bash
# In env.sh
AUTH_GATEWAY_TOKEN_LEEWAY=30  # Clock skew tolerance (seconds)
AUTH_GATEWAY_JWKS_CACHE_TTL=300  # JWKS cache duration (5 minutes)
```

**Best Practices:**
- Short-lived access tokens (5-15 minutes) for high-security environments
- Longer refresh tokens (days) for user convenience
- Implement token refresh in client applications
- Use secure, HTTP-only cookies for browser sessions

### 5.3 HTTPS Enforcement

**Production HTTPS Requirements:**

Kamiwaza enforces HTTPS in production and CI environments when `CI=true` or `KAMIWAZA_ENV=production`.

**TLS Configuration:**

1. Obtain SSL/TLS certificates (Let's Encrypt, commercial CA, etc.)
2. Configure Traefik with TLS:

```yaml
# traefik-dynamic.yml
tls:
  certificates:
    - certFile: /certs/your-domain.crt
      keyFile: /certs/your-domain.key
  options:
    default:
      minVersion: VersionTLS12
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
```

3. Update environment:
```bash
AUTH_GATEWAY_KEYCLOAK_URL=https://auth.yourdomain.com
KAMIWAZA_HTTPS=true
```

### 5.4 Rate Limiting (Optional - Requires Redis)

Rate limiting requires Redis configuration:

```bash
# Redis connection for rate limiting
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

**Rate Limit Configuration:**

```yaml
# In auth_gateway_policy.yaml
rate_limits:
  - path: "/api/models*"
    requests_per_minute: 100
    per_user: true

  - path: "/api/auth/token"
    requests_per_minute: 10
    per_ip: true
```

---

## 6. Monitoring & Troubleshooting

### 6.1 Health Checks

**Auth Service Health Endpoint:**

```bash
curl http://localhost:7777/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600.5,
  "KAMIWAZA_USE_AUTH": true,
  "jwks_cache_status": "healthy"
}
```

**Keycloak Health Check:**

```bash
curl http://localhost:8080/health/ready
```

### 6.2 Log Monitoring

**Auth Service Logs:**

```bash
# Docker deployments
docker logs kamiwaza-api -f | grep AUTH

# Host deployments
tail -f $KAMIWAZA_LOG_DIR/kamiwaza.log | grep AUTH
```

**Important Log Events:**
- `AUTH_FAILED` - Authentication failure with reason
- `ACCESS_DENIED` - Authorization denial with path/method/roles
- `JWKS_REFRESHED` - JWKS key cache refresh
- `POLICY_RELOADED` - RBAC policy file reload
- `TOKEN_VALIDATED` - Successful token validation

**Keycloak Logs:**

```bash
docker logs kamiwaza-keycloak -f
```

### 6.3 5-Minute Quick Diagnostic Checklist

**Step-by-step workflow:**
1. **Health endpoints:** Confirm ForwardAuth and Keycloak respond with HTTP 200.
2. **Token mint:** Acquire an access token for a known test account.
3. **Policy gate:** Call `/auth/validate` with that token and representative path/method.
4. **API smoke:** Hit a core API route (`/api/models`) with the same token.
5. **Logs sweep:** Tail auth and Keycloak logs for correlated errors or reload warnings.

**Service health commands:**

```bash
curl -sf http://localhost:7777/health | jq .status
curl -sf http://localhost:8080/health/ready | jq .status
```

**Token acquisition & validation:**

```bash
ISS="${ISS:-https://auth.example.com/realms/kamiwaza}"
AUD="${AUD:-kamiwaza-platform}"
USER="${USER:-testadmin}"
PASS="${PASS:-testpass}"

TOKEN=$(curl -sf -X POST "$ISS/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$AUD" \
  -d username="$USER" \
  -d password="$PASS" | jq -r .access_token)

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: /api/models" \
  -H "X-Forwarded-Method: GET" \
  http://localhost:7777/auth/validate
```

**API access validation:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:7777/api/models
```

**Automated diagnostic script:**

```bash
#!/usr/bin/env bash
set -euo pipefail

ISS="${ISS:-https://auth.example.com/realms/kamiwaza}"
AUD="${AUD:-kamiwaza-platform}"
USER="${USER:-testadmin}"
PASS="${PASS:-testpass}"
API_URL="${API_URL:-http://localhost:7777/api/models}"
FORWARDAUTH_URL="${FORWARDAUTH_URL:-http://localhost:7777/auth/validate}"

declare -A results

results[forwardauth_health]=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7777/health)
results[keycloak_health]=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health/ready)

TOKEN=$(curl -sf -X POST "$ISS/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$AUD" \
  -d username="$USER" \
  -d password="$PASS" | jq -r .access_token)
results[token_length]=${#TOKEN}

results[forwardauth_validate]=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: /api/models" \
  -H "X-Forwarded-Method: GET" "$FORWARDAUTH_URL")

results[api_call]=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" "$API_URL")

for key in "${!results[@]}"; do
  printf "%-24s %s\n" "$key" "${results[$key]}"
done
```

**Quick decision tree:**

| Failed Step | Likely Root Cause | Next Action |
|-------------|------------------|-------------|
| Health endpoints | Service not running / port blocked | Restart compose stack, check firewall |
| Token mint | Keycloak realm misconfig / credentials wrong | Verify IdP credentials, inspect Keycloak logs |
| Policy gate (`/auth/validate`) | RBAC policy deny / JWKS refresh issue | Run [3.4](#34-rbac-policy-troubleshooting) checks, inspect policy reload logs |
| API call | Backend service down / Traefik routing | Check service container health, review Traefik routes |
| Logs show repeated reload failures | YAML parse errors | Restore last known good policy file, lint YAML |

### 6.4 Common Issues and Solutions

#### Issue: 401 Unauthorized on All Requests

**Symptoms:** All API requests return 401 even with valid tokens

**Troubleshooting:**

1. **Check if auth is enabled:**
   ```bash
   echo $KAMIWAZA_USE_AUTH  # Should be 'true'
   ```

2. **Verify Keycloak is running:**
   ```bash
   docker ps | grep keycloak
   curl http://localhost:8080/health/ready
   ```

3. **Check JWT issuer matches:**
   ```bash
   # Decode your token
   echo $TOKEN | cut -d. -f2 | base64 -d | jq .iss

   # Compare with configuration
   echo $AUTH_GATEWAY_JWT_ISSUER
   ```

4. **Verify JWKS endpoint is accessible:**
   ```bash
   curl $AUTH_GATEWAY_JWKS_URL
   ```

**Solution:**
- Ensure `AUTH_GATEWAY_JWT_ISSUER` matches token issuer exactly
- Verify Keycloak realm name is correct
- Check network connectivity to Keycloak

#### Issue: 403 Forbidden (Valid Token)

**Symptoms:** Token is valid but access denied

**Troubleshooting:**

1. **Check user roles in token:**
   ```bash
   echo $TOKEN | cut -d. -f2 | base64 -d | jq .realm_access.roles
   ```

2. **Verify RBAC policy allows access:**
   ```bash
   cat $KAMIWAZA_ROOT/config/auth_gateway_policy.yaml
   ```

3. **Check policy file syntax:**
   ```bash
   # Invalid YAML prevents policy reload
   yamllint $KAMIWAZA_ROOT/config/auth_gateway_policy.yaml
   ```

**Solution:**
- Add required roles to user in Keycloak
- Update RBAC policy to allow endpoint/method/role combination
- Fix YAML syntax errors and reload policy

#### Issue: Token Expired Too Quickly

**Symptoms:** Tokens expire after minutes instead of expected duration

**Troubleshooting:**

1. **Check token lifespan in Keycloak:**
   - Navigate to **Realm Settings** → **Tokens**
   - Verify **Access Token Lifespan** setting

2. **Check token claims:**
   ```bash
   echo $TOKEN | cut -d. -f2 | base64 -d | jq '.exp - .iat'
   # Result is token lifetime in seconds
   ```

**Solution:**
- Increase **Access Token Lifespan** in Keycloak (for development)
- Implement token refresh in client applications
- Use refresh tokens for long-lived sessions

#### Issue: Google/SSO Login Not Working

**Symptoms:** SSO redirect fails or returns error

**Troubleshooting:**

1. **Check redirect URI configuration:**
   - Verify redirect URI in Google/Azure console matches Keycloak exactly
   - Format: `https://auth.yourdomain.com/realms/kamiwaza/broker/{provider}/endpoint`

2. **Verify client secret is set:**
   ```bash
   echo $GOOGLE_CLIENT_SECRET  # Should not be empty
   ```

3. **Check Keycloak identity provider logs:**
   ```bash
   docker logs kamiwaza-keycloak -f | grep -i broker
   ```

**Solution:**
- Update authorized redirect URIs in OAuth provider console
- Ensure client secret is configured in Keycloak
- Enable identity provider in Keycloak authentication flow

### 6.5 Diagnostic Commands

**Test Token Generation:**

```bash
# Get token from Keycloak
TOKEN=$(curl -s -X POST http://localhost:8080/realms/kamiwaza/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=kamiwaza-platform" \
  -d "username=testuser" \
  -d "password=testpass" | jq -r .access_token)

# Decode token to inspect claims
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

**Test Token Validation:**

```bash
# Test ForwardAuth validation endpoint directly
curl -v -H "Authorization: Bearer $TOKEN" \
  -H "X-Forwarded-Uri: /api/models" \
  -H "X-Forwarded-Method: GET" \
  http://localhost:7777/auth/validate
```

**Verify JWKS Endpoint:**

```bash
# Fetch public keys for signature validation
curl http://localhost:8080/realms/kamiwaza/protocol/openid-connect/certs | jq .
```

**Check RBAC Policy:**

```bash
# View current policy
cat $KAMIWAZA_ROOT/config/auth_gateway_policy.yaml

# Watch for policy reload events
tail -f $KAMIWAZA_LOG_DIR/kamiwaza.log | grep POLICY_RELOADED
```

---

## Appendix A: Environment Variable Reference

### Core Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAMIWAZA_USE_AUTH` | Enable/disable authentication | `true` | No |
| `AUTH_GATEWAY_JWT_ISSUER` | Expected JWT issuer URL | - | Yes |
| `AUTH_GATEWAY_JWT_AUDIENCE` | Expected JWT audience claim | - | Recommended |
| `AUTH_GATEWAY_JWKS_URL` | JWKS endpoint for key fetching | - | Yes |
| `AUTH_GATEWAY_POLICY_FILE` | Path to RBAC policy file | `$KAMIWAZA_ROOT/config/auth_gateway_policy.yaml` | No |

### Keycloak Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_GATEWAY_KEYCLOAK_URL` | Keycloak base URL | `http://localhost:8080` | Yes |
| `AUTH_GATEWAY_KEYCLOAK_REALM` | Keycloak realm name | `kamiwaza` | Yes |
| `AUTH_GATEWAY_KEYCLOAK_CLIENT_ID` | OAuth client ID | `kamiwaza-platform` | Yes |
| `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin password | `admin` | Yes |

### Security Hardening

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_REQUIRE_SUB` | Require 'sub' claim in tokens | `false` | No |
| `AUTH_EXPOSE_TOKEN_HEADER` | Expose token in response headers | `true` | No |
| `AUTH_ALLOW_UNSIGNED_STATE` | Allow unsigned OIDC state | `true` (dev only) | No |
| `AUTH_GATEWAY_TOKEN_LEEWAY` | Clock skew tolerance (seconds) | `30` | No |
| `AUTH_GATEWAY_JWKS_CACHE_TTL` | JWKS cache duration (seconds) | `300` | No |

### External Identity Providers

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | For Google SSO |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | For Google SSO |

---

## Appendix B: RBAC Policy Examples

### Example 1: Tiered Access by Service

```yaml
version: 1
env: production
default_deny: true

roles:
  - id: admin
    description: "System administrators"
  - id: data_scientist
    description: "Data scientists and ML engineers"
  - id: analyst
    description: "Business analysts and viewers"

endpoints:
  # Model Management - Scientists can create/edit, analysts read-only
  - path: "/api/models*"
    methods: ["GET"]
    roles: ["admin", "data_scientist", "analyst"]

  - path: "/api/models*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["admin", "data_scientist"]

  # Model Serving - Scientists can deploy, analysts can query
  - path: "/api/serving/deployments*"
    methods: ["GET"]
    roles: ["admin", "data_scientist", "analyst"]

  - path: "/api/serving/deploy"
    methods: ["POST"]
    roles: ["admin", "data_scientist"]

  - path: "/api/serving/generate"
    methods: ["POST"]
    roles: ["admin", "data_scientist", "analyst"]

  # Cluster Management - Admin-only
  - path: "/api/cluster*"
    methods: ["*"]
    roles: ["admin"]

  # Public endpoints
  - path: "/health"
    methods: ["GET"]
    roles: ["*"]
```

### Example 2: Read-Write Separation

```yaml
version: 1
env: production
default_deny: true

roles:
  - id: admin
  - id: editor
  - id: reader

endpoints:
  # Read endpoints - All authenticated users
  - path: "/api/models"
    methods: ["GET"]
    roles: ["admin", "editor", "reader"]

  - path: "/api/vectordb/collections"
    methods: ["GET"]
    roles: ["admin", "editor", "reader"]

  # Write endpoints - Editors and admins only
  - path: "/api/models"
    methods: ["POST", "PUT"]
    roles: ["admin", "editor"]

  - path: "/api/vectordb/collections"
    methods: ["POST", "PUT"]
    roles: ["admin", "editor"]

  # Delete endpoints - Admins only
  - path: "/api/models*"
    methods: ["DELETE"]
    roles: ["admin"]

  - path: "/api/vectordb/collections*"
    methods: ["DELETE"]
    roles: ["admin"]
```
