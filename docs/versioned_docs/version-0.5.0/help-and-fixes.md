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
- See our detailed guide: [Docker GPU Setup Troubleshooting](../troubleshooting/docker-gpu-error-could-not-select-device-driver-nvidia-container-runtime.md)

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

### General Troubleshooting Steps

When encountering issues, follow these diagnostic steps:

1. **Check Service Status**: Verify all Kamiwaza services are running
2. **Review Logs**: Check container logs for specific error messages
3. **Verify Resources**: Ensure sufficient CPU, RAM, and disk space
4. **Test Connectivity**: Verify network connectivity between components
5. **Restart Services**: Try stopping and restarting affected services
6. **Check Configuration**: Verify configuration files and environment variables

