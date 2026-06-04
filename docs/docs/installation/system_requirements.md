# System Requirements

## Hardware Requirements

### CPU

- **Minimum Cores**: 8+ cores
- **Recommended Cores**: 16+ cores for CPU-based inference workloads
- **Architecture**:
  - Linux: x64/amd64 (64-bit)
  - Windows: x64 (64-bit)
  - macOS: ARM64 (Apple Silicon) only

### Memory

#### System RAM

| Mode | Minimum | Recommended | Notes |
|------|---------|-------------|-------|
| **Lite Mode** | 16GB | 32GB | SQLite database; limited capacity for apps/tools |
| **Full Mode** | 32GB | 64GB+ | CockroachDB + DataHub; production workloads |
| **GPU Workloads** | 32GB | 64GB+ | System RAM alongside GPU vRAM |

#### GPU Memory (vRAM)

- **GPU Inference**: 16GB+ vRAM required
- **Recommended**: 32GB+ vRAM for optimal GPU inference performance

### GPU (Optional)

Kamiwaza supports multiple GPU and accelerator platforms:

**Discrete GPUs:**
- NVIDIA GPUs with compute capability 7.0+ (Linux)
- NVIDIA RTX / Intel Arc (Windows via WSL)

**Unified Memory Systems:**
- **NVIDIA DGX Spark** - GB10 Grace Blackwell, 128GB unified memory
- **AMD Ryzen AI Max+ 395** - "Strix Halo" platform, up to 128GB unified memory
- **Apple Silicon M-series** - Unified memory architecture (macOS only)

