---
title: Consent Gate and Classification Banners
sidebar_label: Consent & Banners
---

# Consent Gate and Classification Banners

Kamiwaza can require users to acknowledge a consent notice before login and can display persistent classification banners across the platform UI and runtime applications.

## What This Feature Does

- shows a pre-login consent gate that users must acknowledge
- displays top and bottom classification banners
- exposes the same security presentation to runtime applications delivered through the platform

These controls are presentation and audit features. They do not replace authentication or authorization.

## Public Endpoints

These endpoints are intentionally available before login:

- `GET /api/security/public/config`
- `POST /api/security/consent/accept`
- `GET /api/security/embed.js`

Applications launched through Kamiwaza can use the same configuration through the embedded script:

```html
<script src="https://<gateway-host>/api/security/embed.js"></script>
```

## Configuration

For packaged RHEL installs, configure consent and banners in:

```text
/opt/kamiwaza/cluster/values/overrides.yaml
```

Example:

```yaml
core:
  security:
    consent:
      enabled: true
      buttonLabel: "Accept"
    banner:
      enabled: true
      topText: "UNCLASSIFIED//TEST SYSTEM"
      topColor: "#00A651"
      bottomText: "UNCLASSIFIED//TEST SYSTEM"
      bottomColor: "#00A651"
```

Apply the change:

```bash
cd /opt/kamiwaza
helmfile -e release sync
```

## Consent Content

Kamiwaza loads the consent body from its configured runtime content. If the deployment does not provide custom content, the platform falls back to a default message.

For most customer deployments, banner and consent enablement is handled through `overrides.yaml`, while any site-specific long-form consent text is packaged as part of the deployment workflow used for your environment.

## Operational Notes

- keep the banner text aligned with your site classification policy
- validate the consent flow after every upgrade that changes UI branding or security configuration
- if you embed the script in external apps, route those apps through the same public domain and gateway model used by Kamiwaza

## Related Guides

- [Administrator Guide](./admin-guide.md)
- [ReBAC Overview](./rebac-overview.md)
