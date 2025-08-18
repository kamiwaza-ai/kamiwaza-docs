# GPU Setup Guide for Kamiwaza on Windows

## Overview

Kamiwaza supports hardware acceleration on Windows through WSL2 with the following GPU configurations:
- **NVIDIA GPUs** (RTX series, GTX series, Quadro series)
- **Intel Arc GPUs** (A3xx, A5xx, A7xx series)
- **Intel Integrated GPUs** (UHD Graphics, Iris Xe)

## Prerequisites

### System Requirements
- Windows 11 (Build 22000 or later)
- WSL2 enabled and updated
- Latest GPU drivers installed
- Compatible GPU hardware

### WSL2 Requirements
- WSL2 kernel version 5.10.60.1 or later
- Windows 11 with GPU virtualization support
- GPU drivers with WSL2 compatibility

## NVIDIA GPU Setup

### Supported Hardware
- **RTX 40 Series**: RTX 4090, RTX 4080, RTX 4070 Ti, RTX 4070, RTX 4060 Ti, RTX 4060
- **RTX 30 Series**: RTX 3090, RTX 3080, RTX 3070, RTX 3060 Ti, RTX 3060
- **RTX 20 Series**: RTX 2080 Ti, RTX 2080, RTX 2070, RTX 2060
- **GTX 16 Series**: GTX 1660 Ti, GTX 1660, GTX 1650
- **GTX 10 Series**: GTX 1080 Ti, GTX 1080, GTX 1070, GTX 1060

