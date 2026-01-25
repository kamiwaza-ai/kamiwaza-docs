---
sidebar_position: 6
---

# Model Deployment Troubleshooting

This guide helps you diagnose and resolve common issues encountered during model deployment on Kamiwaza.

## Common Issues

### Deployment Failures

- **Model not found**: Ensure the model exists in your catalog or use Novice Mode to select from the curated list.
- **Checkpoint too large for VRAM**: Choose a smaller/quantized variant (e.g., AWQ, MLX, GGUF) or reduce batch size in Advanced Mode.
- **Service unavailable/port errors**: Retry deployment; if it persists, Stop/Remove and deploy again.
- **Outdated catalog**: Refresh the Models page or restart the server to re-import the model guide.

### Performance Issues

- **Slow responses**: Pick a faster model or quantized variant; reduce max tokens and context length.
- **High memory or OOM**: Lower batch size, context length, and KV cache; use a lower‑VRAM variant.
- **Cold starts**: First request may be slower while the model loads; send a short warm‑up prompt after deploy.

### Engine Selection Problems

- **Wrong engine/variant**: Switch to Advanced Mode and explicitly select the engine/variant you want.
- **Mac (MLX) quirks**: Prefer the recommended MLX variant; use the OpenAI endpoint shown in the UI.
- **Task mismatch**: Use coding‑tuned models for code, VL models for images, reasoning models for multi‑step tasks.

### Resource Constraints

- **Insufficient VRAM**: Use a smaller or more heavily quantized model.
- **Low disk space**: Remove unused model files or clear caches; then redeploy.
- **CPU‑only environments**: Choose CPU‑friendly variants (e.g., GGUF).

## Diagnostic Steps

1. Confirm the model status is DEPLOYED in the UI.
2. Open the model’s endpoint URL from the UI; send a short test prompt.
3. If failing, Stop/Remove and redeploy the model.
4. Try a smaller/quantized variant; reduce context length and batch size.
5. For persistent issues, switch to Advanced Mode and review engine/variant settings.

## Getting Help

For additional support beyond this troubleshooting guide, see the [Need Help?](../intro.md#need-help) section for community resources and support channels.

When reporting issues, please share:
- Model name, variant, and engine
- Hardware specs (GPU VRAM/CPU RAM)
- Complete error text or messages
- Steps to reproduce the problem