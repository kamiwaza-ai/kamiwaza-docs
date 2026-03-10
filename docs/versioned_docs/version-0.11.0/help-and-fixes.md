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

- **Environment Details**: OS version, Podman version, Kubernetes version, hardware specs
- **Error Messages**: Complete error text and stack traces
- **Steps to Reproduce**: Detailed steps that led to the issue
- **Logs**: Relevant log files and Kubernetes pod output
- **Configuration**: Any custom configuration or settings

This information helps us provide faster and more accurate solutions to your problems.

## Common Issues and Fixes

### Installation Issues

#### GPU Not Detected
**Problem**: NVIDIA GPU not available to model serving pods.

**Solution**:
- Ensure NVIDIA drivers are properly installed (`nvidia-smi`)
- Install NVIDIA Container Toolkit
- Verify GPU labeling: `kubectl get nodes --show-labels | grep gpu`

#### Port 443 Already in Use
**Problem**: Traefik fails to bind because port 443 is occupied.

**Solution**:
- Check what's running on port 443: `sudo lsof -i :443`
- Stop conflicting services (e.g., httpd, nginx)

#### Insufficient System Resources
**Problem**: Installation fails or pods are stuck in `Pending` state due to low resources.

**Solution**:
- Ensure at least 64GB RAM available (128GB+ recommended)
- Check pod status: `kubectl describe pod <pod-name> -n kamiwaza`
- Review resource requests: `kubectl get pods -n kamiwaza -o wide`

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
3. Create the HuggingFace token secret:
   ```bash
   export HF_TOKEN="hf_your_token_here"

   kubectl create secret generic huggingface-token \
     -n kamiwaza \
     --from-literal=token="${HF_TOKEN}"
   ```
4. Restart the scheduler and Ray head to pick it up:
   ```bash
   kubectl rollout restart deployment/core-scheduler -n kamiwaza
   kubectl delete pod -n kamiwaza -l ray.io/node-type=head
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

**Solution**: Force a cache refresh by syncing remote templates:

```bash
# Step 1: Get an auth token
export DOMAIN="YOUR_DOMAIN_HERE"
export ADMIN_PASSWORD="replace-me"

TOKEN=$(curl -sk -X POST "https://${DOMAIN}/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=${ADMIN_PASSWORD}" \
  | jq -r '.access_token')

# Step 2: Force a cache refresh
curl -sk -X POST "https://${DOMAIN}/api/v1/apps/{app_id}/refresh" \
  -H "Authorization: Bearer ${TOKEN}"
```

### General Troubleshooting Steps

When encountering issues, follow these diagnostic steps:

1. **Check Pod Status**: `kubectl get pods -n kamiwaza`
2. **Review Logs**: `kubectl logs <pod-name> -n kamiwaza`
3. **Describe Pod**: `kubectl describe pod <pod-name> -n kamiwaza` for events and conditions
4. **Verify Resources**: `free -h` and `df -h /` for system resources
5. **Restart a Service**: `kubectl rollout restart deployment/<name> -n kamiwaza`
6. **Check Installation Log**: `cat /var/log/kamiwaza_install_prod.log`
7. **Check Configuration**: Review `/opt/kamiwaza/cluster/values/overrides.yaml`