### Driver Requirements
- **Minimum**: NVIDIA Driver 470.82 or later
- **Recommended**: NVIDIA Driver 535.98 or later
- **Latest**: Download from [NVIDIA Driver Downloads](https://www.nvidia.com/Download/index.aspx)

### Installation Steps

#### 1. Install NVIDIA Drivers
1. Download the latest driver for your GPU
2. Run the installer as Administrator
3. Restart your computer
4. Verify installation: `nvidia-smi` in Command Prompt

#### 2. Install NVIDIA CUDA Toolkit for WSL
```bash
# In WSL (Ubuntu 24.04)
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda-toolkit-12-4
```

#### 3. Verify GPU Access in WSL
```bash
# Check if GPU is visible
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.98                 Driver Version: 535.98                    |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |                               |                      |               MIG M. |
# |===============================+======================+======================|
# |   0  NVIDIA GeForce RTX 4090  On   | 00000000:01:00.0  Off |                  N/A |
# |  0%   45C    P8    25W /  450W |      0MiB /  24576MiB |      0%      Default |
# |                               |                      |                  N/A |
# +-------------------------------+----------------------+----------------------+
```

### Configuration Files

#### .wslconfig (Windows)
```ini
[wsl2]
gpuSupport=true
memory=16GB
processors=8
```

#### Environment Variables (WSL)
```bash
# Add to ~/.bashrc
export CUDA_HOME=/usr/local/cuda
export PATH=$PATH:$CUDA_HOME/bin
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUDA_HOME/lib64
```

## Intel Arc GPU Setup

### Supported Hardware
- **Arc A7 Series**: A770, A750
- **Arc A5 Series**: A580, A570, A560, A550
- **Arc A3 Series**: A380, A370, A350, A310

### Driver Requirements
- **Minimum**: Intel Arc Driver 31.0.101.4502 or later
- **Recommended**: Latest Intel Arc Driver
- **Download**: [Intel Arc Driver Downloads](https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-whql-windows.html)

### Installation Steps

#### 1. Install Intel Arc Drivers
1. Download the latest Intel Arc driver
2. Run the installer as Administrator
3. Restart your computer
4. Verify installation in Device Manager

#### 2. Install Intel OpenCL Runtime
```bash
# In WSL (Ubuntu 24.04)
wget https://github.com/intel/intel-graphics-compiler/releases/download/igc-1.0.13090/intel-opencl-icd_23.17.26241.33_amd64.deb
sudo dpkg -i intel-opencl-icd_23.17.26241.33_amd64.deb
sudo apt-get update
sudo apt-get install -y intel-opencl-icd
```

#### 3. Verify GPU Access in WSL
```bash
# Check OpenCL availability
clinfo | grep "Platform Name"

# Check GPU devices
clinfo | grep "Device Name"

# Expected output:
# Platform Name                                Intel(R) OpenCL
# Device Name                                  Intel(R) Arc(TM) A770 Graphics
```

### Configuration Files

#### .wslconfig (Windows)
```ini
[wsl2]
gpuSupport=true
memory=16GB
processors=8
```

#### Environment Variables (WSL)
```bash
# Add to ~/.bashrc
export INTEL_OPENCL_CONFIG=/etc/OpenCL/vendors/intel.icd
```

## Intel Integrated GPU Setup

### Supported Hardware
- **12th Gen Intel**: UHD Graphics 730, UHD Graphics 770
- **13th Gen Intel**: UHD Graphics 770, UHD Graphics 730
- **14th Gen Intel**: UHD Graphics 770, UHD Graphics 730
- **Intel Iris Xe**: Integrated graphics in 11th-14th gen processors

### Driver Requirements
- **Minimum**: Intel Graphics Driver 30.0.101.1190 or later
- **Recommended**: Latest Intel Graphics Driver
- **Download**: [Intel Graphics Driver Downloads](https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-whql-windows.html)

### Installation Steps

#### 1. Install Intel Graphics Drivers
1. Download the latest Intel Graphics driver
2. Run the installer as Administrator
3. Restart your computer
4. Verify installation in Device Manager

#### 2. Install Intel OpenCL Runtime
```bash
# In WSL (Ubuntu 24.04)
sudo apt-get update
sudo apt-get install -y intel-opencl-icd
```

#### 3. Verify GPU Access in WSL
```bash
# Check OpenCL availability
clinfo | grep "Platform Name"

# Check GPU devices
clinfo | grep "Device Name"

# Expected output:
# Platform Name                                Intel(R) OpenCL
# Device Name                                  Intel(R) UHD Graphics 770
```

## GPU Detection Scripts

### Automatic Detection (PowerShell)
```powershell
# detect_gpu.ps1
$gpuInfo = Get-WmiObject -Class Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion

foreach ($gpu in $gpuInfo) {
    if ($gpu.Name -match "NVIDIA") {
        Write-Host "NVIDIA GPU detected: $($gpu.Name)"
        # Run NVIDIA setup
    }
    elseif ($gpu.Name -match "Intel.*Arc") {
        Write-Host "Intel Arc GPU detected: $($gpu.Name)"
        # Run Intel Arc setup
    }
    elseif ($gpu.Name -match "Intel.*UHD|Intel.*Iris") {
        Write-Host "Intel Integrated GPU detected: $($gpu.Name)"
        # Run Intel Integrated setup
    }
}
```

### GPU Setup Scripts

#### NVIDIA Setup (setup_nvidia_gpu.sh)
```bash
#!/bin/bash
# setup_nvidia_gpu.sh

echo "Setting up NVIDIA GPU acceleration..."

# Install CUDA toolkit
sudo apt-get update
sudo apt-get install -y cuda-toolkit-12-4

# Configure environment
echo 'export CUDA_HOME=/usr/local/cuda' >> ~/.bashrc
echo 'export PATH=$PATH:$CUDA_HOME/bin' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUDA_HOME/lib64' >> ~/.bashrc

# Test GPU access
nvidia-smi

echo "NVIDIA GPU setup complete!"
```

#### Intel Arc Setup (setup_intel_arc_gpu.sh)
```bash
#!/bin/bash
# setup_intel_arc_gpu.sh

echo "Setting up Intel Arc GPU acceleration..."

# Install OpenCL runtime
sudo apt-get update
sudo apt-get install -y intel-opencl-icd

# Configure environment
echo 'export INTEL_OPENCL_CONFIG=/etc/OpenCL/vendors/intel.icd' >> ~/.bashrc

# Test GPU access
clinfo | grep "Device Name"

echo "Intel Arc GPU setup complete!"
```

#### Intel Integrated Setup (setup_intel_integrated_gpu.sh)
```bash
#!/bin/bash
# setup_intel_integrated_gpu.sh

echo "Setting up Intel Integrated GPU acceleration..."

# Install OpenCL runtime
sudo apt-get update
sudo apt-get install -y intel-opencl-icd

# Configure environment
echo 'export INTEL_OPENCL_CONFIG=/etc/OpenCL/vendors/intel.icd' >> ~/.bashrc

# Test GPU access
clinfo | grep "Device Name"

echo "Intel Integrated GPU setup complete!"
```

## Troubleshooting

### Common GPU Issues

#### GPU Not Detected in WSL
```bash
# Check WSL version
wsl --list --verbose

# Ensure WSL2 is being used
wsl --set-version Ubuntu-24.04 2

# Check GPU support
wsl --status
```

#### Driver Compatibility Issues
1. **Update Windows**: Ensure Windows 11 is fully updated
2. **Update WSL**: `wsl --update`
3. **Reinstall drivers**: Remove and reinstall GPU drivers
4. **Check compatibility**: Verify GPU supports WSL2 virtualization

#### Performance Issues
1. **Memory allocation**: Increase WSL memory in .wslconfig
2. **Processor allocation**: Allocate more CPU cores
3. **GPU memory**: Ensure sufficient GPU VRAM
4. **Background processes**: Close unnecessary applications

### GPU Status Verification

#### NVIDIA GPU
```bash
# Check GPU status
nvidia-smi

# Check CUDA availability
nvcc --version

# Test CUDA functionality
cuda-install-samples-12.4.sh ~
cd ~/NVIDIA_CUDA-12.4_Samples/1_Utilities/deviceQuery
make
./deviceQuery
```

#### Intel GPU
```bash
# Check OpenCL availability
clinfo

# Check GPU information
lspci | grep -i vga

# Test OpenCL functionality
sudo apt-get install -y ocl-icd-opencl-dev
```

## Performance Optimization

### WSL Configuration (.wslconfig)
```ini
[wsl2]
gpuSupport=true
memory=32GB
processors=16
swap=8GB
localhostForwarding=true
```

### Environment Optimization
```bash
# Add to ~/.bashrc
export CUDA_CACHE_DISABLE=0
export CUDA_CACHE_MAXSIZE=1073741824
export INTEL_OPENCL_CONFIG=/etc/OpenCL/vendors/intel.icd
```

### GPU Memory Management
- **NVIDIA**: Use `nvidia-smi` to monitor GPU memory usage
- **Intel**: Monitor through Windows Task Manager
- **Optimization**: Close unnecessary GPU applications

## Support and Resources

### Official Documentation
- [NVIDIA CUDA Documentation](https://docs.nvidia.com/cuda/)
- [Intel OpenCL Documentation](https://www.intel.com/content/www/us/en/developer/tools/opencl/overview.html)
- [Microsoft WSL GPU Support](https://docs.microsoft.com/en-us/windows/wsl/tutorials/gpu-compute)

### Community Resources
- [NVIDIA Developer Forums](https://forums.developer.nvidia.com/)
- [Intel Community Forums](https://community.intel.com/)
- [WSL GitHub Issues](https://github.com/microsoft/WSL/issues)

### Troubleshooting Tools
- **GPU-Z**: Detailed GPU information and monitoring
- **MSI Afterburner**: GPU monitoring and overclocking
- **HWiNFO**: Comprehensive system information
- **Windows Performance Monitor**: System performance analysis

---

**Last Updated**: August 7th, 2025  
**Version**: Compatible with Kamiwaza v0.5.0  
**Support**: [INSERT_SUPPORT_CONTACT] 