---
id: help-and-fixes
sidebar_position: 10
---

# Help & Fixes

This page provides resources for getting help with Kamiwaza and solutions to common issues you might encounter.

## Getting Help

If you have questions or run into issues, we're here to help:

- Join our [Discord community](https://discord.gg/cVGBS5rD2U)
- Visit our [website](https://www.kamiwaza.ai/)
- Visit our [repo](https://github.com/kamiwaza-ai)
- Try our [client SDK](https://github.com/kamiwaza-ai/kamiwaza-sdk)
- Contact our [support team](https://portal.kamiwaza.ai/_hcms/mem/login?redirect_url=https%3A%2F%2Fportal.kamiwaza.ai%2Ftickets-view)

We're committed to making your experience with Kamiwaza as smooth as possible.

## Reporting Issues

When reporting issues to our support team or community, please include:

- **Environment Details**: OS version, Docker version, hardware specs (`bash startup/kamiwazad.sh doctor` or `kamiwaza doctor` for .deb installs is helpful)
- **Error Messages**: Complete error text and stack traces
- **Steps to Reproduce**: Detailed steps that led to the issue
- **Logs**: Relevant log files and container output
- **Configuration**: Any custom configuration or settings

This information helps us provide faster and more accurate solutions to your problems.

## Common Issues and Fixes

### Installation Issues

#### Docker GPU Error: Could Not Select Device Driver
**Problem**: NVIDIA Container Runtime not found or misconfigured.

**Solution**: 
- Ensure NVIDIA drivers are properly installed
- Install NVIDIA Container Toolkit
- Verify Docker can access GPU devices

#### Port Already in Use
**Problem**: Kamiwaza fails to start because required ports are occupied.

**Solution**:
- Check what's running on ports 3000, 8000, 5432, 19530, 9090
- Stop conflicting services or change Kamiwaza's port configuration
- Use `lsof -i :PORT_NUMBER` to identify processes using specific ports

#### Insufficient System Resources
**Problem**: Installation fails due to low disk space, RAM, or CPU cores.

**Solution**:
- Ensure at least 16GB RAM available
- Verify CPU supports required virtualization features

### Model Deployment Issues

#### Gated Model Downloads and Rate Limits
**Problem**: Downloads fail for gated models (Llama, Mistral, etc.) or you encounter Hugging Face rate limit errors.

**Symptoms**:
- "Access denied" or "401 Unauthorized" when downloading certain models
- "Rate limit exceeded" errors during model downloads
- Gated models appear in search but fail to download

**Solution**: Add your Hugging Face token to the Kamiwaza environment:

1. Get a Hugging Face token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (a **read** token is sufficient)
2. For gated models, accept the license terms on the model's Hugging Face page
3. Add the token to your Kamiwaza environment:
   ```bash
   # Edit the environment file
   sudo vim /opt/kamiwaza/kamiwaza/env.sh

   # Add this line:
   export HF_TOKEN="hf_your_token_here"
   ```
4. Restart Kamiwaza:
   ```bash
   kamiwaza restart
   ```

#### Model Deployment Failures
**Problem**: Models fail to deploy or become unavailable.

**Solutions**:
- **Model not found**: Ensure the model exists in your catalog or use Novice Mode
- **Checkpoint too large for VRAM**: Choose a smaller/quantized variant (AWQ, MLX, GGUF) or reduce batch size
- **Service unavailable/port errors**: Stop/Remove and redeploy the model
- **Outdated catalog**: Refresh the Models page or restart the server

#### Performance Problems
**Problem**: Slow responses or high resource usage.

**Solutions**:
- **Slow responses**: Use faster models or quantized variants; reduce max tokens and context length
- **High memory/OOM**: Lower batch size, context length, and KV cache; use lower-VRAM variants
- **Cold starts**: First request may be slower; send a short warm-up prompt after deploy

### SDK and API Issues

#### Module Import Error
**Problem**: `ModuleNotFoundError: No module named 'kamiwaza_client'` when using notebooks and Kamiwaza SDK.

**Solution**:
```bash
!pip uninstall -y kamiwaza
!pip install kamiwaza
```

### App Garden Issues

#### App Not Showing Latest Version
**Problem**: An app in App Garden isn't displaying the latest content or updates due to cache TTL.

**Solution**: Force a cache refresh using the API:

```bash
# Using curl (replace with your Kamiwaza URL and app ID)
curl -X POST "https://your-kamiwaza-instance/api/v1/apps/{app_id}/refresh" \
  -H "Authorization: Bearer $KAMIWAZA_API_KEY"
```

Or using the Python SDK:
```python
from kamiwaza_client import KamiwazaClient

client = KamiwazaClient(base_url="https://your-kamiwaza-instance/api/")
client.apps.refresh_app(app_id="your-app-id")
```

### General Troubleshooting Steps

When encountering issues, follow these diagnostic steps:

1. **Check Service Status**: Verify all Kamiwaza services are running
2. **Review Logs**: Check container logs for specific error messages
3. **Verify Resources**: Ensure sufficient CPU, RAM, and disk space
4. **Test Connectivity**: Verify network connectivity between components
5. **Restart Services**: Try stopping and restarting affected services
6. **Check Configuration**: Verify configuration files and environment variables

