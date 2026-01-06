---
sidebar_position: 1
---

# Kamiwaza SDK

The Kamiwaza SDK provides a Python interface to interact with the Kamiwaza AI Platform.

## Installation

```bash
pip install kamiwaza-client
```

## Quick Start

```python
from kamiwaza_client import KamiwazaClient

# Initialize the client for local development
client = KamiwazaClient("http://localhost:7777/api/")

# List deployments
deployments = client.serving.list_deployments()
for deployment in deployments:
    print(f"Deployment: {deployment}")
```
