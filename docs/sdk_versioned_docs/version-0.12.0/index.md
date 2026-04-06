---
sidebar_position: 1
---

# Kamiwaza SDK

The Kamiwaza SDK provides a Python interface to interact with the Kamiwaza AI Platform.

## Installation

```bash
pip install kamiwaza-sdk
```

Install the package as `kamiwaza-sdk` and import it in Python as `kamiwaza_sdk`.

## Quick Start

```python
from kamiwaza_sdk import KamiwazaClient

# Initialize the client for your Kamiwaza environment
client = KamiwazaClient("https://your-kamiwaza.example/api")

# List deployments
deployments = client.serving.list_deployments()
for deployment in deployments:
    print(f"Deployment: {deployment}")
```
