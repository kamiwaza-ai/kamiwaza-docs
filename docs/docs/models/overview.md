---
sidebar_position: 1
---

# Models Overview

Kamiwaza provides a comprehensive system for managing the entire lifecycle of your AI models, from discovery and download to deployment and serving. This guide walks you through the key concepts and processes for working with models on the Kamiwaza platform.

## Key Concepts

Kamiwaza is integrated directly with the Hugging Face Hub, allowing you to access a vast collection of open-source models. Models are identified by their Hugging Face repository ID, such as `meta-llama/Llama-3.3-70B-Instruct`.

## Choosing the Right Model

Selecting the right model and configuration is crucial for achieving optimal performance and efficiency. The Kamiwaza platform automatically selects the best serving engine for your hardware and model type, but understanding the options will help you make informed decisions.

### Model Formats and Engine Compatibility

Kamiwaza supports several model formats, each best suited for different serving engines and hardware configurations:

*   **GGUF**: These models are highly optimized for CPU inference and are the standard for the `llama.cpp` engine. They are ideal for running on consumer hardware, including laptops with Apple Silicon, and support various quantization levels to reduce memory requirements.
*   **Safetensors**: This is a safe and fast format for storing and loading tensors. On macOS with Apple Silicon, `.safetensors` models are best served by the `MLX` engine to take full advantage of the GPU. On Linux with NVIDIA, AMD and other supported GPUs or accelerators (for example, Intel Gaudi 3), they are typically served with `vLLM`.
*   **Other formats (PyTorch, etc.)**: General-purpose models are typically served using `vLLM` on servers equipped with NVIDIA or AMD GPUs.

## Model Serving Engines

Kamiwaza intelligently routes model deployment requests to the most appropriate serving engine. Here are the primary engines available in the platform:

### vLLM Engine

*   **Purpose**: Designed for high-throughput, low-latency LLM serving on powerful GPUs.
*   **Best For**: Production environments with dedicated accelerators, such as NVIDIA, Intel Gaudi HPUs, or AMD GPUs.
*   **Key Features**:
    *   **PagedAttention**: An advanced attention algorithm that dramatically reduces memory waste.
    *   **Continuous Batching**: Batches incoming requests on the fly for better GPU utilization.
    *   **Tensor Parallelism**: Distributes large models across multiple GPUs.

### llama.cpp Engine

*   **Purpose**: Optimized for efficient CPU-based inference and a popular choice for running models on consumer hardware.
*   **Best For**:
    *   Running models on machines without a dedicated high-end GPU.
    *   Local development on both Intel-based and Apple Silicon Macs.
*   **Key Features**:
    *   **GGUF Format**: Uses GGUF format which supports various levels of quantization for memory efficiency.
    *   **Cross-Platform**: Runs on Linux, macOS, and Windows.
    *   **Metal Acceleration**: On macOS, uses the Apple Silicon GPU for acceleration.

### MLX Engine

*   **Purpose**: Specifically built to take full advantage of Apple Silicon (M series) chips.
*   **Best For**: High-performance inference on modern Mac computers.
*   **Key Features**:
    *   **Unified Memory**: Leverages the unified memory architecture of Apple Silicon for efficient data handling.
    *   **Native Process**: Runs as a native macOS process, not in a container, for direct hardware access.
    - **Vision-Language Models**: Supports multi-modal models.

### Ampere llama.cpp Engine

*   **Purpose**: A specialized variant of `llama.cpp` optimized for Ampere arm-based CPU architectures.
*   **Best For**: Running GGUF models on Ampere CPUs, such as the AmpereOne M servers.

## External Endpoints

In addition to running models locally, Kamiwaza can register external inference endpoints — either cloud-hosted services or customer-operated proxies — and expose them through the same deployment, audit, and access-control surfaces as local models.

Supported integrations:

