# System Requirements

## Hardware Requirements

### CPU

- **Minimum Cores**: 8+ cores
- **Recommended Cores**: 16+ cores for CPU-based inference workloads
- **Architecture**:
  - Linux: x64/amd64 (64-bit)
  - macOS: ARM64 (Apple Silicon) only

### Memory

#### System RAM

| Deployment | Minimum | Recommended | Notes |
|------------|---------|-------------|-------|
| **Standard** | 16GB | 32GB | Baseline install; limited capacity for apps and tools |
| **Production** | 32GB | 64GB+ | Production workloads |
| **GPU Workloads** | 32GB | 64GB+ | System RAM alongside GPU vRAM |

#### GPU Memory (vRAM)

- **GPU Inference**: 16GB+ vRAM required
- **Recommended**: 32GB+ vRAM for optimal GPU inference performance

### GPU (Optional)

Kamiwaza supports multiple GPU and accelerator platforms:

**Discrete GPUs:**
- NVIDIA GPUs with compute capability 7.0+ (Linux)
- AMD GPUs via ROCm (Linux) — see [Software Dependencies](#software-dependencies)

**Unified Memory Systems:**
- **NVIDIA DGX Spark** - GB10 Grace Blackwell, 128GB unified memory
- **AMD Ryzen AI Max+ 395** - "Strix Halo" platform, up to 128GB unified memory
- **Apple Silicon M-series** - Unified memory architecture (macOS only)

See [Special Considerations](#special-considerations) for detailed unified memory platform specifications.

### Storage

Storage *performance* requirements are the same across all platforms. Storage **capacity** figures below are for Linux hosts, where the installer preallocates cluster storage on the volume backing `/var/lib`. On macOS the cluster runs inside a user-scoped Podman machine — size that machine's disk to the same totals. See [Online Installation](online_install.md).

#### Storage Performance

- **Required**: SSD (Solid State Drive)
- **Preferred**: NVMe SSD for optimal performance
- **Minimum**: SATA SSD
- **Note**: Model weights can be on a separate HDD but load times will increase significantly

#### Storage Capacity

> **The installer preallocates cluster storage** on the volume backing `/var/lib`, so it needs far more free space than the generic figures below. Budget **≥ 350 GB on `/var/lib`** with the `80G` OSD override, up to **≈ 1.1 TB at the default OSD size**. See [Online Installation](online_install.md) and [Offline Installation](offline_install.md) for the authoritative per-filesystem floor and how to size the OSD image.

- **Minimum**: 350GB free on the volume backing `/var/lib` (with the `80G` OSD override)
- **Recommended**: 1.1TB+ on `/var/lib` at the default OSD size
- Additional space for `/opt/kamiwaza` persistence

#### Capacity Planning

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Operating System** | 20GB | 50GB | Ubuntu/RHEL base + dependencies |
| **Kamiwaza** | 50GB | 50GB | Python environment, Ray, services |
| **Model Storage** | 50GB | 500GB+ | Depends on number and size of models |
| **Database** | 10GB | 50GB | PostgreSQL for metadata |
| **Vector Database** | 10GB | 100GB+ | For embeddings (if enabled) |
| **Logs & Metrics** | 10GB | 50GB | Rotated logs, Ray dashboard data |
| **Scratch Space** | 20GB | 100GB | Temporary files, downloads, builds |
| **Total** | **350GB** | **1.1TB+** | Governed by the `/var` floor above, not the sum of the rows |

> The rows above describe how space is *used* once running. The binding constraint at install time is the preallocated cluster storage on `/var/lib` — **350 GB** with the `80G` OSD override, **1.1 TB** at the default OSD size. Sizing to the per-component sum alone will fail at host prep.

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

- **Ubuntu**: 24.04 and 22.04 LTS (x64/amd64 architecture only) — online install
- **Red Hat Enterprise Linux (RHEL) 9** and compatibles — online or offline install

### macOS

- **macOS 15.0 (Sequoia) or later**, Apple Silicon (ARM64) only — online install
- Single-node deployments only

All platforms install via the Keygen-based installer and require a Kamiwaza Prod license key. See [Installing Kamiwaza](installation_process.md) for the online and offline install paths.

---

## Software Dependencies

### What You Provide

The Kamiwaza installer provisions the container runtime, local Kubernetes cluster, and platform dependencies for you. You only need:

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **License key** | Kamiwaza Prod license key | Required to pull platform images from Keygen. Contact your Kamiwaza representative. |
| **Supported OS** | Ubuntu 22.04/24.04, RHEL 9, or macOS | See [Supported Operating Systems](#supported-operating-systems) |
| **Browser** | Chrome 141+ (tested and recommended) | [Download Chrome](https://www.google.com/chrome/) |
| **GPU drivers** | For GPU inference only — see below | Install before running the installer |

> The installer handles the container runtime and cluster tooling — you do not install Docker, Podman, or Kubernetes yourself. See [Installing Kamiwaza](installation_process.md) for the install paths.

### GPU Drivers (Required for GPU Inference)

Install the appropriate driver for your GPU hardware:

**NVIDIA GPUs:**
| Component | Requirement | Installation guide |
|-----------|-------------|-------------------|
| NVIDIA driver for CUDA 12 images | 550-server or later | [NVIDIA driver downloads](https://www.nvidia.com/download/index.aspx) |
| NVIDIA driver for CUDA 13 images and DGX Spark | 580.65.06 or later | [CUDA 13 release notes](https://docs.nvidia.com/cuda/archive/13.0.0/cuda-toolkit-release-notes/index.html) |
| NVIDIA Container Toolkit | Required for GPU containers | [Container Toolkit installation](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

DGX Spark software releases include the matching R580 driver and CUDA 13 stack. See the [DGX Spark release notes](https://docs.nvidia.com/dgx/dgx-spark/release-notes.html) for the versions in each release.

**AMD GPUs (ROCm):**
| Component | Requirement | Installation guide |
|-----------|-------------|-------------------|
| ROCm for Ryzen AI Max+ 395 (gfx1151) | ROCm 7.2.1 or later on Ubuntu 24.04 | [Ryzen native Linux compatibility](https://rocm.docs.amd.com/projects/radeon-ryzen/en/docs-7.2.1/docs/compatibility/compatibilityryz/native_linux/native_linux_compatibility.html) |
| Other AMD GPUs | A ROCm release that lists the GPU and operating system as supported | [ROCm compatibility matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html) |
| Container GPU access | `/dev/kfd` and `/dev/dri` exposed to the container runtime | [ROCm containers guide](https://rocm.docs.amd.com/en/latest/how-to/docker.html) |

AMD lists the Radeon 8060S in Ryzen AI Max+ 395 systems as production-supported on the ROCm 7.2.x native Linux path. Follow the [Ryzen native Linux installation guide](https://rocm.docs.amd.com/projects/radeon-ryzen/en/docs-7.2/docs/install/installryz/native_linux/install-ryzen.html); the retired ROCm 7.10 preview path is not required.

### Auto-Installed by Kamiwaza

The Kamiwaza installer automatically installs and configures the following — no manual installation required:

- The container runtime and local Kubernetes cluster
- The platform database and other backing services
- Python, Node.js, `uv`, and other platform-specific dependencies

---

## Verifying System Requirements

Use these commands to verify your system meets the requirements before installation. The installer provisions the container runtime and cluster tooling, so you do not need to install or verify Docker beforehand — the checks below confirm GPU access and host resources.

### NVIDIA GPU (if applicable)

```bash
# Check NVIDIA driver
nvidia-smi
# Expected for CUDA 12 images: Driver version 550 or later
# Expected for CUDA 13 images and DGX Spark: Driver version 580.65.06 or later
# Should display GPU name, driver version, and CUDA version

# Check NVIDIA Container Toolkit
nvidia-ctk --version
# Expected: Any version indicates toolkit is installed
# Example output: NVIDIA Container Toolkit CLI version 1.17.3
```

### AMD ROCm (if applicable)

```bash
# Check ROCm installation
rocm-smi
# Expected: Should display AMD GPU information
# Look for: GPU temperature, utilization, memory usage

# Check ROCm version
cat /opt/rocm/.info/version
# Expected for Ryzen AI Max+ 395 (gfx1151): 7.2.1 or later

# Verify GPU device access
ls -la /dev/kfd /dev/dri
# Expected: Both devices should exist and be accessible
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

# Check available disk space on the volume backing /var/lib (the binding constraint)
df -h /var/lib
# Expected: At least 350GB free with the `80G` OSD override; 1.1TB+ at the default OSD size

# Check the root filesystem too
df -h /
# Expected: At least 30GB free (50GB for the offline install path)
# If /var is not a separate mount, both commands report the same filesystem —
# size the root volume to the /var figure, not the sum of the two.
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
- **RAM:** 32GB (16GB minimum for development only)
- **Storage:** 400GB NVMe SSD (350GB minimum, on the volume backing `/var/lib` — see [Storage Capacity](#storage-capacity)). This assumes the `80G` OSD override; at the default OSD size budget 1.1TB+.
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
- **Storage:** 1.2-2TB NVMe SSD (the 1.1TB default-OSD floor applies). The `80G` override drops the *install* floor to 350GB (provision 400GB to clear it comfortably), but size well above that for a Tier 2 model library — see Model Storage in [Capacity Planning](#capacity-planning)
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
- **Storage:** 500GB NVMe SSD (assumes the `80G` OSD override; 1.1TB+ at the default OSD size)
- **GPU:** Same class as worker nodes (homogeneous cluster recommended)
- **Role:** Ray head, API gateway, scheduling, monitoring (head performs minimal extra work; Ray backend load is distributed across nodes)

**Worker Nodes (3+ nodes for HA):**
- **CPU:** 32-64 cores / 64-128 threads per node
- **RAM:** 256-512GB per node
- **Storage:** 2TB NVMe SSD per node (local cache)
- **GPU:** 4-8 GPUs per node (same class as head node)
- **Network:** 40-100 Gbps (InfiniBand for HPC workloads)

> Note: For production clusters, avoid non-homogeneous hardware (e.g., GPU-less head nodes). Each node participates in data plane duties (ingress gateway, HTTP proxying, etc.), so matching GPU capabilities simplifies scheduling and maximizes throughput.

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
| **Tier 1: CPU-only** | `m6i.2xlarge` | 8 | 32GB | None | 400GB gp3 |
| **Tier 1: With GPU** | `g5.xlarge` | 4 | 16GB | 1x A10G (24GB) | 400GB gp3 |
| **Tier 1: Alternative** | `g5.2xlarge` | 8 | 32GB | 1x A10G (24GB) | 400GB gp3 |
| **Tier 2: Multi-GPU** | `g5.12xlarge` | 48 | 192GB | 4x A10G (96GB) | 2TB gp3 |
| **Tier 2: Alternative** | `p4d.24xlarge` | 96 | 1152GB | 8x A100 (320GB) | 2TB gp3 |
| **Tier 3: All Nodes** | `p4d.24xlarge` | 96 | 1152GB | 8x A100 (320GB) | 2TB gp3 |

**Notes:**
- Tier 1 storage figures assume the `80G` OSD override; at the default OSD size the host needs **1.1TB+** on the volume backing `/var/lib` (see [Storage Capacity](#storage-capacity))
- Use `gp3` SSD volumes (not `gp2`) for better performance/cost
- For Tier 3 shared storage: Amazon FSx for Lustre or EFS (with Provisioned Throughput)
- Use Placement Groups for low-latency multi-node clusters (Tier 3)
- H100 instances (`p5.48xlarge`) available in limited regions for highest performance
- Latest options: Emerging `p6`/`p6e` families with H200/B200/Grace-Blackwell are rolling out in select regions; map to Tier 2/3 as available.

### Google Cloud Platform (GCP) Instance Types

| Tier | Machine Type | vCPU | RAM | GPU | Storage |
|------|-------------|------|-----|-----|---------|
| **Tier 1: CPU-only** | `n2-standard-8` | 8 | 32GB | None | 400GB SSD |
| **Tier 1: With GPU** | `n1-standard-8` + `1x T4` | 8 | 30GB | 1x T4 (16GB) | 400GB SSD |
| **Tier 1: Alternative** | `g2-standard-8` + `1x L4` | 8 | 32GB | 1x L4 (24GB) | 400GB SSD |
| **Tier 2: Multi-GPU** | `a2-highgpu-4g` | 48 | 340GB | 4x A100 (160GB) | 2TB SSD |
| **Tier 2: Alternative** | `g2-standard-48` + `4x L4` | 48 | 192GB | 4x L4 (96GB) | 2TB SSD |
| **Tier 3: All Nodes** | `a2-highgpu-8g` | 96 | 680GB | 8x A100 (320GB) | 2TB SSD |

**Notes:**
- Tier 1 storage figures assume the `80G` OSD override; at the default OSD size the host needs **1.1TB+** on the volume backing `/var/lib` (see [Storage Capacity](#storage-capacity))
- Use `pd-ssd` or `pd-balanced` persistent disks (not `pd-standard`)
- For Tier 3 shared storage: Filestore High Scale tier (up to 10 GB/s)
- Use Compact Placement for low-latency multi-node clusters (Tier 3)
- L4 GPUs (24GB) available as cost-effective alternative to A100
- Latest options: Blackwell/H200 classes are entering preview/limited availability; consider AI Hypercomputer offerings as they launch.

### Microsoft Azure Instance Types

| Tier | VM Size | vCPU | RAM | GPU | Storage |
|------|---------|------|-----|-----|---------|
| **Tier 1: CPU-only** | `Standard_D8s_v5` | 8 | 32GB | None | 400GB Premium SSD |
| **Tier 1: With GPU** | `Standard_NC4as_T4_v3` | 4 | 28GB | 1x T4 (16GB) | 400GB Premium SSD |
| **Tier 1: Alternative** | `Standard_NC6s_v3` | 6 | 112GB | 1x V100 (16GB) | 400GB Premium SSD |
| **Tier 2: H100 (recommended)** | `Standard_NC40ads_H100_v5` | 40 | 320GB | 1x H100 (80GB) | 2TB Premium SSD |
| **Tier 2: H100 Multi-GPU** | `Standard_NC80adis_H100_v5` | 80 | 640GB | 2x H100 (160GB) | 2TB Premium SSD |
| **Tier 2: A100 Multi-GPU** | `Standard_NC96ads_A100_v4` | 96 | 880GB | 4x A100 (320GB) | 2TB Premium SSD |
| **Tier 2: A100 Alternative** | `Standard_NC48ads_A100_v4` | 48 | 440GB | 2x A100 (160GB) | 2TB Premium SSD |
| **Tier 3: H100 (recommended)** | `Standard_ND96isr_H100_v5` | 96 | 1900GB | 8x H100 (640GB) | 2TB Premium SSD |
| **Tier 3: A100 Alternative** | `Standard_ND96asr_v4` | 96 | 900GB | 8x A100 (320GB) | 2TB Premium SSD |

**Notes:**
- Tier 1 storage figures assume the `80G` OSD override; at the default OSD size the host needs **1.1TB+** on the volume backing `/var/lib` (see [Storage Capacity](#storage-capacity))
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

#### Linux/macOS
- 443/tcp: HTTPS primary access
- 51100-51199/tcp: Deployment ports for model instances (will also be used for 'App Garden' in the future)

**Outbound (online installs):** the online installer pulls all platform container images from Keygen over HTTPS (port 443). Allow outbound DNS and HTTPS access to:

- your OS package repositories,
- `raw.pkg.keygen.sh` (installer and fallback artifacts),
- `oci.pkg.keygen.sh` (platform images).

The online install path does not pull from Docker Hub, Quay, or GHCR — the installer rewrites every image reference to Keygen and fails if any non-Keygen registry reference remains, so you do not need to allow-list those registries or provide credentials for them. Enterprise firewall policies that block outbound HTTPS to the Keygen hosts will fail the install. Offline installs have no outbound requirement. See [Online Installation](online_install.md) for details.

### Required Kernel Modules (Linux)

Required modules for container networking:
- overlay
- br_netfilter

### System Network Parameters (Linux)

These will be set by the installer.

```bash
# Required sysctl settings for container networking
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
```

---

## Directory Structure

The installer creates the Kamiwaza directories on the host (and they are present in cloud marketplace images):

```
/etc/kamiwaza/
├── config/
└── ssl/      # Cluster certificates

/opt/kamiwaza/
├── cluster/    # Cluster values and overrides
├── logs/
├── prereqs/    # Installer prerequisites (offline installs)
├── scripts/    # Installer and management scripts
└── runtime/    # Runtime files
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
- Single-node only on macOS

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

### Storage Configuration

- Primary mountpoint for persistent storage (`/opt/kamiwaza`)
- Scratch/temporary storage (auto-configured)
- For Azure: Additional managed disk for persistence
- Shared storage for multi-node clusters (see Shared Storage Options above)

---

## Version Compatibility

- NVIDIA driver: 550-server or later for CUDA 12 images; 580.65.06 or later for CUDA 13 images and DGX Spark
- ETCD: 3.5 or later

---

## Important Notes

- **System Impact**: Network and kernel configurations can affect other services
- **Security**: Certificate generation and management for cluster communications
- **GPU Support**: Available on Linux — NVIDIA GPUs (CUDA) and AMD GPUs (ROCm)
- **Storage**: Persistent and scratch storage are configured on the install host (see Storage Configuration)
- **Network**: Requires the network ports listed above for platform and model access
- **License**: A Kamiwaza Prod license key is required for all installs
