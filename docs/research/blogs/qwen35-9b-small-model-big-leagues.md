---
title: "A 9B Model Just Crashed the Big Leagues"
description: "Qwen3.5-9B scores 88.1% on our KAMI agentic benchmark — matching models 10-75x its size. The small model revolution isn't coming. It's here."
image: /img/research/blog_qwen35-9b-small-model-big-leagues-ogcard.png
---

# A 9B Model Just Crashed the Big Leagues

**Author:** JV Roig
**Published:** Wednesday, March 5, 2026

---

**TL;DR:** Qwen3.5-9B just scored 88.1% on our KAMI agentic benchmark — a bracket previously reserved for 70B+ dense models, 200B+ MoEs, and flagship cloud APIs. A model you can run on a single consumer GPU now performs alongside DeepSeek V3.1 (671B) and GPT-5 Mini. The implications for enterprise agentic AI are massive.

---

## The Big Boy Club

On the [KAMI leaderboard](/research/agentic-merit-index) — our benchmark for agentic AI performance on typical enterprise tasks — the 80-90% accuracy bracket has always been an exclusive club. To get in, you needed serious hardware and serious parameters. Here's an illustrative snippet:

| Model | Size | KAMI Score |
|-------|------|-----------|
| Gemini 2.5 Pro | Large (API) | 83.9% |
| MiniMax M2.1 | Large (API) | 85.9% |
| GPT-5 Mini (MedReason) | Unknown (API) | 86.2% |
| Gemini 3 Pro | Large (API) | 87.9% |
| GLM-4.5 | Large | 88.1% |
| Qwen3-235B (FP8) | 235B MoE (22B active) | 88.8% |
| DeepSeek V3.1 | 671B MoE | 88.9% |
| Claude Sonnet 4.5 | Unknown (API) | 89.6% |
For the full leaderboard, see: [KAMI Leaderboard](https://docs.kamiwaza.ai/papers/kami_leaderboard.html)


Every model in this range is either a massive MoE with hundreds of billions of parameters, or a proprietary API from a frontier lab.

## Then Qwen3.5 Showed Up

The latest generation of Alibaba Cloud's Qwen family — Qwen3.5 — just swept into the KAMI leaderboard. Here's what the family looks like:

| Model | Total Params | Active Params | KAMI Score |
|-------|-------------|---------------|-----------|
| Qwen3.5-397B-A17B | 397B | 17B | **90.8%** |
| **Qwen3.5-9B** | **9B** | **9B (dense)** | **88.1%** |
| Qwen3.5-35B-A3B | 35B | 3B | **87.4%** |

All three are in the elite bracket. But look at that middle row. **A 9B dense model at 88.1%.** That's the same score as GLM-4.5, higher than GPT-5 Mini, and within striking distance of Claude Sonnet 4.5.

## Size Perspective

To appreciate how far out of its weight class this model is punching, compare it to what other small models score on KAMI:

| Model | Size | KAMI Score |
|-------|------|-----------|
| **Qwen3.5-9B** | **9B** | **88.1%** |
| Qwen3-14B (Think) | 14B | 69.1% |
| Qwen2.5-14B | 14B | 66.6% |
| Qwen3-8B (Think) | 8B | 62.5% |
| Qwen3-4B | 4B | 59.9% |
| Qwen2.5-7B | 7B | 41.6% |
| Llama 3.1-8B | 8B | 10.5% |

The previous best sub-15B model on KAMI scored 69.1%. Qwen3.5-9B leapfrogged that by **19 points** — jumping from "moderate" straight into "elite."

## Why This Matters for Enterprise

NVIDIA published a research paper in mid-2025 arguing that [small language models are the future of enterprise agentic AI](https://arxiv.org/abs/2506.02153). Their core thesis: most agentic tasks are specialized and repetitive — they don't need 200B+ parameter models. They need fast, efficient, task-capable ones.

Our KAMI benchmark results for Qwen3.5 9B support this position. What was a forward-looking position paper is now a **practical reality — and a practical necessity**. When a 9B model can become your go-to autonomous sub-agent in large-scale enterprise-level agentic AI orchestration, then it isn't just a nice option - it's now basically something you HAVE to adopt as a huge potential improvement in both UX and economics.

### The Double Benefit of "Smaller and Faster"

When a 9B model matches the agentic capability of 200B+ models, "smaller and faster" delivers a one-two punch for enterprises:

**1. Easier to host and scale.** A 9B model fits comfortably in a single GPU's memory. No multi-GPU tensor parallelism, no expensive 8-way setups. You can run multiple instances on hardware that would barely host one copy of a 235B model. Infrastructure costs drop dramatically, and scaling becomes straightforward.

**2. Better user experience.** Smaller models generate tokens much faster. In agentic systems where an AI agent may need to make multiple sequential tool calls, each response latency compounds. Cutting per-response latency transforms the end-user experience from "waiting for AI" to "AI just works."

These benefits compound. Lower memory means more instances. More instances means higher throughput. Higher throughput means more users served. Faster inference means each user gets a better experience. It's a virtuous cycle that starts with the model being small enough to be practical.

### What This Means in Practice

Tasks that previously *required* a 70B+ dense model or a 200B+ MoE to achieve acceptable quality in agentic workflows can now be handled by a 9B model with **comparable quality** - and out of the box at that, no enterprise fine-tuning required.

For agentic architectures that use sub-agents for specialized tasks, this is transformative. Your orchestrator can remain a frontier model for complex planning, while the workers that do the heavy lifting of reading documents, calling APIs, and extracting data can be much much smaller, faster, and local, without some of the fine-tuning requirements that were sometimes needed to make a specialized small model effective previously. 

## Methodology Note

These results come from [KAMI (Kamiwaza Agentic Merit Index)](/research/agentic-merit-index), our benchmark for evaluating agentic AI capabilities on enterprise tasks. KAMI tests multi-turn conversations with tool use across 19 question templates spanning 7 task categories, with 30 samples per template for statistical significance. Each model is tested across 8 runs to ensure reliable scoring.

All Qwen3.5 models were tested on AMD MI300X GPUs, self-hosted, using full-precision weights. Cloud API models were tested through their respective provider endpoints. Scores represent mean accuracy across runs with Wilson confidence intervals computed for statistical rigor.

---

*For live rankings, visit the [KAMI Leaderboard](/research/agentic-merit-index). For methodology details, see the [KAMI paper](/research/papers/kami-v0-1).*