- [**AWS Bedrock**](./bedrock.md) — Anthropic Claude, Meta Llama, Amazon Nova, and other Bedrock-hosted families.
- [**AWS Transcribe**](./aws-transcribe.md) — managed batch and streaming speech-to-text.
- [**OpenAI-compatible chat**](./openai-compatible-chat.md) — OpenAI directly, Azure OpenAI Service, Azure AI Foundry, customer-hosted LiteLLM proxies, and any other provider whose chat API matches the OpenAI shape.
- [**OpenAI-compatible transcription**](./openai-compatible-transcribe.md) — OpenAI Whisper, Azure Whisper / gpt-4o-transcribe, and any other provider whose transcription API matches the OpenAI shape.

Registration is an admin action: credentials come from the operator and are stored in the encrypted Kamiwaza secret catalog. Once deployed, an external endpoint is invoked the same way as any local deployment.

### Registration flow

Every external endpoint is registered through the same wizard, regardless of provider:

1. From the **Models** page, click **Add Model** and choose **Add External Inference Endpoint**.
2. **Source** — pick where the model is hosted (AWS, Azure, OpenAI, or Other / OpenAI-compatible). Click **Next**.
3. **Setup** — fill in the provider-specific form (region, base URL, model identifier, credentials). The exact fields depend on the provider; see the per-provider page for details.
4. For OpenAI / Azure / Other providers, click **Connect** to validate the endpoint and discover available models, then **Review** and save.
5. For AWS providers, click **Save Endpoint** directly.
6. Deploy the new model from the Models list. Once deployed, applications call it through the standard Kamiwaza runtime route.

### Network egress

The Kamiwaza control plane must be able to reach the provider's API over HTTPS. Common hostnames:

| Provider | Hostname pattern |
|----------|------------------|
| AWS Bedrock | `bedrock-runtime.<region>.amazonaws.com` |
| AWS Transcribe | `transcribe.<region>.amazonaws.com`, plus the configured S3 bucket |
| OpenAI direct | `api.openai.com` |
| Azure OpenAI Service | `<your-resource>.openai.azure.com` |
| Azure AI Foundry | `<your-resource>.services.ai.azure.com` |
| Self-hosted / customer-operated | Whatever URL you publish (vLLM, Ollama, LiteLLM proxy, etc.) |

Cloud providers that operate in regions outside the standard commercial cloud (sovereign or industry-specific clouds) typically use a different hostname suffix; consult your provider's documentation for the exact host and check with your network team that egress is permitted before registering.

For environments that require private connectivity (VPC endpoints, private link, mesh-internal proxies), point the Base URL or AWS endpoint override at the private hostname. Kamiwaza does not enforce network reachability — ensure your control-plane network has a permitted path before registering.

### Credentials catalog

Every credential you paste into the registration form is encrypted on save and stored in the Kamiwaza secret catalog under a deterministic key derived from the provider and target (for example, AWS region for Bedrock and Transcribe, base URL for OpenAI-compatible).

If you register a second endpoint that targets the same provider and key (for example, a second Bedrock model in the same AWS region, or a second OpenAI-compatible model on the same base URL), Kamiwaza recognizes that a credential is already stored and offers two choices:

- **Use existing credential** — pick this when the new model is on the same provider account. No new credential entry is created.
- **Use a different credential** — pick this to overwrite the stored value. The replacement propagates to every endpoint sharing that credential within the engine credential cache window (roughly five minutes), without restarting any deployment.

You can also rotate the credential later from any model's **Edit** form. Rotation propagates the same way.

> **Avoid temporary credentials.** Use long-lived IAM credentials or provider-issued API keys for production deployments. Temporary or session credentials expire while a deployment is running and lead to silent authentication failures partway through use.

When a model is deleted, Kamiwaza cleans up secrets that the model owned and that no other model still references. Shared credentials are kept until the last referencing model is removed.

### Audit logging

Every inference call through an external endpoint records the requester, workroom, and deployment ID in the Kamiwaza audit log (`make logs-audit`), regardless of upstream success or failure. Registration, credential rotation, and deletion are recorded as state-change audit entries.