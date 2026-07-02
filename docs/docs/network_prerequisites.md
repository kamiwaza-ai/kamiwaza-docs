# Network Prerequisites

This page describes the network configuration required for end users to access Kamiwaza from workstations on your corporate network. It is intended as a reference for the network and security administrators responsible for DNS and TLS in your environment.

If you are running Kamiwaza locally on your own machine (e.g. Community Edition for personal use), this page does not apply — the install you run is the only client that needs to reach it.

Throughout this page, `<domain>` refers to the deployment's customer-facing hostname — the `global.domain` Helm value (typically set via `install-prod.sh --domain`), for example `kamiwaza.example.com`. See [Domain and Origin](configuration#domain-and-origin) for how this value is configured and flows through the platform.

## Checklist

- **Corporate DNS:** from end-user workstations, `<domain>` and `docs.<domain>` must resolve to the IP address where the Kamiwaza install is reachable. The Kamiwaza administrator can provide this — for a typical single-host install, it is the install host's primary network IP.
- **TLS certificate:** issue a certificate covering `<domain>` and `docs.<domain>`, signed by a CA your end-user browsers already trust (typically your corporate CA), and deliver it to the Kamiwaza administrator to install at the cluster edge.

If you prefer wildcards, note that a wildcard matches only one label and **never** the base name: `*.<domain>` covers `docs.<domain>` but **not** `<domain>` itself. To use a wildcard you therefore need both `<domain>` and `*.<domain>` — as DNS records, and as the certificate CN/SAN set (`<domain>` plus a `*.<domain>` SAN). That pair satisfies the above and covers any subdomains added by future platform features without further work. If wildcards are not permitted in your environment, the explicit names above are the current set; revisit on Kamiwaza upgrades.

End users reach Kamiwaza over HTTPS on port 443 only. HTTP is not exposed; requests to `http://<domain>` will time out rather than redirect.
