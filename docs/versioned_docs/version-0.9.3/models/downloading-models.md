---
sidebar_position: 2
---

# Downloading Models

## Model Search and Discovery

Kamiwaza is integrated directly with the Hugging Face Hub, allowing you to access a vast collection of open-source models. Models are identified by their Hugging Face repository ID, such as `meta-llama/Llama-3.3-70B-Instruct`.

### Downloading Models

When you select a model to deploy, Kamiwaza handles the download process for you:

1.  **Find the Model**: The system first checks if the model already exists locally. If not, it searches the Hugging Face Hub for the specified repository ID.
2.  **File Selection**: For repositories containing multiple file types, you will want to select the most appropriate files for your hardware. For example, when running on hardware without a GPU, you can select and download specific GGUF files (`q6_k`, `q5_k_m`, etc.) for optimal performance with the `llama.cpp` engine. On a Linux server with GPUs, you may opt to download the standard model files (like `.safetensors`) for use with the `vLLM` engine.
3.  **Local Caching**: All downloaded model files are stored in a local cache directory on the platform. This means that subsequent requests for the same model will not require a new download, making deployments faster.

Once a model's files are downloaded and verified, they are registered within Kamiwaza and become available for deployment.