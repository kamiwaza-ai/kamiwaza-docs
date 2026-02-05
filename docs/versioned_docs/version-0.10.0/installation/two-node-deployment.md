---
title: Two-Node Deployment (Remote GPU)
sidebar_label: Two-Node Deployment
---

# Two-Node Deployment (Remote GPU)

Kamiwaza supports a two-node topology where the control plane runs on one host and model serving containers run on a paired GPU host. This is useful for DGX Spark-style deployments and other environments where the GPU node is separate from the management node.

It is explicitly and only tested for DGX Spark or AMD Strix Halo.

## How it works

- The control plane launches and manages model serving containers on the remote GPU host over SSH.
- Model files are synchronized to the remote host using `rsync`.
- GPU inventory is collected from the paired node and used for scheduling.

## Requirements

- SSH access from the control-plane host to the GPU host
- Docker installed on the GPU host
- Network connectivity between hosts for model sync and container lifecycle

## Configuration

Set the following environment variables on the control-plane host in the `env.sh` file post-installation and restart services:

| Variable | Description | Example |
| --- | --- | --- |
| `KAMIWAZA_PAIRED_NODE` | Hostname or IP of the GPU node | `10.0.0.25` |
| `KAMIWAZA_PAIRED_USER` | SSH username | `kamiwaza` |
| `KAMIWAZA_PAIRED_KEY` | SSH private key path | `/etc/kamiwaza/ssl/cluster.key` |
| `KAMIWAZA_PAIRED_MODELS_ROOT` | Model storage path on GPU host | `/opt/kamiwaza/models` |
| `KAMIWAZA_PAIRED_STRICT_KNOWN_HOSTS` | Enforce SSH host key checking | `true` or `false` |

## Operational notes

- Use a dedicated SSH key with limited access to the GPU host.
- Ensure the GPU host can reach any upstream registries or artifact stores required for model deployment.
- If you rotate the SSH key or change the remote host, restart the control-plane services so the new settings take effect.

