---
title: OpenAI-Compatible Transcription Endpoint Integration
sidebar_label: OpenAI-Compatible Transcribe
---

## Overview

Kamiwaza can register any external endpoint that speaks the OpenAI `/v1/audio/transcriptions` wire format and proxy it through the same deployment, audit, and access-control surfaces as other models. This covers OpenAI's Whisper, Microsoft Azure's Whisper and `gpt-4o-transcribe` deployments, and any self-hosted or third-party Whisper-compatible service.

Once registered, the endpoint exposes the standard `/runtime/models/<id>/v1/audio/transcriptions` route. Kamiwaza's Context Service uses this same route when transcribing audio uploaded by users in workrooms.

## Prerequisites

- A provider API key with permission to call the audio-transcription endpoint.
- The transcription model is enabled on the account (or, for Azure, the deployment exists in the project).
- Outbound HTTPS from the Kamiwaza control plane to the provider hostname is permitted (see [Provider examples](#provider-examples) below for hostnames).

> **OpenAI-specific:** Restricted API keys must be granted the `Audio` scope in addition to chat. Keys created with the default restricted scope set return 401 on transcription calls. Either widen the scope or create a separate key with the `Audio` permission enabled.

## Quick Start (UI)

The wizard is identical to the chat-endpoint wizard — only the models you tick on the Review step differ. See [OpenAI-Compatible Chat](./openai-compatible-chat.md#quick-start-ui) for screenshots of each step.

1. In Kamiwaza, go to **Models**, click **Add Model**, then click **Add external inference endpoint** in the dialog header.
2. **Source** — choose **OpenAI**, **Azure**, or **Other (OpenAI-compatible)** under **Where is your model hosted?**, then click **Next**.
3. **Setup** — configure the endpoint:
   - **Inference endpoint URL** — The provider's API root. Examples:
     - OpenAI: `https://api.openai.com/v1`
     - Azure OpenAI Service: `https://<your-resource>.openai.azure.com`
     - Azure AI Foundry: `https://<your-project>.services.ai.azure.com/models`
     - Self-hosted Whisper: your internal hostname
   - **Credentials** — paste the provider API key, or pick **Use existing credential** if one is already stored for this URL.

   Click **Connect**. Kamiwaza validates the URL, authenticates, and discovers the models the endpoint exposes.
4. **Review** — tick the transcription model(s) you want to register (`whisper-1`, `gpt-4o-transcribe`, an Azure deployment name, etc.). Expand a row to customize the display name or per-model defaults. Click **Register N models** when done.
5. Deploy each newly registered model from the Models list.

## Provider examples

| Provider | Source | Inference endpoint URL | Underlying model |
|----------|--------|------------------------|------------------|
| OpenAI Whisper | OpenAI | `https://api.openai.com/v1` | `whisper-1`, `gpt-4o-transcribe` |
| Azure OpenAI (Whisper, gpt-4o-transcribe) | Azure | `https://<your-resource>.openai.azure.com` | The Azure deployment name |
| Azure AI Foundry (gpt-4o-mini-transcribe) | Azure | `https://<your-project>.services.ai.azure.com/models` | The Foundry deployment name |
| Self-hosted Whisper | Other (OpenAI-compatible) | Your internal hostname | The service's published model identifier |

If you've already registered a chat endpoint against the same provider URL, Kamiwaza recognizes the existing credential and offers **Use existing credential**. For OpenAI specifically, double-check the key has the `Audio` scope before reusing.

## Credentials

Credentials registered through the form are encrypted on save and stored in the Kamiwaza secret catalog, keyed by base URL. Catalog reuse, rotation, and the five-minute propagation window are described in [External endpoints overview](./overview.md#credentials-catalog).

## API Usage

```bash
curl -X POST "https://<your-domain>/runtime/models/<deployment-id>/v1/audio/transcriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@recording.wav" \
  -F "model=whisper-1" \
  -F "response_format=json"
```

Supported request fields: `file` (the audio), `model` (the underlying model), `language` (BCP-47 code), and `response_format`. Other OpenAI Whisper fields (`prompt`, `temperature`) are not forwarded by Kamiwaza on this path. `response_format` accepts `json` (default), `text`, `verbose_json`, `srt`, and `vtt`; values outside that set are normalized to `json`.

## Operational notes

- Audio uploads are streamed through Kamiwaza to the upstream provider. Kamiwaza does not retain audio bytes after the response is returned to the caller.
- Transcription errors from the provider are surfaced through the Kamiwaza response body. The requester, workroom, and deployment ID are recorded in the Kamiwaza audit log (`make logs-audit`), regardless of upstream success or failure.
- This path is request/response only — Kamiwaza does not stream OpenAI-compatible transcription. For streaming speech-to-text, register an [AWS Transcribe](./aws-transcribe.md) endpoint instead.

## Next steps

- For the streaming and batch capabilities of AWS's managed transcription service, see [AWS Transcribe](./aws-transcribe.md).
- Register a chat endpoint against the same provider — see [OpenAI-Compatible Chat](./openai-compatible-chat.md).
- Contact Kamiwaza Support for help with non-standard providers, sovereign-cloud hostnames, or private connectivity.
