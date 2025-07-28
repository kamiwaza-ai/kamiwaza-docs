---
sidebar_position: 3
---

# Model Deployment

The model deployment process in Kamiwaza is designed to be simple and robust.

1.  **Initiate Deployment**: When you request to deploy a model, Kamiwaza's `Models Service` takes over.
2.  **Engine Selection**: The platform automatically determines the best engine based on your hardware, operating system, and the model's file format. For example, on a Mac with an M2 chip, a `.gguf` file will be deployed with `llama.cpp`, while `.safetensors` will use `MLX`. You can also override this and specify an engine manually.
3.  **Resource Allocation**: The system allocates a network port and configures the load balancer (Traefik) to route requests to the new model endpoint.
4.  **Launch**: The selected engine is started. For `vLLM` on Linux, this is a Docker container. For `MLX` on macOS, it's a native process.
5.  **Health Check**: Kamiwaza monitors the model until it is healthy and ready to serve traffic.

Once deployed, your model is available via a standard API endpoint.