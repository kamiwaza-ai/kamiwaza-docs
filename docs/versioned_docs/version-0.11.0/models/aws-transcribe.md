---
title: AWS Transcribe Engine User Guide
sidebar_label: AWS Transcribe
---

[AWS Transcribe](https://aws.amazon.com/transcribe/) provides enterprise-grade, managed speech-to-text capabilities through Kamiwaza's unified transcription API. Audio is processed by AWS's cloud service, eliminating local compute requirements.

## Quick Start (UI)

1. In Kamiwaza, go to **Models** and click **Add external endpoint**
2. Select **AWS Transcribe** from the Service dropdown
3. Enter your configuration:
   - **Display Name**: A name for this transcription endpoint
   - **Language**: Select a language or use "Auto-detect" (default)
   - **AWS Region**: Region where audio will be processed
   - **S3 Bucket**: Bucket for temporary audio storage
   - **Credential Secret**: AWS credentials (URN or JSON)
4. Click **Save Endpoint**
5. Deploy the model from the Models list

## Prerequisites

1. **AWS Account** with Transcribe access enabled
2. **S3 Bucket** for batch transcription (audio is temporarily stored during processing)
3. **IAM Credentials** with the following permissions:

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

## Configuration

Create a model with `external_endpoint` configuration:

```json
{
  "name": "aws-transcribe",
  "capability": "audio_transcription",
  "config": {
    "external_endpoint": {
      "service": "aws_transcribe",
      "region": "us-east-1",
      "language_code": "en-US",
      "s3_bucket": "your-bucket-name",
      "credential_secret_urn": "urn:li:secret:aws-transcribe-creds"
    }
  }
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `region` | AWS region (e.g., `us-east-1`) |
| `language_code` | BCP-47 code (e.g., `en-US`, `es-ES`, `fr-FR`) |
| `s3_bucket` | S3 bucket for batch audio storage |

### Optional Fields

| Field | Default | Description |
|-------|---------|-------------|
| `media_format` | `auto` | Audio format: auto, mp3, mp4, wav, flac, ogg, amr, webm. "auto" detects from filename. |
| `sample_rate` | `16000` | Sample rate in Hz |
| `show_speaker_labels` | `false` | Enable speaker identification (diarize) |
| `max_speaker_labels` | `2` | Maximum speakers (1-10) |
| `vocabulary_name` | - | Custom vocabulary for domain terms |
| `redact_pii` | `false` | Remove PII from transcript |
| `pii_entity_types` | `[]` | PII types to redact: `PERSON`, `EMAIL`, `PHONE_NUMBER`, etc. |

### Credentials

Provide AWS credentials via one of:

1. **Kamiwaza Secret Catalog** (recommended):

   First, store your AWS credentials in Kamiwaza's secret catalog, then reference by URN:
   ```json
   { "credential_secret_urn": "urn:li:secret:aws-transcribe-creds" }
   ```

   The secret value should be JSON containing AWS credentials:
   ```json
   {
     "aws_access_key_id": "AKIA...",
     "aws_secret_access_key": "...",
     "aws_session_token": "..."  // optional, for temporary credentials
   }
   ```

2. **Inline credentials** (for testing):

   Paste the raw JSON directly in the Credential Secret field:
   ```json
   {"aws_access_key_id":"AKIA...","aws_secret_access_key":"...","aws_session_token":"..."}
   ```

3. **Environment variables** (on the Kamiwaza server):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (optional)


## Deployment

Deploy the model using engine name `aws_transcribe`:

```bash
# Via API
curl -X POST https://localhost/api/v1/serving/deploy_model \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model_id": "<model-uuid>", "engine_name": "aws_transcribe"}'
```

## API Usage

### Transcribe Audio (Batch)

```bash
curl -X POST "https://localhost/runtime/models/<deployment-id>/v1/audio/transcriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@recording.wav" \
  -F "response_format=json"
```

### Transcribe Audio (Streaming)

```bash
curl -X POST "https://localhost/runtime/models/<deployment-id>/v1/audio/transcriptions" \
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

Set `language_code` to `auto` (or leave empty) to enable automatic language identification. AWS Transcribe will detect the spoken language automatically.

```json
{
  "language_code": "auto"
}
```

> **Note:** Automatic language detection is only supported for **batch mode**. Streaming transcription requires an explicit language code and will default to `en-US` if not specified. To use a different language for streaming, pass the `language` parameter in your request.

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

### "Missing external_endpoint configuration"
Ensure the model config includes `external_endpoint` with `region` and `language_code`.

### "Unsupported media format"
Batch supports: mp3, mp4, wav, flac, ogg, amr, webm, pcm.
Streaming supports: pcm, ogg, flac only.

### "S3 access denied"
Verify IAM permissions include `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` for your bucket.

### Streaming timeout
- Chunks must arrive within 30 seconds
- Total stream duration limited to 5 minutes
- Ensure audio data is sent promptly

### Job timeout
Batch jobs timeout after 15 minutes by default. For longer audio, configure `job_timeout_seconds` in `external_endpoint`.
