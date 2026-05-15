---
title: Two-Node Deployment (Remote GPU)
sidebar_label: Two-Node Deployment
---

# Two-Node Deployment (Remote GPU)

Kamiwaza supports a two-node topology where the control plane and model serving span two hosts using tensor parallelism. This enables larger models and higher throughput by pooling GPU resources across nodes.

This configuration is tested on NVIDIA DGX Spark pairs and AMD Strix Halo systems.

## How it works

- Both nodes run vLLM inside Docker containers, coordinated by Ray for distributed tensor parallelism.
- The control plane (head node) launches containers on both the local and remote node over SSH.
- Model files are synchronized to the remote host using `rsync` at deployment time.
- GPU inventory is collected from both nodes and used for scheduling.

## Requirements

- Two nodes with network connectivity (ideally a dedicated high-speed link)
- Kamiwaza installed on the **head node only** — the worker node does not need Kamiwaza installed
- SSH key-based access from the head node to the worker node
- Docker installed on both nodes
- Matching model storage paths on both nodes (`/opt/kamiwaza/models`)
- The `kamiwaza` system user on the head node must be able to read the SSH private key

## Configuration

After installing Kamiwaza on the head node, add the following environment variables to `env.sh` and restart services.

### Core Two-Node Variables

| Variable | Description | Example |
| --- | --- | --- |
| `KAMIWAZA_PAIRED_NODE` | Hostname or IP of the worker node | `10.77.0.5` |
| `KAMIWAZA_PAIRED_USER` | SSH username on the worker node | `jxstanford` |
| `KAMIWAZA_PAIRED_KEY` | SSH private key path (must be readable by `kamiwaza` user) | `/opt/kamiwaza/kamiwaza/runtime/ssh/id_ed25519_shared` |
| `KAMIWAZA_PAIRED_STRICT_KNOWN_HOSTS` | Enforce SSH host key checking | `true` or `false` |
| `KAMIWAZA_TWO_NODE_MODE` | Enable two-node deployment mode | `true` |

### vLLM Ray Cluster Variables

These control the Ray cluster that vLLM uses for distributed tensor parallelism across nodes.

| Variable | Description | Example |
| --- | --- | --- |
| `KAMIWAZA_VLLM_RAY_INTERNAL_PORT_BASE` | Base port for Ray internal services (avoid conflicts with system dashboards) | `15000` |
| `KAMIWAZA_VLLM_RAY_MIN_WORKER_PORT` | Minimum port for Ray worker communication | `5000` |
| `KAMIWAZA_VLLM_RAY_MAX_WORKER_PORT` | Maximum port for Ray worker communication | `5199` |
| `KAMIWAZA_SPARK_NCCL_SOCKET_IFNAME` | Network interface for NCCL/Gloo cross-node communication | `enp1s0f0np0` |

:::tip Finding the correct network interface
Run `ip addr show` on both nodes and identify the interface carrying the direct-link subnet (e.g., `10.77.0.x`). The interface name must match exactly — common DGX Spark names include `enp1s0f0np0` and `enP2p1s0f0np0` (note the capitalization). Use the lowercase variant for the direct link.
:::

### SSH Key Setup

The `kamiwaza` system user runs the deployment process. The SSH key must be readable by this user:

```bash
sudo mkdir -p /opt/kamiwaza/kamiwaza/runtime/ssh
sudo cp ~/.ssh/id_ed25519_shared /opt/kamiwaza/kamiwaza/runtime/ssh/id_ed25519_shared
sudo chown kamiwaza:kamiwaza /opt/kamiwaza/kamiwaza/runtime/ssh/id_ed25519_shared
sudo chmod 600 /opt/kamiwaza/kamiwaza/runtime/ssh/id_ed25519_shared
```

### Model Storage on the Worker Node

Both nodes must have the model storage directory at the same absolute path. On the **worker node**, manually create the directory and set ownership to match `KAMIWAZA_PAIRED_USER` — this is the SSH user that rsync runs as:

```bash
# On the worker node (e.g., spark-2):
sudo mkdir -p /opt/kamiwaza/models
sudo chown jxstanford:jxstanford /opt/kamiwaza/models
```

Replace `jxstanford` with the value of `KAMIWAZA_PAIRED_USER` in your `env.sh`.

:::warning
If this directory does not exist or is not writable by the paired user, model sync will fail at deployment time with a "Permission denied" error. The head node syncs model files via `rsync` over SSH as the paired user, so the directory must be owned by that user.
:::

## DGX Spark Example

The following `env.sh` snippet shows a complete two-node configuration for a DGX Spark pair (spark-1 as head, spark-2 as worker) connected via a 10.77.0.x direct link:

