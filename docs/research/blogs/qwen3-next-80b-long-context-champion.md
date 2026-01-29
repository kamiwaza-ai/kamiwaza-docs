---
title: "Qwen3 Next 80B: The Long-Context Champion You Haven't Heard Of"
description: "Our RIKER benchmark testing reveals Qwen3 Next 80B-A3B as the top performer at 200K context, beating models 6x its size while using only 3B active parameters."
image: /img/research/blog_qwen3-next-80b-ogcard.png
---

# Qwen3 Next 80B: The Long-Context Champion You Haven't Heard Of

**Author:** JV Roig
**Published:** Wednesday, January 28, 2026

---

**TL;DR:** In our RIKER long-context knowledge retrieval benchmark, Qwen3 Next 80B-A3B (Instruct) emerged as the #1 performer at 200K context length - beating Qwen3 Coder 480B, Qwen3-235B, and Llama 4 Maverick while using only 3B active parameters.

---

## Introduction: Our Servers Did Not Get a Christmas Break

We processed about 170B (BILLION!) tokens during the Christmas break - no rest for our GPU servers. Now, while analyzing results from our December 2025 RIKER benchmark runs, one model stood out: **Qwen3 Next 80B-A3B Instruct**. This relatively small MoE - overshadowed by its larger siblings in the Qwen3 family - dominated the long-context results in ways we didn't expect.

At 200K context, it achieved:
- **82.7% overall accuracy** - 11 points ahead of the next best model
- **10.2% fabrication rate** - the only model under 15%
- **68.0% aggregation accuracy** - best multi-document reasoning

## The Numbers

We tested at 32K, 128K, and 200K context lengths, and while Qwen3 Next 80B-A3B doesn't win every category, it is always near the top.

### Overall Accuracy by Context Length

| Context | Rank | Score | Notable Competitors |
|---------|------|-------|---------------------|
| 32K | #4 / 35 | 93.9% | Behind GLM 4.5 (97.4%), Minimax M2.1 (96.0%) |
| 128K | #2 / 26 | 87.8% | Only DeepSeek V3.1 (90.5%) beats it |
| 200K | **#1** / 11 | **82.7%** | Next best: Qwen3 Coder 480B (71.7%) |

At 200K tokens of context, Qwen3 Next 80B dominates its competition that are models with 3-6x more parameters:

| Model | Params (Active) | Overall | Fabrication | Gap to Next 80B |
|-------|-----------------|---------|-------------|-----------------|
| **Qwen3 Next 80B** | 80B (3B) | **82.7%** | **10.2%** | - |
| Qwen3 Coder 480B | 480B (35B) | 71.7% | 27.5% | -11.0% |
| Qwen3-235B | 235B (22B) | 69.9% | 33.1% | -12.8% |
| Llama 4 Maverick | 400B (17B) | 61.6% | 43.3% | -21.1% |

## Why This Matters

### 1. Efficiency at Scale

Qwen3 Next 80B uses a Mixture-of-Experts (MoE) architecture with only **3B active parameters** per forward pass. This means lower inference costs than dense models and faster token generation. Yet it outperforms models that are computationally 5-10x more expensive to run.

### 2. Graceful Degradation

Most models fall apart at extreme context lengths. Qwen3 Next 80B degrades gracefully:

| Context | Fabrication Rate | Change |
|---------|------------------|--------|
| 32K | 7.0% | baseline |
| 128K | 8.0% | +1.0% |
| 200K | 10.2% | +3.2% |

Compare this to Qwen3-235B, which goes from 20% fabrication at 32K to 33% at 200K - a 13-point degradation.

### 3. Great Hallucination/Fabrication Control

At 200K context, Qwen3 Next 80B is the **only model with a fabrication rate under 15%**. The gap to #2 is massive:

| Rank | Model | Fabrication |
|------|-------|-------------|
| #1 | Qwen3 Next 80B | 10.2% |
| #2 | Qwen3-4B | 26.0% |
| #3 | Qwen3 Coder 480B | 27.5% |

That's a 16-point gap. It's in a different league.
And Qwen3-4B-Instrcut-2507 may look like a good performer here, but although it is "second" best in fabrication, its accuracy scores are terrible, so it's not much use in practice at extreme contexts.

Qwen3-Coder-480B is a good choice - it has good overall scores, and third best fabrication rate at extreme 200K context. 
But I can't imagine why one would deploy a 6x bigger model just to get worse scores overall, and almost 3x higher fabrication/hallucination rate


## Implications for Production Systems

If you're building RAG systems or document QA applications that need to handle long contexts:

1. **Don't assume bigger is better** - Qwen3 Next 80B outperforms models with 6x more parameters
2. **Test at your actual context length** - Model rankings change dramatically between 32K and 200K
3. **Watch fabrication, not just accuracy** - A model can have decent accuracy while hallucinating frequently

Qwen3 Next 80B appears specifically optimized for high-fidelity long-context retrieval. For production deployments where context length matters and hallucination is costly, this model deserves serious consideration.

## Methodology and Experiment Note

These results come from a recent [RIKER](/research/papers/riker) experiment, which uses synthetic documents generated from known ground truth to enable deterministic scoring. Testing was conducted across H200 and MI300X hardware platforms with temperatures ranging from 0.0 to 1.0. The findings reported here represent best-case performance for each model across all temperature settings.

The data here is different than the data from the original RIKER paper linked above. In our original experiment, we used smaller scale tests, no temperature variance, and fewer models. Across the Christmas holidays of 2025, we launched a much larger experiment - whereas the original RIKER had over 21B tokens processed in total, the RIKER xmas2025 experiments processed a total of 170B+ tokens.

A full paper with deeper analysis will be coming soon - consider this a small preview of some of the data we are sitting on and are actively analyzing and make sense of.

---

*This analysis is part of ongoing research at Kamiwaza AIR. For the full RIKER methodology, see our [RIKER paper](/research/papers/riker).*
