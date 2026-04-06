---
title: Quickstart
sidebar_label: Quickstart
---

# Quickstart

Use this guide after installing Kamiwaza. It is intended for single-user deployments and administrators who are preparing for a broader rollout.

## Before You Start

Make sure you have:

- a completed Kubernetes deployment of Kamiwaza
- cluster or environment admin access appropriate for your deployment
- one administrator account and one standard user account for validation
- enough CPU, RAM, GPU, and disk for the models and extensions you plan to validate
- a plan for object storage if users will upload files or use the Skills Library
- network access to fetch models, or staged artifacts if your environment is air-gapped

This guide assumes the cluster is already installed. Current Kamiwaza deployments are Kubernetes-based in both full and lite modes.

## 1. Confirm the Kubernetes Deployment Is Healthy

Kamiwaza currently ships in two Kubernetes deployment modes:

- **Full mode**: includes Keycloak and DataHub
- **Lite mode**: smaller footprint with local JWT auth and no DataHub

After deployment, confirm the core workloads are running:

```bash
kubectl get pods -n kamiwaza
```

Then confirm you can reach your environment entry points. Common endpoints include:

- Frontend: your Kamiwaza web URL
- API documentation: your Kamiwaza API docs URL
- Ray Dashboard: if exposed in your environment

Use the gateway URL and hostnames provided for your deployment.

If the UI does not load cleanly or core pods are not healthy, pause here and review [Help & Fixes](help-and-fixes) and [Observability](observability) before moving on.

## 2. Validate Administrator and End-User Access

Use at least:

- one administrator account for platform setup and extension deployment
- one standard user account that reflects everyday end-user behavior

Create or confirm these accounts through the user-management flow available in your deployment.

In lite mode, make sure the locally configured authentication path works for both administrator and standard-user access as well. In full mode, make sure the same is true for your configured Keycloak or identity-provider flow.

For user lifecycle details, role definitions, and Keycloak administration, see the [Administrator Guide](security/admin-guide).

## 3. Validate Authentication and Session Defaults

Before inviting broader users, confirm the environment matches your security posture:

- in full mode, Keycloak and any configured OIDC, SAML, or LDAP integration behave as expected
- in lite mode, local JWT authentication and sign-in flows work as expected
- consent, banner, and handling-marking requirements are configured as intended
- administrator access to deployment and audit logs matches your environment requirements
- App Garden session defaults, including ephemeral-session policy, match your environment

Use these references while validating the environment:

- [Administrator Guide](security/admin-guide)
- [Consent and Classification](security/consent-and-classification)
- [Observability](observability)

Use the [Administrator Guide](security/admin-guide) for detailed authentication setup, external identity integration such as LDAP or Keycloak, and secrets-management guidance. Use [Observability](observability) for log configuration and validation of your deployment logging path.

If you are validating a federal deployment that uses CAC, use the [CAC Overview](federal/cac-overview) alongside this quickstart.

## 4. Configure Workroom Storage

If users will upload files, preserve workroom context, or use the Skills Library, configure object storage before release validation. Without it, common extension workflows fail or behave inconsistently.

For AWS-backed environments, follow [AWS S3 Workroom Storage](workroom-storage-s3).

When this step is complete, validate that:

- the bucket and region are configured correctly
- credentials are available to core services
- uploads and Skills Library package operations no longer fail with storage errors

## 5. Verify Observability and Deployment Logs

Before you validate extensions, make sure administrators can see enough telemetry to diagnose failures quickly.

Check:

- Kubernetes pod health with `kubectl get pods -n kamiwaza`
- Kubernetes logs with `kubectl logs -n kamiwaza <pod>`
- the UI log viewer for deployment logs
- any OpenTelemetry or external log-forwarding integration configured for your environment

Use the [Observability](observability) guide to verify logger-service coverage and cluster logging expectations.

## 6. Deploy a Validation Model

Use a small, known-good model that matches your hardware profile and is easy to redeploy during validation.

Recommended validation flow:

1. Open **Models** in the Kamiwaza UI.
2. Search for a model appropriate for your hardware profile.
3. Download the exact artifact you plan to validate.
4. Deploy the model and wait for the deployment to report healthy status.
5. Record the model name, engine, and deployment details in your release notes or validation log.

If you need help choosing or deploying a model, use:

- [Models Overview](models/overview)
- [GUI Walkthrough](models/gui-walkthrough)
- [Deployment](models/deployment)

## 7. Validate an End-User Workflow

Once the platform is up, validate at least one end-to-end end-user path instead of stopping at infrastructure checks.

### Validate Kaizen

1. Deploy **Kaizen** from **App Garden**.
2. Open the app and create a test agent.
3. Attach at least one skill or tool relevant to your environment.
4. Run a conversation that exercises file upload, tool use, or document generation.

Reference: [Kaizen User Guide](/extensions/kaizen/kaizen-user-guide)

### Validate Workroom Manager

1. Deploy **Workroom Manager** from **App Garden**.
2. Create a workroom with a title, classification banner, and optional labels.
3. Decide whether the workroom should be persistent or temporary.
4. Launch Kaizen from inside the workroom and confirm the app opens successfully.
5. If sharing is enabled in your environment, add at least one collaborator and verify role-based behavior.

Reference: [Workroom Manager User Guide](/extensions/workroom-manager/workroom-manager-user-guide)

## 8. Capture Readiness Evidence

Before calling the environment ready, record what was actually validated.

Suggested checklist:

- administrator sign-in path confirmed
- standard-user sign-in path confirmed
- object storage verified for workroom and Skills Library workflows
- at least one model deployed successfully
- Kaizen deployed and exercised successfully
- Workroom Manager deployed and exercised successfully
- deployment logs and cluster health reviewed for unexpected errors

## Next Steps

After this quickstart, most teams move into these guides:

- [Administrator Guide](security/admin-guide)
- [AWS S3 Workroom Storage](workroom-storage-s3)
- [Observability](observability)
- [Help & Fixes](help-and-fixes)
