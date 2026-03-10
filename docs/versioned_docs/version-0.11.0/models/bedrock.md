---
title: AWS Bedrock Model Integration
sidebar_label: AWS Bedrock
---

## Overview

Kamiwaza can proxy [Amazon Bedrock](https://aws.amazon.com/bedrock/) models through the same OpenAI-compatible APIs used by locally hosted models. Administrators register Bedrock as an external endpoint, deploy it through the normal model lifecycle, and expose familiar `/v1/models` and `/v1/chat/completions` routes to application teams.

The Bedrock integration currently supports:

- Meta Llama 3 instruct models
- Amazon Nova models, including streaming chat responses and image inputs
- Anthropic Claude models through the Bedrock Messages API

## Prerequisites

Before registering a Bedrock endpoint, make sure:

- Kamiwaza is reachable via HTTPS.
- Your AWS account has Bedrock access enabled in the region you plan to use.
- The target model ID or inference profile is enabled in that AWS account.
- Outbound HTTPS traffic from the Kamiwaza control plane to the Bedrock runtime endpoint is allowed.
- You have either AWS credentials or a Bedrock credential secret that can invoke the target model.

## Quick Start (UI)

1. In Kamiwaza, go to **Models** and click **Add external inference endpoint**.
2. Select **AWS Bedrock** from the Service dropdown.
3. Enter the endpoint details:
   - **Display Name**: Friendly name shown in the UI
   - **Model ID or Inference Profile ID / ARN**: A Bedrock model ID such as `meta.llama3-70b-instruct-v1:0` or `amazon.nova-premier-v1:0`, or an inference profile ARN such as `arn:aws:bedrock:us-east-1:############:inference-profile/us.amazon.nova-premier-v1:0`
   - **AWS Region**: The region where the Bedrock model or profile is available
   - **Endpoint URL (optional)**: Override the Bedrock runtime URL if needed
   - **Inference Profile ARN (optional)**: Optional if the model ID field already contains the ARN
   - **Credential Secret or URN**: A secret URN or inline credential payload
   - **Extra Body JSON**: Optional model-native default parameters; the UI defaults to `{}`
4. Click **Save Endpoint**.
5. Deploy the new model from the Models list.

## Credentials

The **Credential Secret or URN** field supports:

1. A Kamiwaza secret URN (recommended), such as `urn:li:secret:bedrock-creds`
2. Inline JSON credentials, which Kamiwaza will store securely on save
3. A raw bearer token or Bedrock API key if your Bedrock setup uses token-based authentication

For standard AWS credentials, the secret value should look like:

```json
{
  "aws_access_key_id": "AKIA...",
  "aws_secret_access_key": "...",
  "aws_session_token": "..."
}
```

## Request Shaping and `extra_body`

The **Extra Body JSON** field is optional. In most cases, leave it as `{}` and send request controls such as `max_tokens`, `temperature`, and `top_p` at call time.

When `extra_body` is set:

- Kamiwaza merges it into every Bedrock request as a set of defaults.
- Per-request OpenAI-style fields win over values from `extra_body`.
- For Amazon Nova models, those overrides are applied inside Nova's nested `inferenceConfig`.
- For Claude models, Kamiwaza automatically adds the required `anthropic_version` value and a default `max_tokens` if you omit them.

## Model Family Behavior

Kamiwaza keeps the public API shape consistent across supported Bedrock model families:

| Model family | Bedrock request shape | Notes |
|--------------|-----------------------|-------|
| Llama 3      | Meta prompt template | OpenAI-style chat messages are translated into the prompt format Bedrock expects. |
| Nova         | Nova `messages-v1` schema | Buffered and streamed responses are normalized back into OpenAI-compatible chat completion payloads. Nova image inputs are accepted through OpenAI-style content blocks and converted into Nova-native image blocks. |
| Claude       | Anthropic Messages API | OpenAI-style chat messages are translated into Claude's Messages format, with automatic `anthropic_version` injection and a default `max_tokens` when omitted. |

## Multimodal Input

For Claude and Nova deployments, you can send OpenAI-style multimodal chat payloads to the normal `/v1/chat/completions` route. Nova image inputs currently work with inline `data:` URLs and native Nova image blocks; arbitrary external image URLs are not fetched by Kamiwaza for Nova requests.

Example request body:

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,<base64-image-bytes>"
          }
        },
        {
          "type": "text",
          "text": "What is shown in this image?"
        }
      ]
    }
  ],
  "max_tokens": 128,
  "temperature": 0
}
```

For Nova, Kamiwaza automatically reshapes that payload into the Bedrock `messages-v1` schema and places media before the text prompt inside the user turn, which matches Nova's expected ordering.

## Operational notes

- Credentials are stored using Kamiwaza’s encrypted secret store. Rotate the AWS keys on the same cadence as other cloud credentials.
- Region can be supplied explicitly or inferred from a Bedrock runtime endpoint URL or inference profile ARN.
- Error handling surfaces Bedrock response codes directly in the UI and API responses.
- For environments that require VPC endpoints or private connectivity, ensure the control plane network has a permitted path to Bedrock before registering the model.

## Next steps

- Pair the Bedrock deployment with the ReBAC validation checklist to ensure access controls are enforced across your hosted APIs.
- Contact Kamiwaza Support if you need help enabling specific Bedrock models, inference profiles, or private network connectivity.
