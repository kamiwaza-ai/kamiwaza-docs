---
title: Consent Gate and Classification Banners
sidebar_label: Consent & Banners
---

# Consent Gate and Classification Banners

Kamiwaza can enforce a pre-login consent gate and display classification banners across the UI and any embedded apps. This is designed for security and compliance programs that require a user acknowledgment before access, plus persistent system-high markings.

## What this provides

- **Consent gate**: A modal overlay shown before login that requires explicit acceptance.
- **Classification banners**: Top and bottom banners with configurable text and colors (for example "SECRET").
- **Embeddable script**: A single JavaScript include that applies the same behavior in external apps.

## Public endpoints

These endpoints are intentionally public (no auth required) so they can be used before login.

- `GET /api/security/public/config`
  - Returns the consent/banner configuration consumed by the UI and embed script.
- `POST /api/security/consent/accept`
  - Records consent acceptance for audit purposes (client IP + user agent).
- `GET /api/security/embed.js`
  - Returns the embeddable JavaScript bundle for banners and consent gate.

### Embedding the script

Add the following tag to any app that should mirror Kamiwaza's consent and banner behavior:

```html
<script src="https://<gateway-host>/api/security/embed.js"></script>
```

The script:
- Fetches `/api/security/public/config`
- Renders banners at the top and bottom of the page
- Enforces a consent gate until accepted
- Fails closed (shows the gate with a retry option if config fetch fails)

Consent is tracked in session storage for the browser session and is also recorded server-side for audit logs.

## Configuration

### Environment variables

Set these in `env.sh` (or your deployment environment) and restart the services:

| Variable | Description | Default |
| --- | --- | --- |
| `KAMIWAZA_SECURITY_CONSENT_ENABLED` | Enable the consent gate | `false` |
| `KAMIWAZA_SECURITY_CONSENT_BUTTON_LABEL` | Custom button label | `Accept` |
| `KAMIWAZA_SECURITY_BANNER_ENABLED` | Enable classification banners | `false` |
| `KAMIWAZA_SECURITY_BANNER_TOP_TEXT` | Text for the top banner | (none) |
| `KAMIWAZA_SECURITY_BANNER_TOP_COLOR` | Hex color for top banner | (none) |
| `KAMIWAZA_SECURITY_BANNER_BOTTOM_TEXT` | Text for the bottom banner | Defaults to top text |
| `KAMIWAZA_SECURITY_BANNER_BOTTOM_COLOR` | Hex color for bottom banner | Defaults to top color |

### Consent content file

Consent HTML is loaded from:

```
$KAMIWAZA_ROOT/config/security/consent.html
```

If the file is missing, a default short message is used. You can start from the packaged example in
`config/security/consent-long.html` in the platform repo and copy it to the path above.

## Operational notes

- Consent and banners are purely UI-level controls. They do not replace API authentication or authorization.
- For system-high or CAPCO-aligned deployments, keep banner text aligned with your site classification policy.
- If you embed the script in external apps, make sure those apps are reachable through the same gateway so the script can resolve the correct API origin.

