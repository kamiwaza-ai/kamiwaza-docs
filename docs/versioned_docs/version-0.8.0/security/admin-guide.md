---
id: admin-guide
title: Administrator Guide
sidebar_label: Administrator Guide
---

# Administrator Guide

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
Expected output:
```text
Stopping kamiwazad ...
Starting kamiwazad ...
kamiwazad status: active (running)
```

**⚠️ Warning:** Bypass mode (`KAMIWAZA_USE_AUTH=false`) disables all authentication. Use only in secure development environments.

### 1.3 Token-Based Authentication

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

### 2.1 Manage Local Users in the Console

The **Settings → Auth & Users** screen is the fastest way to create local accounts.

1. Sign in to the Kamiwaza console with an administrator account.
2. Open **Settings** in the left nav and switch to the **Auth & Users** tab.
3. Click **Add User**.
4. Fill in the modal:
   - **Username** – required login name.
   - **Full Name** / **Email** – optional but recommended for auditing.
   - **Role** – pick one of the built-in roles (`viewer`, `user`, `admin`). You can add multiple roles before saving.
   - **Password** – enter the initial password and **disable the “Must change password” toggle** if this account needs to log in programmatically.
5. Click **Save**. The new user appears in the **Local Users** table.
6. Use the pencil icon to edit roles later, the key icon to reset passwords, and the trash can to remove the user.

**Why disable “Must change password”?** ReBAC smoke tests and SDK logins need to authenticate immediately. Leaving the toggle enabled causes Keycloak to demand a password reset on first login, resulting in an “Invalid credentials” error for CLIs and service accounts.

### 2.2 Configure External Identity Providers

If your organization uses Google Workspace or another OIDC provider:

1. In **Settings → Auth & Users**, switch to the **Authentication Providers** section.
2. Choose **Google** or **Generic OIDC**.
3. Supply the provider’s **client ID**, **secret**, and optional **hosted domain**.
4. Click **Register**. The new provider shows up under **Configured Providers** immediately—no restart required.

### 2.3 Advanced: Use the Keycloak Admin Console

Some enterprise workflows (e.g., SCIM integrations or custom password policies) still require direct access to Keycloak.

**Default Admin Credentials** (rotate immediately in production):
- **URL:** http://localhost:8080 (or your Keycloak endpoint)
- **Username:** `admin`
- **Password:** Value of `KEYCLOAK_ADMIN_PASSWORD`

To create users in Keycloak:

1. Navigate to **Users** → **Add User**.
2. Supply username/email and click **Save**.
3. Open the **Credentials** tab, set a password, and toggle **Temporary** to `OFF`.
4. Assign roles on the **Role Mappings** tab the same way you would in the console UI.

Use this console when you need to bulk-manage accounts, configure SAML, or integrate with corporate IdPs.

### 2.4 User Roles and Permissions

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

### 2.5 Password Policies

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

### 2.6 Create a Local User in Lite Mode

Use this flow when `KAMIWAZA_LITE=true` and `KAMIWAZA_USE_AUTH=false`.

1) **Set the admin password (required)**
```bash
export KAMIWAZA_LITE=true
export KAMIWAZA_USE_AUTH=false
# Provide a password or allow generation (written under $KAMIWAZA_ROOT/runtime)
export KAMIWAZA_ADMIN_PASSWORD="kamiwaza"  # any >=12 chars for non-community builds
# export KAMIWAZA_ALLOW_GENERATED_ADMIN_PASSWORD=true  # optional fallback
```

2) **Start services**
```bash
bash launch.sh
```

3) **Mint an admin bearer token** (direct to core on port 7777)
```bash
ADMIN_TOKEN=$(curl -sk -X POST http://localhost:7777/api/auth/token \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'client_id=kamiwaza-platform' \
  -d "username=admin" \
  -d "password=${KAMIWAZA_ADMIN_PASSWORD}" | jq -r '.access_token')
```
If you start `kamiwaza/main.py` with `--no-url-prefix`, drop the `/api` prefix.

4) **Create the user**
```bash
curl -sk -X POST http://localhost:7777/api/auth/users/local \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"username":"demo","password":"demo12345678","email":"demo@example.com","roles":["user"]}' | jq
```

5) **Verify**
```bash
curl -sk http://localhost:7777/api/auth/users -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq
```

Troubleshooting:
- `401/403` → missing or expired admin token.
- `Password changes not supported` → account is external; use local users only in Lite.
- `KAMIWAZA_ADMIN_PASSWORD` missing → set it or enable `KAMIWAZA_ALLOW_GENERATED_ADMIN_PASSWORD=true` and read `runtime/generated-admin-password.txt`.

---

## 3. Role-Based Access Control (RBAC)

### 3.1 RBAC Policy File

Access control is defined in **YAML policy files** that map endpoints to required roles.

**Default Location:**
- Host installs: `$KAMIWAZA_ROOT/config/auth_gateway_policy.yaml`
- Docker installs: Mounted at `/app/config/auth_gateway_policy.yaml`

ForwardAuth is stateless—set `AUTH_GATEWAY_POLICY_FILE=$KAMIWAZA_ROOT/config/auth_gateway_policy.yaml` (or the mounted path) so every restart reloads the same policy file.

**Policy File Structure (default `config/auth_gateway_policy.yaml`):**

