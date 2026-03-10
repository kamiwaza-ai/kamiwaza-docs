---
title: AWS Bedrock Model Integration
sidebar_label: AWS Bedrock
---

## Overview

Kamiwaza 0.7 adds first-class support for hosting models backed by [Amazon Bedrock](https://aws.amazon.com/bedrock/). Administrators can register a Bedrock model, deploy it through the existing model lifecycle, and expose the familiar `/v1/chat/completions` and `/v1/completions` APIs to application teams.

## Platform assumptions

- Kamiwaza 0.7 release (or newer) is installed and the control plane is reachable via HTTPS.
- The AWS account has Bedrock access enabled in `us-west-2` (or your chosen region) and provides an access key/secret with permission to invoke the target Bedrock model.
- Outbound HTTPS traffic from the Kamiwaza control plane to the AWS Bedrock endpoint is allowed.

## Register a Bedrock model

1. Navigate to **Models → Add Model**.
2. Select **AWS Bedrock** as the engine.
3. Provide the model details:
   - **Display name** – friendly name shown in the UI.
   - **Model identifier** – Bedrock model ID (for example `anthropic.claude-v2`).
   - **AWS Access Key ID** and **Secret Access Key** – scoped credentials for invoking Bedrock.
   - **AWS Region** – currently validated with `us-west-2`.
4. Save the model. It will appear in the catalog alongside local engines.

## Deploy and test

1. Open the newly created model and click **Deploy**. Kamiwaza provisions the routing entry; no containers are launched because Bedrock handles execution.
2. Use the **Test Conversation** modal or your own HTTP client to exercise the `/v1/chat/completions` endpoint. Responses stream through Kamiwaza just like local engines, and the raw Bedrock payload is preserved for troubleshooting.
3. Monitor the deployment from the usual dashboards—metrics and decision logs continue to flow through the platform observability stack.

## Operational notes

- Credentials are stored using Kamiwaza’s encrypted secret store. Rotate the AWS keys on the same cadence as other cloud credentials.
- Error handling surfaces Bedrock response codes directly in the UI and API responses. Check the Test Conversation modal’s “View raw response” panel if you need to inspect the upstream payload.
- For environments that require VPC endpoints or private connectivity, ensure the control plane network has a permitted path to Bedrock before registering the model.

## Next steps

- Pair the Bedrock deployment with the ReBAC validation checklist to ensure access controls are enforced across your hosted APIs.
- Contact Kamiwaza Support if you need regions beyond `us-west-2` or custom Bedrock foundation models enabled.
