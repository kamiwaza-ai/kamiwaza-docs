# Docker GPU Error: Could not select device driver "" with capabilities: [[gpu]]

## Platform

This advisory applies only to Linux + nVidia.

## Error

If logs show model launch errors like:

```bash
docker: Error response from daemon: could not select device driver "" with capabilities: [[gpu]].
```

It indicates that Docker cannot find or use the NVIDIA GPU runtime.


## Solution

1. **Ensure NVIDIA Container Toolkit is installed:**

   Install the NVIDIA Container Toolkit and restart Docker:

   ```bash
   sudo apt-get install -y nvidia-container-toolkit
   sudo systemctl restart docker
   ```

2. **Verify Docker runtime configuration:**

   Check if the `nvidia` runtime is correctly configured in `/etc/docker/daemon.json`. Ensure it includes:

   ```json
   {
       "runtimes": {
           "nvidia": {
               "path": "nvidia-container-runtime",
               "runtimeArgs": []
           }
       }
   }
   ```

   After editing the file, restart Docker:

   ```bash
   sudo systemctl restart docker
   ```

3. **Check NVIDIA Driver and CUDA version:**

   Confirm that your system recognizes the GPU by running:

   ```bash
   nvidia-smi
   ```

4. **Verify Docker version:**

   Ensure that Docker supports GPU usage by running:

   ```bash
   docker --version
   ```

   Update Docker if necessary.

5. **Specify the NVIDIA runtime in Docker commands:**

   When running Docker containers, ensure that the runtime is explicitly set to `nvidia`:

   ```bash
   docker run --runtime=nvidia --gpus all ...
   ```