```yaml
version: 1
env: dev
default_deny: true

roles:
  - id: admin
    description: "Full system access"
  - id: user
    description: "Standard user access"
  - id: viewer
    description: "Read-only access"
  - id: guest
    description: "Minimal guest access"

endpoints:
  # Health checks
  - path: "/health"
    methods: ["GET"]
    roles: ["*"]
  - path: "/api/health"
    methods: ["GET"]
    roles: ["*"]

  # Auth endpoints (login/logout)
  - path: "/auth/login"
    methods: ["POST"]
    roles: ["*"]
  - path: "/auth/logout"
    methods: ["POST"]
    roles: ["*"]

  # Who am I
  - path: "/api/whoami"
    methods: ["GET"]
    roles: ["admin", "user", "viewer", "guest"]

  # Models
  - path: "/api/models*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer"]
  - path: "/api/models*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["admin", "user"]

  # Serving deployments
  - path: "/api/serving/deployments*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer"]
  - path: "/api/serving/deployments*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["admin", "user"]

  # Admin-only APIs
  - path: "/api/cluster*"
    methods: ["*"]
    roles: ["admin"]
  - path: "/api/activity*"
    methods: ["*"]
    roles: ["admin"]

  # Garden apps + tools
  - path: "/api/apps*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer"]
  - path: "/api/apps*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["admin", "user"]
  - path: "/api/tools*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer"]
  - path: "/api/tools*"
    methods: ["POST", "PUT", "DELETE"]
    roles: ["admin", "user"]

  # Data Discovery Engine
  - path: "/api/dde/status"
    methods: ["GET"]
    roles: ["viewer", "admin"]
  - path: "/api/dde/search"
    methods: ["POST"]
    roles: ["viewer", "admin"]
  - path: "/api/dde/reindex"
    methods: ["POST"]
    roles: ["admin"]

  # Static assets
  - path: "/static/*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer", "guest"]
  - path: "/assets/*"
    methods: ["GET"]
    roles: ["admin", "user", "viewer", "guest"]
  - path: "/favicon.ico"
    methods: ["GET"]
    roles: ["admin", "user", "viewer", "guest"]
  - path: "/manifest.json"
    methods: ["GET"]
    roles: ["admin", "user", "viewer", "guest"]
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

### 3.3 Relationship-Based Access Control (ReBAC)

Roles gate entire endpoints, while ReBAC expresses *who* can act on a specific resource (model, dataset, container, etc.). When ReBAC is enabled:

1. **Turn on the feature flags** – set `AUTH_REBAC_ENABLED=true`, `AUTH_REBAC_DEFAULT_TENANT_ID`, and PAT tagging variables as described in the [ReBAC Deployment Guide](./rebac-deployment-guide.md#enable-rebac).
2. **Bootstrap tenant tuples** – run<br/>
   ```bash
   python scripts/rebac_tenant.py bootstrap configs/rebac/tenants/__default__.yaml
   ```<br/>
   This seeds owner/editor/clearance relationships for every default resource.
3. **Share resources by relationship** – edit the tenant manifest and reapply it. Example snippet (`configs/rebac/tenants/__default__.yaml`):<br/>
   ```yaml
   relationships:
     - subject: user:testuser
       relation: viewer
       object: model:catalog-sdk
   ```<br/>
   Save the file, preview the change with `python scripts/rebac_tenant.py plan configs/rebac/tenants/__default__.yaml`, then apply it with the same `bootstrap` command. The CLI ensures tuples are deduplicated and can target any tenant with `--tenant <id>`.
4. **Validate the experience** – follow the [ReBAC Validation Checklist](./rebac-validation-checklist.md) to exercise both allow and deny flows from the SDK/UI. The checklist calls out the expected log messages and API responses so you can sign off without digging into tuples manually.

**At a glance:** every tuple stored in the relationship service takes the form `subject --(relation)--> object`. Common relations:

| Relation | Description | Example |
|----------|-------------|---------|
| `owner` | Full control over the resource | `user:testadmin owner model:demo-llm` |
| `editor` | Update/delete rights without being the original owner | `role:user editor dataset:sales-ingest` |
| `viewer` | Read-only access | `user:testuser viewer container:govdocs` |

Once a tuple exists, the UI/API automatically enforces it—no redeploy or restart required.

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

### 3.4 Adding Custom Endpoints

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
**Response:**
```json
{"status":"UP"}
```

### 6.2 Log Monitoring

Refer to the [Observability Guide](../observability.md) for end-to-end logging, OTEL, and SIEM integration. It covers how to tail auth logs, forward them to your enterprise collectors, and verify that allow/deny events appear in the standard dashboards.

### 6.3 Common Issues and Solutions

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
   Expected `docker ps` output:
   ```text
   default_kamiwaza-keycloak-web   Up 2 minutes (healthy)   0.0.0.0:8080->8080/tcp
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

### 6.4 Diagnostic Commands

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
Expected response:
```json
{
  "keys": [
    {
      "kid": "example-kid",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

**Check RBAC Policy:**

```bash
# View current policy
cat $KAMIWAZA_ROOT/config/auth_gateway_policy.yaml

# Watch for policy reload events
tail -f $KAMIWAZA_LOG_DIR/kamiwaza.log | grep POLICY_RELOADED
```

---

## Verify Keycloak login flows

Use these checks after configuring SAML/OIDC to confirm the gateway and Keycloak agree on redirect URIs and credentials.

1. **OIDC loop**
   ```bash
   curl -I https://<gateway-host>/api/auth/login
   ```
   Expected result: HTTP `302` redirecting to `https://<keycloak-host>/realms/<realm>/protocol/openid-connect/auth`. After signing in, call:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://<gateway-host>/api/whoami
   ```
   Expected response: HTTP `200` JSON containing `user_id`, `tenant_id`, and `roles`.
2. **SAML provider**
   - In Keycloak, open **Identity Providers → SAML → Actions → Test**.
   - Complete the upstream login.
   - Expected result: Keycloak displays *Successfully authenticated* and shows the mapped attributes (email, first name, last name). If the test fails, confirm the SAML IdP metadata matches the Keycloak binding URLs listed earlier in this guide.

The same curl commands can be scripted in CI to ensure future changes do not break either flow.

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
