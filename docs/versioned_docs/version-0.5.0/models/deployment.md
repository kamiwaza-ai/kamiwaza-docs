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

## Deployment lifecycle statuses

Below are the deployment and instance statuses you may see, with what they mean and what (if anything) you should do.

- REQUESTED: The deployment request was accepted and recorded.
- DEPLOYING: Kamiwaza is creating the Ray Serve app (if applicable) and preparing routing.
- INITIALIZING: Routing is up and the model server is reachable, but the model is still loading or not yet ready. Normal for a short period right after launch.
- DEPLOYED: The deployment is healthy and ready to serve traffic.
- STOPPED: The deployment was stopped (either by a user action or system shutdown).
- ERROR: A recoverable problem was detected. Often resolves after a change or retry. See error code guidance below.
- FAILED: A terminal failure was detected (e.g., out-of-memory). Requires user action to resolve.
- MUST_REDOWNLOAD: Required weights are missing locally in community installs. Re-download the model and deploy again.

Instance-level statuses (for replicas):

- REQUESTED: An instance record was created and is queued to start.
- COPYING_FILES: Required files are being synced to the node.
- STARTING: The container/process is launching and has not passed health checks yet.
- DEPLOYED (instance): The process is up and responding.

## Error codes and what to do

If a deployment shows ERROR or FAILED, the UI may show a short error code and message. Common codes:

- OOM (Out of Memory): Reduce context size, select a smaller model/variant, or lower GPU memory utilization.
- CUDA_ERROR: Check GPU drivers/availability; restart GPU services or the host if needed; ensure the container has GPU access.
- MODEL_LOADING_FAILURE: Verify that all model files exist, are accessible, and match the expected version; try re-downloading.
- CONTAINER_EXITED: The runtime process crashed. Open logs for details; check memory limits, incompatible flags, or driver issues.
- RUNTIME_ERROR: A generic runtime exception was seen in logs. Open logs for specifics.
- STARTUP_TIMEOUT: The model did not become ready within the expected time. Try a smaller model/context or adjust engine parameters.
- MUST_REDOWNLOAD: Files missing locally (community installs). Re-download the model and retry.

## Viewing logs and diagnostics

- In the advanced UI, open a deployment row and click “View logs” to see container logs and auto-detected issue patterns (OOM, CUDA errors, etc.).

## Tips for Novice mode

- If you hit OOM or STARTUP_TIMEOUT, try:
  - Selecting a smaller preset (model/variant)
  - Reducing context size (the UI will suggest balanced options)
  - Re-deploying after downloads complete

## When to retry vs. change configuration

- Retry directly if you see transient ERROR without an error code.
- Change configuration if you see a clear code like OOM, MODEL_LOADING_FAILURE, CONTAINER_EXITED, or STARTUP_TIMEOUT.

## How routing works

Kamiwaza wires the public port to Ray Serve for model traffic. Routes can be created immediately after launch; Ray Serve handles readiness internally. This is why you may see INITIALIZING briefly before DEPLOYED.