```bash
# Two-node pairing
export KAMIWAZA_PAIRED_NODE=10.77.0.5
export KAMIWAZA_PAIRED_USER=jxstanford
export KAMIWAZA_PAIRED_KEY=/opt/kamiwaza/kamiwaza/runtime/ssh/id_ed25519_shared
export KAMIWAZA_PAIRED_STRICT_KNOWN_HOSTS=true
export KAMIWAZA_TWO_NODE_MODE=true

# Ray cluster ports (avoid DGX dashboard conflict on port 11000)
export KAMIWAZA_VLLM_RAY_INTERNAL_PORT_BASE=15000
export KAMIWAZA_VLLM_RAY_MIN_WORKER_PORT=5000
export KAMIWAZA_VLLM_RAY_MAX_WORKER_PORT=5199

# Network interface for cross-node distributed communication
export KAMIWAZA_SPARK_NCCL_SOCKET_IFNAME=enp1s0f0np0
```

## Deploying a Model with Tensor Parallelism

### Step 1: Download the model

Download a safetensors model through the Kamiwaza UI. For example, search for `Qwen/Qwen3-8B` and initiate the download. The model files will be stored on the head node and automatically synced to the worker when you deploy.

### Step 2: Create a deployment configuration

Create a model configuration with `tensor_parallel_size=2` to split the model across both nodes. You can do this through the Kamiwaza SDK:

```python
import os
os.environ["KAMIWAZA_VERIFY_SSL"] = "false"

from kamiwaza_sdk import KamiwazaClient
from kamiwaza_sdk.authentication import UserPasswordAuthenticator
from kamiwaza_sdk.schemas.models.model import CreateModelConfig

client = KamiwazaClient(base_url="https://localhost/api")
client.authenticator = UserPasswordAuthenticator(
    "admin", "your-password", client._auth_service
)

# Find the model
models = client.models.list_models()
model = next(m for m in models if m.name == "Qwen3-8B")

# Create a TP=2 configuration
config = CreateModelConfig(
    m_id=model.id,
    name="2-Node TP2",
    default=True,
    description="Two-node tensor parallelism across DGX Spark pair",
    config={
        "tensor_parallel_size": 2,
        "max_model_len": 4096,
        "gpu_memory_utilization": 0.15,
    },
)
result = client.models.create_model_config(config)
print(f"Created config: {result.name} (id: {result.id})")
```

**Configuration parameters:**

| Parameter | Description | Recommended for 8B model |
| --- | --- | --- |
| `tensor_parallel_size` | Number of GPUs to split across (must equal number of nodes) | `2` |
| `max_model_len` | Maximum sequence length | `4096` |
| `gpu_memory_utilization` | Fraction of GPU memory to allocate (DGX Spark has 119 GB per node) | `0.15` for 8B, `0.85` for 70B+ |

### Step 3: Deploy

Deploy through the UI by selecting the model and the "2-Node TP2" configuration, or via SDK:

```python
deployment_id = client.serving.deploy_model(
    model_id=model.id,
    m_config_id=result.id,
)
print(f"Deployment: {deployment_id}")
```

The deployment will:
1. Sync model files to the worker node
2. Launch vLLM Ray head container on the head node
3. Launch vLLM Ray worker container on the worker node
4. Wait for the Ray cluster to form (2 nodes)
5. Start the vLLM API server with tensor parallelism

### Step 4: Test inference

```bash
curl -sk https://localhost/runtime/models/<deployment-id>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3-8B",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

## Troubleshooting

### Deployment stays in INITIALIZING

Check the vLLM container logs in the Kamiwaza UI under the deployment's "Logs" tab. Common causes:

- **Gloo connection refused on 127.0.0.1**: `KAMIWAZA_SPARK_NCCL_SOCKET_IFNAME` is not set or points to the wrong interface. Verify with `ip addr show` on both nodes.
- **Out of memory**: Another vLLM container is using GPU memory. Stop stale containers with `docker stop <container-name>`.
- **Model files not found on worker**: Check that `/opt/kamiwaza/models` exists and is writable on the worker node.

### SSH permission denied during deployment

The `kamiwaza` system user cannot read the SSH key. Ensure the key is at a path owned by `kamiwaza`:

```bash
ls -la /opt/kamiwaza/kamiwaza/runtime/ssh/
# Should show: -rw------- kamiwaza kamiwaza id_ed25519_shared
```

### Stale lock files prevent startup

If kamiwaza was previously run as a different user, lock files in `/tmp` may have wrong ownership:

```bash
sudo rm -f /tmp/kamiwazad.starting /tmp/kamiwazad.lock /tmp/.kamiwaza_lock_*
```

## Operational notes

- Use a dedicated SSH key with limited access to the worker node.
- Ensure both nodes can reach any upstream registries required for container images.
- If you rotate the SSH key or change the remote host, restart kamiwaza services.
- GGUF models use llama.cpp which does not support multi-node tensor parallelism. Use safetensors models with vLLM for two-node deployments.
- Monitor GPU utilization on both nodes with `nvidia-smi` or `watch -n1 nvidia-smi`.
