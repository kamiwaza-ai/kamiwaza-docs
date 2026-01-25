---
sidebar_position: 5
---

# Deploying Models in Novice Mode

Novice mode is Kamiwaza's default deployment mode designed to simplify the model deployment experience for new users and common use cases.

## What is Novice Mode?

Novice Mode is the default, streamlined experience for selecting and deploying models. It uses a curated Model Guide to suggest strong defaults for common tasks and automatically picks a platform‑appropriate variant (GPU, Mac, or CPU) with sensible settings so you can deploy quickly without deep configuration.

## Key Features

- **Curated recommendations**: Short, high‑quality list with clear descriptions, use cases, and scores.
- **Platform‑aware variants**: Automatically selects the right build for your hardware with VRAM guidance.
- **One‑click deploy**: Starts a model server with good defaults for context length and KV cache.
- **Safe defaults**: Minimal choices up front; advanced options are hidden by default.
- **Easy exit ramp**: Switch to Advanced Mode any time for full control.

## Getting Started

1. Open the Models page in the Kamiwaza UI (Novice Mode is on by default for new users).
2. Browse the recommended list and pick a model that matches your task (chat, coding, reasoning, etc.).
3. Review the suggested variant for your hardware and click Deploy.
4. Test the endpoint or open the built‑in chat to verify it’s running.
5. If the catalog looks empty or outdated, refresh the page or restart the server to reload the guide.

## When to Use Novice Mode

- **Fast start** without learning every configuration knob
- **Standard workflows**: general chat, coding help, reasoning, data analysis
- **Limited hardware**: laptops, single‑GPU boxes, or CPU‑only environments
- **Demos/classrooms** where reliability and simplicity matter

## Advanced Configuration

Need more control? Switch to Advanced Mode from settings to customize deployment parameters (quantization, memory, batching, prompt formatting, and more). Helpful guides:

- [Deploying Models](./deployment.md)
- [Downloading Models](./downloading-models.md)
- [GUI Walkthrough](./gui-walkthrough.md)