---
title: "The Tokenizer Tax: The Same Text Can Cost 26% More on Some Models"
description: "We fed identical text to 10 model families and counted tokens. The differences are bigger than you'd expect, and they compound at scale."
image: /img/research/blog_embedding_efficiency_ogcard.png
---

# The Tokenizer Tax: The Same Text Can Cost 26% More on Some Models

**Author:** JV Roig
**Published:** Thursday, April 17, 2026

---

**TL;DR:** We tokenized the same corpus across 10 model families. MiniMax M2 is the most efficient, GPT-5.4 is close behind, and Gemma 4 uses 26% more tokens than the baseline for the exact same text. For long-context workloads, this tokenizer difference is a significant hidden dimension affecting workload estimation and cost analysis.

---

I was running [RIKER](/research/papers/riker) long-context benchmarks for GPT 5.4 when something caught my eye: its reported context-length token count was WAY LESS than I assumed it would be. As an advanced, frontier-level model, I assumed it would (by now) be far more "dense" / verbose than the old faithful Llama 3 tokenizer.

That the tokenization from different models differs is NOT surprising. What was surprising was how vast the differences can be. 1-2% is just *"whatever, no one cares"*. But 30%? Now that's a dimension that needs to be factored in when doing cost analysis and workload estimation.

## Text-to-token count differences

Using Llama 3 as baseline (call me nostalgic for the good old days when Meta's LLMs mattered and moved the needle):

| Tokenizer Family | Prompt Tokens | vs Llama 3 |
|---|---:|---|
| MiniMax M2 | 25,498 | -4.3% |
| Llama 4 | 25,919 | -2.7% |
| GPT-5.4 | 25,998 | -2.4% |
| Granite 4 | 26,634 | -0.0% |
| **Llama 3.x (baseline)** | **26,647** | **0.0%** |
| GLM 4.x | 26,689 | +0.2% |
| DeepSeek V3 | 26,764 | +0.4% |
| Qwen2.5 / Qwen3 | 28,733 | +7.8% |
| Qwen3.5 | 29,307 | +10.0% |
| Gemma 4 | 33,570 | +26.0% |

This is for our 32K RIKER corpus (composed of lease documents, field reports, and HR records). The pattern holds at larger scales too:

| Model | 32K corpus | 128K corpus | 200K corpus |
|---|---:|---:|---:|
| GPT-5.4 | 25,998 | 93,639 | 166,584 |
| Qwen3.5 | 29,307 | 105,282 | 186,597 |
| Gemma 4 | 33,570 | 119,548 | 210,922 |


## Why This Matters

### Cost and latency at scale

Gemma 4's +26% is a solid outlier in the absolute scale of tokenizer efficiency. That's the kind of gap you definitely feel in large-scale production settings.

If you're paying per-token (API pricing), a 26% token overhead means 26% higher input costs. For a single query, who cares. For an enterprise doing millions of queries against long documents, it can add up fast.

Even beyond API-usage-models, enterprises that host their own models are also affected. A model whose context size (in tokens) grows much faster than another model, assuming they have the same level of capability on your use cases, can change your cost estimation. Worse, if you are considering 20-30% tokenizer efficiency between models, that level of difference might actually make the less efficient model a non-starter for your workload, thanks to actual effective context budget!

### Context budget implications

Models advertise a max context length in tokens. But given what we've seen so far, we know that two models advertising the same 128 or 256K-token context window does NOT mean you can fit the same amount of *text* on either model. 

Let's take the softer case of two modern open models: Qwen3.5 and Gemma 4. Let's say you were deciding between two models: Qwen3.5 27B and Gemma 4 31B. Both are about the same size, and about the same max context length in tokens.

Gemma 4 uses about 15% more tokens on the same text (for English, at least, which was all we've tested so far). This means you don't actually have "256K tokens' worth of text" for Gemma 4, relative to Qwen3.5. Instead, you have less than 230K.

Or, think of it in human terms. If Qwen3.5's 256K tokens is about 500 documents or records from your knowledge base, for Gemma 4, that's only... 440 documents. Uh oh... now you are off by 60 documents that could fit.

### Inference speed

More tokens = more compute per query. This affects both time-to-first-token (TTFT) and total latency. A 26% token overhead translates roughly to 26% more attention computation, though in practice it's model-dependent since attention mechanisms vary.

If (like me) you just casually assumed tokenizer differences are basically a rounding error, then you might have benchmarked your models on fixed tokens instead of fixed text. Typical benchmarking for input/output TPS traditionally does fixed input/output shapes like:

- 2,048 input / 256 output (short input)
- 8,192 input / 256 output (medium input)
- 32,768 input / 256 output (long input)

And this is all fine, and lets us compare model processing speeds at fixed and fair comparison points.

Except, now that we know tokenizer efficiency can actually differ by as much as 30%... then our fixed-token benchmarks are NOT actually that realistic at times. A less efficient tokenizer would essentially make one model handle much more tokens in the real world.

So while model A (an example model with the more efficient tokenizer) processes 5,000 input TPS at 32K, and model B (with the 30% less efficient tokenizer) seems to be faster at 5,500 input TPS at 32K, their real-world speed is actually the reverse!

| | Model A (efficient) | Model B (30% less efficient) |
|---|---|---|
| Benchmark TPS (at 32K tokens) | 5,000 TPS | 5,500 TPS |
| Real-world tokens for same text | 32,000 | 41,600 (+30%) |
| Time to process same text | 6.4s | 7.6s |
| **Effective real-world TPS** | **5,000 TPS** | **~4,230 TPS** |

Model B "wins" the benchmark but loses in production. The benchmark measured tokens-per-second, but what your users actually care about is how fast their work gets done, which is a fixed amount of *human text* regardless of what the underlying model and tokenizer is. 99% of your users won't even know (or care about) what a token is, honestly.


## The Counterargument: More Tokens = More Intelligence?

Less efficient tokenizers are intentionally using finer-grained tokens to capture more semantic information, which is a deliberate tradeoff of efficiency for intelligence. More token density = better representation of meaning, which can contribute to "more intelligence".

That discussion is super nuanced, though. GPT-5.4, for example, is a counter-example. It's a clearly frontier-level model, and yet also has one of the most efficient tokenizers.

That said, Gemma 4's tokenizer probably *is* optimized for something (multilingual coverage, code representation, etc.), and the extra tokens might pay off in other benchmarks. But for English document understanding, it just seems like pure overhead.

## Methodology

All measurements are from actual RIKER benchmark runs where we log prompt token counts reported by the inference engine (vLLM or the model's native API). Same corpus, same system prompt structure, same question. The only variable is the model's tokenizer.

The corpus is a set of synthetic but realistic business documents (leases, field reports, HR evaluations) concatenated into knowledge bases of approximately 32K, 128K, and 200K tokens.

Token counts come from `usage.prompt_tokens` in the API response, which reflects the model's actual tokenization, not an external estimate.

---

*For more on our long-context evaluation methodology, see the [RIKER paper](/research/papers/riker). For a larger, more comprehensive study using RIKER, see [RIKER2](/research/papers/riker2).*
