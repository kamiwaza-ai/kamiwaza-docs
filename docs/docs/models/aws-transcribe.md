---
title: AWS Transcribe Engine User Guide
sidebar_label: AWS Transcribe
---

[AWS Transcribe](https://aws.amazon.com/transcribe/) provides enterprise-grade, managed speech-to-text capabilities through Kamiwaza's unified transcription API. Audio is processed by AWS's cloud service, eliminating local compute requirements.

## Prerequisites

Before registering an AWS Transcribe endpoint, make sure:

- Your AWS account has Transcribe enabled in the region you plan to use.
- You have an S3 bucket that Kamiwaza can write to for batch transcription (audio is staged there briefly during processing).
- You have a long-lived IAM access key whose attached policy grants the permissions below.
- Outbound HTTPS from the Kamiwaza control plane to `transcribe.<region>.amazonaws.com` and your S3 bucket is permitted. See [External endpoints overview](./overview.md#network-egress) for the full hostname matrix.

Minimum IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:DeleteTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/transcribe-jobs/*"
    }
  ]
}
```

## Quick Start (UI)

1. In Kamiwaza, go to **Models** and click **Add Model** → **Add External Inference Endpoint**.
2. On the **Source** step, choose **AWS Transcribe** under **Where is your model hosted?** and click **Next**.
3. On the **Setup** step, fill in the form:
   - **Display Name** — Friendly name shown in the Kamiwaza UI.
   - **Description** *(optional)* — Free-form note for other operators.
   - **AWS Region** — The region where audio will be processed (for example `us-east-1`). Required.
   - **S3 Bucket** — The bucket Kamiwaza will use to stage batch audio. Required.
   - **IAM Access Key** — Paste the **Access Key ID** and **Secret Access Key**.
   - **Show advanced options** *(optional)* — Reveals language defaults, sample rate, speaker labels, custom vocabulary, and PII redaction; covered under [Optional configuration](#optional-configuration).
4. Click **Save Endpoint**.
5. Deploy the model from the Models list.

> Use long-lived IAM credentials. Temporary or session credentials expire while a deployment is running and lead to silent authentication failures.

## Credentials

Credentials registered through the form are encrypted on save and stored in the Kamiwaza secret catalog, keyed by AWS region. Catalog reuse across endpoints in the same region, rotation through the **Edit** form, and the five-minute propagation window are described in [External endpoints overview](./overview.md#credentials-catalog).

The stored secret is JSON containing your long-lived AWS keys:

```json
{
  "aws_access_key_id": "AKIA...",
  "aws_secret_access_key": "..."
}
```

If you've already registered an AWS Bedrock endpoint in the same region, Kamiwaza recognizes the existing credential and offers **Use existing credential** during registration.

## Optional configuration

Click **Show advanced options** on the Setup step to expose transcription defaults. Each field has a sensible default; override only what you need.

| Field | Default | Description |
|-------|---------|-------------|
| Language | Auto-detect (batch only) | BCP-47 code (`en-US`, `es-ES`, `fr-FR`, etc.). Streaming requires an explicit code. |
| Media format | `auto` | `auto`, `mp3`, `mp4`, `wav`, `flac`, `ogg`, `amr`, `webm`. `auto` detects from filename. |
| Sample rate | `16000` | Sample rate in Hz. |
| Show speaker labels | off | Enable speaker identification (diarize). |
| Max speaker labels | `2` | Maximum speakers (1–10). |
| Vocabulary name | — | Custom vocabulary for domain terms (must be created in AWS first). |
| Redact PII | off | Strip PII from transcript output. |
| PII entity types | `[]` | PII categories to redact: `PERSON`, `EMAIL`, `PHONE_NUMBER`, etc. |

Per-request overrides — `language`, `response_format`, and `stream` — can be passed at call time and take precedence over the registered defaults.

## API Usage

### Transcribe Audio (Batch)

```bash
curl -X POST "https://<your-domain>/runtime/models/<deployment-id>/v1/audio/transcriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@recording.wav" \
  -F "response_format=json"
```

### Transcribe Audio (Streaming)

```bash
curl -X POST "https://<your-domain>/runtime/models/<deployment-id>/v1/audio/transcriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@recording.pcm" \
  -F "stream=true" \
  -F "language=en-US"
```

Streaming returns Server-Sent Events (SSE) with partial results.

> **Note:** Streaming only supports `pcm`, `ogg`, and `flac` formats. The format is auto-detected from the file extension. If no language is specified, streaming defaults to `en-US`.

### Request Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `file` | Yes | Audio file (multipart form-data) |
| `response_format` | No | `text`, `json` (default), or `verbose_json` |
| `language` | No | Override configured language |
| `stream` | No | `true` for streaming mode |

## Response Formats

### `json` (default)
```json
{
  "text": "Hello, how are you today?"
}
```

### `text`
```
Hello, how are you today?
```

### `verbose_json`
```json
{
  "task": "transcribe",
  "language": "en",
  "duration": 3.45,
  "text": "Hello, how are you today?",
  "segments": [
    { "id": 0, "start": 0.0, "end": 1.2, "text": "Hello," },
    { "id": 1, "start": 1.3, "end": 3.4, "text": "how are you today?" }
  ]
}
```

## Batch vs Streaming

| Feature | Batch | Streaming |
|---------|-------|-----------|
| Audio formats | mp3, mp4, wav, flac, ogg, amr, webm | pcm, ogg, flac |
| Max duration | 4 hours | 5 minutes (300s) |
| Auto language detection | Yes | No (defaults to en-US) |
| Speaker labels | Yes | No |
| Custom vocabulary | Yes | Yes |
| PII redaction | Yes | No |
| Latency | Higher (job-based) | Real-time |
| Use case | Recorded audio | Live audio |

## Supported Languages

AWS Transcribe supports 100+ languages for batch and 30+ for streaming.

### Auto-Detect (Batch Only)

Set the **Language** field on the Setup form to **Auto-detect** to let AWS identify the spoken language automatically. This applies to batch mode only.

> **Note:** Automatic language detection is only supported for **batch mode**. Streaming transcription requires an explicit language code and defaults to `en-US` if none is supplied. To use a different language for streaming, pass the `language` parameter in your request.

### Common Language Codes

| Code | Language |
|------|----------|
| `auto` | Auto-detect |
| `en-US` | English (US) |
| `en-GB` | English (UK) |
| `es-ES` | Spanish (Spain) |
| `es-US` | Spanish (US) |
| `fr-FR` | French |
| `de-DE` | German |
| `ja-JP` | Japanese |
| `zh-CN` | Chinese (Simplified) |
| `pt-BR` | Portuguese (Brazil) |
| `ko-KR` | Korean |

## Cost Considerations

Check [AWS pricing](https://aws.amazon.com/transcribe/pricing/) for current rates.

## Troubleshooting

### "Unsupported media format"
Batch supports: `mp3`, `mp4`, `wav`, `flac`, `ogg`, `amr`, `webm`, `pcm`.
Streaming supports: `pcm`, `ogg`, `flac` only.

### "S3 access denied"
Verify the IAM policy attached to the registered access key includes `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the configured S3 bucket.

### "Region mismatch" or 401 / signature errors
Confirm the **AWS Region** on the registered endpoint matches the region your IAM key is scoped to and the region your S3 bucket lives in.

### Streaming timeout
- Audio chunks must arrive within 30 seconds.
- Total stream duration is limited to 5 minutes (AWS-side limit).
- Ensure audio data is sent promptly from the client.

### Job timeout
Batch jobs time out after 15 minutes by default. For longer audio, raise the timeout via the **Show advanced options** controls on the registration form.