See [Special Considerations](#special-considerations) for detailed unified memory platform specifications.

### Storage

Storage requirements are the same across all platforms.

#### Storage Performance

- **Required**: SSD (Solid State Drive)
- **Preferred**: NVMe SSD for optimal performance
- **Minimum**: SATA SSD
- **Note**: Model weights can be on a separate HDD but load times will increase significantly

#### Storage Capacity

- **Minimum**: 100GB free disk space
- **Recommended**: 200GB+ free disk space
- **Enterprise Edition**: Additional space for /opt/kamiwaza persistence

#### Capacity Planning

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Operating System** | 20GB | 50GB | Ubuntu/RHEL base + dependencies |
| **Kamiwaza Platform** | 50GB | 50GB | Python environment, Ray, services |
| **Model Storage** | 50GB | 500GB+ | Depends on number and size of models |
| **Database** | 10GB | 50GB | CockroachDB for metadata |
| **Vector Database** | 10GB | 100GB+ | For embeddings (if enabled) |
| **Logs & Metrics** | 10GB | 50GB | Rotated logs, Ray dashboard data |
| **Scratch Space** | 20GB | 100GB | Temporary files, downloads, builds |
| **Total** | **170GB** | **900GB+** | |

#### Storage Performance Requirements

**Local Storage (Single Node):**
- **Minimum:** SATA SSD (500 MB/s sequential read)
- **Recommended:** NVMe SSD (2000+ MB/s sequential read)
- **Note:** HDD is only recommended for non-dynamic model loads and low KV cache usage - model load times can be very long (15+ minutes); models are in memory after load

**Performance Targets:**
- **Sequential Read:** 2000+ MB/s (model loading)
- **Sequential Write:** 1000+ MB/s (model downloads, checkpoints)
- **4K Random Read IOPS:** 50,000+ (database, concurrent access)
- **4K Random Write IOPS:** 20,000+ (database writes, logs)

**Why It Matters:**
- 7B model (14GB): Loads in ~7 seconds on NVMe vs ~28 seconds on SATA SSD
- Concurrent model loads across Ray workers stress random read performance
- Database query performance directly tied to IOPS

---

## Supported Operating Systems

### Linux

- **Ubuntu**: 24.04 and 22.04 LTS via .deb package installation (x64/amd64 architecture only)
- **Red Hat Enterprise Linux (RHEL)**: 9

### Windows

- **Windows 11** (x64 architecture) via WSL with MSI installer
- Requires Windows Subsystem for Linux (WSL) installed and enabled
- Administrator access required for initial setup
- Windows Terminal recommended for optimal WSL experience

### macOS

- **macOS 15.0 (Sequoia) or later**, Apple Silicon (ARM64) only
- Community edition only
- Single-node deployments only (Enterprise edition not available on macOS)

---

## Software Dependencies

### Pre-requisites (User Must Install)

Before running the Kamiwaza installer, ensure the following are installed:

| Component | Requirement | Installation Guide |
|-----------|-------------|-------------------|
| **Docker** | Docker Engine 24.0+ with Compose 2.23+ | [Docker Install Guide](https://docs.docker.com/engine/install/) |
| **Browser** | Chrome 141+ (tested and recommended) | [Download Chrome](https://www.google.com/chrome/) |

### GPU Drivers (Required for GPU Inference)

Install the appropriate driver for your GPU hardware:

**NVIDIA GPUs:**
| Component | Requirement | Installation Guide |
|-----------|-------------|-------------------|
| NVIDIA Driver | 550-server or later | [NVIDIA Driver Downloads](https://www.nvidia.com/download/index.aspx) |
| NVIDIA Container Toolkit | Required for GPU containers | [Container Toolkit Install](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

**AMD GPUs (ROCm):**
| Component | Requirement | Installation Guide |
|-----------|-------------|-------------------|
| ROCm | 7.1.1+ (see note for gfx1151) | [ROCm Installation](https://rocm.docs.amd.com/en/latest/deploy/linux/index.html) |
| Docker ROCm support | `--device /dev/kfd --device /dev/dri` | [ROCm Docker Guide](https://rocm.docs.amd.com/en/latest/how-to/docker.html) |

> **Note:** AMD Strix Halo (gfx1151) requires ROCm 7.10.0 preview or later. See [ROCm 7.10.0 Preview](https://rocm.docs.amd.com/en/7.10.0-preview/) - this is a preview release and not intended for production use.

### Linux Full Mode Only

These dependencies are only required for Linux installations using Full mode (`--full` flag). Lite mode uses SQLite and does not require CockroachDB.

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **CockroachDB** | v23.2.x | Database for Full mode |

**Install CockroachDB on Ubuntu/Debian:**

```bash
wget -qO- https://binaries.cockroachdb.com/cockroach-v23.2.12.linux-amd64.tgz | tar xvz
sudo cp cockroach-v23.2.12.linux-amd64/cockroach /usr/local/bin
rm -rf cockroach-v23.2.12.linux-amd64

# Verify installation
cockroach version
```

> **Note:** macOS installations automatically install CockroachDB via Homebrew when needed.

### Auto-Installed by Kamiwaza

The Kamiwaza installer automatically installs and configures the following - no manual installation required:

- Python 3.12 (or 3.10 for tarball installations)
- Node.js 22.x and NVM
- uv (Python package manager)
- Platform-specific dependencies

---

## Verifying System Requirements

Use these commands to verify your system meets the requirements before installation.

### Docker

```bash
docker --version
# Expected: Docker version 24.0.0 or later
# Example output: Docker version 27.4.0, build bde2b89

docker compose version
# Expected: Docker Compose version v2.23.0 or later
# Example output: Docker Compose version v2.31.0
```

**If you get "permission denied" errors**, add your user to the docker group:

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group membership (choose one):
newgrp docker          # Apply in current terminal session
# OR log out and back in
# OR reboot

# Verify group membership
groups | grep docker
# Expected: "docker" should appear in the list
```

### Python

```bash
python3 --version
# Expected: Python 3.10.x, 3.11.x, or 3.12.x
# Example output: Python 3.12.3
```

### NVIDIA GPU (if applicable)

```bash
# Check NVIDIA driver
nvidia-smi
# Expected: Driver version 450.80.02 or later (550+ recommended)
# Should display GPU name, driver version, and CUDA version

# Check NVIDIA Container Toolkit
nvidia-ctk --version
# Expected: Any version indicates toolkit is installed
# Example output: NVIDIA Container Toolkit CLI version 1.17.3

# Test GPU access from Docker
docker run --rm --gpus all nvidia/cuda:12.4.1-runtime-ubuntu22.04 nvidia-smi
# Expected: Same output as nvidia-smi, confirming Docker can access GPU
```

### AMD ROCm (if applicable)

```bash
# Check ROCm installation
rocm-smi
# Expected: Should display AMD GPU information
# Look for: GPU temperature, utilization, memory usage

# Check ROCm version
cat /opt/rocm/.info/version
# Expected: 7.1.1 or later (7.10.0+ for Strix Halo gfx1151)

# Verify GPU device access
ls -la /dev/kfd /dev/dri
# Expected: Both devices should exist and be accessible

# Test ROCm from Docker
docker run --rm --device /dev/kfd --device /dev/dri --group-add video rocm/pytorch:latest rocm-smi
# Expected: Should display GPU information from within container
```

### System Resources

```bash
# Check available memory
free -h
# Expected: At least 16GB total (32GB+ recommended)
# Look for "Mem:" row, "total" column

# Check CPU cores
nproc
# Expected: 8 or more cores

# Check available disk space
df -h /
# Expected: At least 100GB free (200GB+ recommended)
```

---

## Hardware Recommendation Tiers

Kamiwaza is a distributed AI platform built on Ray that supports both CPU-only and GPU-accelerated inference. Hardware requirements vary significantly based on:

- **Model size**: From 0.6B to 70B+ parameters
- **Deployment scale**: Single-node development vs multi-node production
- **Inference engine**: LlamaCpp (CPU/GPU), VLLM (GPU), MLX (Apple Silicon)
- **Workload type**: Interactive chat, batch processing, RAG pipelines

### GPU Memory Requirements by Model Size

The table below provides real-world GPU memory requirement estimates for representative models at different scales. These estimates assume FP8 and include overhead for context windows and batch processing.

| Model Example | Parameters | Minimum vRAM | Notes |
|--------------|------------|--------------|-------|
| **GPT-OSS 20B** | 20B | 24GB | Includes weights + 1-batch max context; fits 1x 24GB GPU (e.g., L4/RTX 4090) |
| **GPT-OSS 120B** | 120B | 80GB | ~40GB weights + 1-batch max context; 1x H100/H200 or 2x A100 80GB recommended |
| **Qwen 3 235B A22B** | 235B | 150GB | ~120GB weights + 1-batch max context; 2x H200 (282GB) or 2x B200 (384GB) ideal for max context |
| **Qwen 3-VL 235B A22B** | 235B | 150GB | Same base minimum (includes 1-batch max context); budget +20-30% vRAM for high-res vision inputs |

**Key Considerations:**
- **Minimum vRAM**: FP8 weights + 1-batch allocation at your target max context
- **Headroom**: For longer contexts, larger batch sizes, and concurrency, budget additional vRAM beyond minimums
- **Vision Workloads**: Image/video processing adds overhead; budget 20-30% more for vision-language models
- **Tensor Parallelism**: Distributing large models (120B+) across multiple GPUs requires high-bandwidth interconnects (NVLink 3.0+)

### Tier 1: Development & Small Models

**Use Case:** Local development, testing, small to medium model deployment (up to 13B parameters)

**Hardware Specifications:**
- **CPU:** 8-16 cores / 16-32 threads
- **RAM:** 32GB (16GB minimum for lite mode only)
- **Storage:** 200GB NVMe SSD (100GB minimum)
- **GPU:** Optional - Single GPU with 16-24GB VRAM
  - NVIDIA RTX 4090 (24GB)
  - NVIDIA RTX 4080 (16GB)
  - NVIDIA T4 (16GB)
- **Network:** 1-10 Gbps

**Workload Capacity:**
- Low-volume workloads: 1-10 concurrent requests (supports dozens of interactive users)
- Development, testing, and proof-of-concept deployments
- Light production workloads

### Tier 2: Production - Medium to Large Models

**Use Case:** Production deployment of medium to large models (13B-70B parameters), high throughput

**Hardware Specifications:**
- **CPU:** 32 cores / 64 threads
- **RAM:** 128-256GB system RAM
- **Storage:** 1-2TB NVMe SSD
- **GPU:** 1-4 GPUs with 40GB+ VRAM each
  - 1-4x NVIDIA B200 (192GB HBM3e)
  - 1-4x NVIDIA H200 (141GB HBM3e)
  - 1-4x NVIDIA RTX 6000 Pro Blackwell (48GB)
  - 1-2x NVIDIA H100 (80GB)
  - 1-4x NVIDIA A100 (40GB or 80GB)
  - 1-2x NVIDIA L40S (48GB)
  - 2-4x NVIDIA A10G (24GB) for tensor parallelism
- **Network:** 25-40 Gbps

**Workload Capacity:**
- Medium-scale production: 100s to 1,000+ concurrent requests (supports thousands of interactive users)
- Example: Per-GPU batch size of 32 across 8 GPUs = 256 concurrent requests; batch size of 128 = 1,024 requests
- Production chat applications
- Complex RAG pipelines with embedding generation
- Batch inference

### Tier 3: Enterprise Multi-Node Cluster

**Use Case:** Enterprise deployment with multiple models, high availability, horizontal scaling, 99.9%+ SLA

**Cluster Architecture:**

**Head Node (Control Plane):**
- **CPU:** 16 cores / 32 threads
- **RAM:** 64GB
- **Storage:** 500GB NVMe SSD
- **GPU:** Same class as worker nodes (homogeneous cluster recommended)
- **Role:** Ray head, API gateway, scheduling, monitoring (head performs minimal extra work; Ray backend load is distributed across nodes)

**Worker Nodes (3+ nodes for HA):**
- **CPU:** 32-64 cores / 64-128 threads per node
- **RAM:** 256-512GB per node
- **Storage:** 2TB NVMe SSD per node (local cache)
- **GPU:** 4-8 GPUs per node (same class as head node)
- **Network:** 40-100 Gbps (InfiniBand for HPC workloads)

> Note: For Enterprise Edition production clusters, avoid non-homogeneous hardware (e.g., GPU-less head nodes). Each node participates in data plane duties (Traefik gateway, HTTP proxying, etc.), so matching GPU capabilities simplifies scheduling and maximizes throughput.

**Shared Storage:**
- High-performance NAS or distributed filesystem (Lustre, CephFS)
- 10TB+ capacity, NVMe-backed
- 10+ GB/s aggregate sequential throughput
- Low-latency access (< 5ms) from all nodes

**Workload Capacity:**
- Multiple models deployed simultaneously
- High-scale production: 1,000–10,000+ concurrent requests (supports tens of thousands of interactive users)
- Batch sizes scale with GPU count and model size; smaller requests enable higher throughput per GPU
- High availability with automatic failover
- Horizontal auto-scaling based on load
- Production SLAs (99.9% uptime)

---

## Cloud Provider Instance Mapping

### AWS EC2 Instance Types

| Tier | Instance Type | vCPU | RAM | GPU | Storage |
|------|--------------|------|-----|-----|---------|
| **Tier 1: CPU-only** | `m6i.2xlarge` | 8 | 32GB | None | 200GB gp3 |
| **Tier 1: With GPU** | `g5.xlarge` | 4 | 16GB | 1x A10G (24GB) | 200GB gp3 |
| **Tier 1: Alternative** | `g5.2xlarge` | 8 | 32GB | 1x A10G (24GB) | 200GB gp3 |
| **Tier 2: Multi-GPU** | `g5.12xlarge` | 48 | 192GB | 4x A10G (96GB) | 2TB gp3 |
| **Tier 2: Alternative** | `p4d.24xlarge` | 96 | 1152GB | 8x A100 (320GB) | 2TB gp3 |
| **Tier 3: All Nodes** | `p4d.24xlarge` | 96 | 1152GB | 8x A100 (320GB) | 2TB gp3 |

**Notes:**
- Use `gp3` SSD volumes (not `gp2`) for better performance/cost
- For Tier 3 shared storage: Amazon FSx for Lustre or EFS (with Provisioned Throughput)
- Use Placement Groups for low-latency multi-node clusters (Tier 3)
- H100 instances (`p5.48xlarge`) available in limited regions for highest performance
- Latest options: Emerging `p6`/`p6e` families with H200/B200/Grace-Blackwell are rolling out in select regions; map to Tier 2/3 as available.

### Google Cloud Platform (GCP) Instance Types

| Tier | Machine Type | vCPU | RAM | GPU | Storage |
|------|-------------|------|-----|-----|---------|
| **Tier 1: CPU-only** | `n2-standard-8` | 8 | 32GB | None | 200GB SSD |
| **Tier 1: With GPU** | `n1-standard-8` + `1x T4` | 8 | 30GB | 1x T4 (16GB) | 200GB SSD |
| **Tier 1: Alternative** | `g2-standard-8` + `1x L4` | 8 | 32GB | 1x L4 (24GB) | 200GB SSD |
| **Tier 2: Multi-GPU** | `a2-highgpu-4g` | 48 | 340GB | 4x A100 (160GB) | 2TB SSD |
| **Tier 2: Alternative** | `g2-standard-48` + `4x L4` | 48 | 192GB | 4x L4 (96GB) | 2TB SSD |
| **Tier 3: All Nodes** | `a2-highgpu-8g` | 96 | 680GB | 8x A100 (320GB) | 2TB SSD |

**Notes:**
- Use `pd-ssd` or `pd-balanced` persistent disks (not `pd-standard`)
- For Tier 3 shared storage: Filestore High Scale tier (up to 10 GB/s)
- Use Compact Placement for low-latency multi-node clusters (Tier 3)
- L4 GPUs (24GB) available as cost-effective alternative to A100
- Latest options: Blackwell/H200 classes are entering preview/limited availability; consider AI Hypercomputer offerings as they launch.

### Microsoft Azure Instance Types

| Tier | VM Size | vCPU | RAM | GPU | Storage |
|------|---------|------|-----|-----|---------|
| **Tier 1: CPU-only** | `Standard_D8s_v5` | 8 | 32GB | None | 200GB Premium SSD |
| **Tier 1: With GPU** | `Standard_NC4as_T4_v3` | 4 | 28GB | 1x T4 (16GB) | 200GB Premium SSD |
| **Tier 1: Alternative** | `Standard_NC6s_v3` | 6 | 112GB | 1x V100 (16GB) | 200GB Premium SSD |
| **Tier 2: H100 (recommended)** | `Standard_NC40ads_H100_v5` | 40 | 320GB | 1x H100 (80GB) | 2TB Premium SSD |
| **Tier 2: H100 Multi-GPU** | `Standard_NC80adis_H100_v5` | 80 | 640GB | 2x H100 (160GB) | 2TB Premium SSD |
| **Tier 2: A100 Multi-GPU** | `Standard_NC96ads_A100_v4` | 96 | 880GB | 4x A100 (320GB) | 2TB Premium SSD |
| **Tier 2: A100 Alternative** | `Standard_NC48ads_A100_v4` | 48 | 440GB | 2x A100 (160GB) | 2TB Premium SSD |
| **Tier 3: H100 (recommended)** | `Standard_ND96isr_H100_v5` | 96 | 1900GB | 8x H100 (640GB) | 2TB Premium SSD |
| **Tier 3: A100 Alternative** | `Standard_ND96asr_v4` | 96 | 900GB | 8x A100 (320GB) | 2TB Premium SSD |

**Notes:**
- Use Premium SSD (not Standard HDD or Standard SSD)
- For Tier 3 shared storage: Azure NetApp Files Premium or Ultra tier
- Use Proximity Placement Groups for low-latency multi-node clusters (Tier 3)
- NDm A100 v4 series offers InfiniBand networking for HPC workloads
- Latest options: Blackwell/H200-based VM families are announced/rolling out; align Tier 2/3 to those SKUs where available.

---

## Network Configuration

### Network Bandwidth Requirements

#### Single Node Deployment

**Network Bandwidth:**
- **Minimum:** 1 Gbps (for model downloads, API traffic)
- **Recommended:** 10 Gbps (for high-throughput inference)

**Considerations:**
- Internet bandwidth for downloading models from HuggingFace (one-time)
- Client API traffic for inference requests/responses
- Monitoring and logging egress

#### Multi-Node Cluster

**Inter-Node Network:**
- **Minimum:** 10 Gbps Ethernet
- **Recommended:** 25-40 Gbps Ethernet or InfiniBand
- **Latency:** < 1ms between nodes (same datacenter/availability zone)

**Why It Matters:**
- Ray distributed scheduling requires low-latency communication
- Tensor parallelism transfers large model shards between GPUs
- Shared storage access impacts model loading performance

### Network Ports

#### Linux/macOS Enterprise Edition
- 443/tcp: HTTPS primary access
- 51100-51199/tcp: Deployment ports for model instances (will also be used for 'App Garden' in the future)

#### Windows Edition
- 443/tcp: HTTPS primary access (via WSL)
- 61100-61299/tcp: Reserved ports for Windows installation

### Required Kernel Modules (Enterprise Edition Linux Only)

Required modules for Swarm container networking:
- overlay
- br_netfilter

### System Network Parameters (Enterprise Edition Linux Only)

These will be set by the installer.

```bash
# Required sysctl settings for Swarm networking
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
```

### Community Edition Networking
- Uses standard Docker bridge networks
- No special kernel modules or sysctl settings required
- Simplified single-node networking configuration

---

## Directory Structure

### Enterprise Edition

Note: This is created by the installer and present in cloud marketplace images.

```
/etc/kamiwaza/
├── config/
├── ssl/      # Cluster certificates
└── swarm/    # Swarm tokens

/opt/kamiwaza/
├── containers/  # Docker root (configurable)
├── logs/
├── nvm/        # Node Version Manager
└── runtime/    # Runtime files
```

### Community Edition

We recommend `${HOME}/kamiwaza` or something similar for `KAMIWAZA_ROOT`.

```
$KAMIWAZA_ROOT/
├── env.sh
├── runtime/
└── logs/
```

---

## Special Considerations

### Apple Silicon (M-Series)

**MLX Engine Support:**
- Kamiwaza supports Apple Silicon via the MLX inference engine
- Unified memory architecture (shared CPU/GPU RAM)
- Excellent performance for models up to 13B parameters; reasonable performance for larger models when context is appropriately restricted and RAM is available.
- All M-series chips work in approximately the same way, but newer chips (e.g., M4) offer substantially higher performance than older versions
- Ultra chips (Mac Studio/Mac Pro models) typically offer 50-80% more performance than Pro versions

**Notes:**
- No tensor parallelism support (single chip only)
- Not for production use; like-for-like API, UI, capabilities.
- Community edition only; single node only (Enterprise edition not available on macOS)

### NVIDIA DGX Spark

The NVIDIA DGX Spark is a compact AI workstation powered by the GB10 Grace Blackwell Superchip:

- **CPU:** 20-core ARM (10x Cortex-X925 + 10x Cortex-A725)
- **GPU:** Blackwell architecture with 6,144 CUDA cores
- **Memory:** 128GB LPDDR5x unified memory (273 GB/s bandwidth)
- **AI Compute:** Up to 1 PFLOP FP4 AI performance
- **Storage:** 4TB NVMe SSD
- **Networking:** Dual QSFP ports (up to 200 Gbps aggregate)

**Capabilities:**
- Run models up to 200B parameters locally
- Two interconnected units can handle models up to 405B parameters
- Unified memory architecture eliminates GPU vRAM constraints

### AMD Ryzen AI Max+ 395 "Strix Halo"

AMD's Strix Halo platform provides powerful AI inference in a compact form factor:

- **CPU:** 16-core Zen 5 (up to 5.1 GHz), 80MB cache
- **GPU:** Radeon 8060S iGPU (40 CUs, RDNA 3.5 architecture)
- **NPU:** 50 TOPS XDNA 2 neural engine
- **Memory:** Up to 128GB LPDDR5x unified memory (up to 112GB GPU-allocatable)
- **AI Performance:** 126 TOPS total
- **TDP:** 55W (highly power efficient)

**Capabilities:**
- Run 70B+ parameter models locally
- Available in mini PCs and high-end laptops
- Unified memory architecture similar to Apple Silicon

---

## Shared Storage (Multi-Node Clusters)

**Network Filesystem Requirements:**
- **Protocol:** NFSv4, Lustre, CephFS, or S3-compatible object storage
- **Network Bandwidth:** 10 Gbps minimum, 40+ Gbps for production
- **Network Latency:** < 5ms between nodes and storage
- **Sequential Throughput:** 5+ GB/s aggregate (10+ GB/s for large clusters)

**Object Storage (Alternative):**
- S3-compatible API (AWS S3, GCS, MinIO, etc.)
- Local caching layer recommended for frequently accessed models
- Consider bandwidth costs for cloud object storage

**Shared Storage Options:**

| Solution | Use Case | Throughput | Cost Profile |
|----------|----------|------------|--------------|
| **NFS over NVMe** | Small clusters (< 5 nodes) | 1-5 GB/s | Low (commodity hardware) |
| **AWS FSx for Lustre** | AWS multi-node clusters | 1-10 GB/s | Medium (pay per GB/month + throughput) |
| **GCP Filestore High Scale** | GCP multi-node clusters | Up to 10 GB/s | Medium-High |
| **Azure NetApp Files Ultra** | Azure multi-node clusters | Up to 10 GB/s | High |
| **CephFS** | On-premises clusters | 5-20 GB/s | Medium (requires Ceph cluster) |
| **Object Storage + Cache** | Cost-optimized | Varies | Low storage, high egress |

### Storage Configuration by Edition

#### Enterprise Edition Requirements

- Primary mountpoint for persistent storage (/opt/kamiwaza)
- Scratch/temporary storage (auto-configured)
- For Azure: Additional managed disk for persistence
- Shared storage for multi-node clusters (see Shared Storage Options above)

#### Community Edition

- Local filesystem storage
- Configurable paths via environment variables
- Single-node storage only (no shared storage required)

---

## Version Compatibility

- Docker Engine: 24.0 or later with Compose 2.23+
- NVIDIA Driver: 450.80.02 or later
- ETCD: 3.5 or later

---

## Important Notes

- **System Impact**: Network and kernel configurations can affect other services
- **Security**: Certificate generation and management for cluster communications
- **GPU Support**: Available on Linux (NVIDIA GPUs) and Windows (NVIDIA RTX, Intel Arc via WSL)
- **Storage**: Enterprise Edition requires specific storage configuration
- **Network**: Enterprise Edition requires specific network ports for cluster communication
- **Docker**: Custom Docker root configuration may affect other containers
- **Windows Edition**: Requires WSL 2 and will create a dedicated Ubuntu 24.04 instance
- **Administrator Access**: Windows installation requires administrator privileges for initial setup
