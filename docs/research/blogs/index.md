---
title: Research Insights
description: In-depth technical articles and insights from Kamiwaza AIR
---

# Research Insights

Shorter, more timely and frequent research insights and perspectives from the Kamiwaza Agentic Intelligence Research team. Research insights provide a preview into our latest research findings before they are aggregated and summarized as part of future paper releases.

---

## Latest Insights

### [The Tokenizer Tax: The Same Text Can Cost 26% More on Some Models](/research/blogs/tokenizer-efficiency-hidden-cost)

*JV Roig · April 17, 2026*

[![Article cover](/img/research/blog_embedding_efficiency_ogcard.png)](/research/blogs/tokenizer-efficiency-hidden-cost)

We fed identical text to 10 model families and counted tokens. MiniMax M2 is the most efficient, GPT-5.4 is close behind, and Gemma 4 uses 26% more tokens than Llama 3 baseline for the exact same text. For long-context workloads, this tokenizer difference is a significant hidden dimension affecting workload estimation and cost analysis.

---

### [A 9B Model Just Crashed the Big Leagues](/research/blogs/qwen35-9b-small-model-big-leagues)

*JV Roig · March 5, 2026*

[![Article cover](/img/research/blog_qwen35-9b-small-model-big-leagues-ogcard.png)](/research/blogs/qwen35-9b-small-model-big-leagues)

Qwen3.5-9B scores 88.1% on our KAMI agentic benchmark — a bracket previously reserved for 70B+ dense models, 200B+ MoEs, and flagship cloud APIs. The small model revolution isn't coming. It's here.

---

### [Hallucination Resistance Holds at 64K and 128K Context](/research/blogs/hallucination-resistance-long-context)

*JV Roig · February 18, 2026*

[![Article cover](/img/research/blog_hallucination-resistance-long-context-ogcard.png)](/research/blogs/hallucination-resistance-long-context)

We pushed our LoRA-finetuned Granite 4.0 Micro from 32K to 64K and 128K context — 4-16x longer than training. Hallucination resistance held (92% → 88% → 87%). Extraction didn't. The "don't fabricate" lesson is durable; finding needles in bigger haystacks is not.

---

### [Can We Reduce LLM Hallucinations for Enterprise Use? RIKER+LoRA Says Yes](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning)

*JV Roig · February 15, 2026*

[![Article cover](/img/research/blog_halluc-granite-riker-sft-ogcard.png)](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning)

Using RIKER + LoRA SFT on IBM Granite 4.0 Micro with just ~1,100 lease contract examples boosted accuracy from 32% to 80% — and the hallucination resistance transferred to document types the model never saw during training.

---

### [Qwen3 Next 80B: The Long-Context Champion You Haven't Heard Of](/research/blogs/qwen3-next-80b-long-context-champion)

*JV Roig · January 28, 2026*

[![Qwen3 Next 80B article cover](/img/research/blog_qwen3-next-80b-ogcard.png)](/research/blogs/qwen3-next-80b-long-context-champion)

Our RIKER benchmark testing reveals Qwen3 Next 80B-A3B as the top performer at 200K context, beating models 6x its size while using only 3B active parameters. A deep dive into what makes this model special for long-context knowledge retrieval.

---

## Related Resources

- [RIKER Paper](/research/papers/riker) - Full methodology for long-context knowledge retrieval evaluation
- [KAMI Leaderboard](/research/agentic-merit-index) - Live rankings for agentic AI performance
- [Main Blog](/blog) - Articles on agentic computing, orchestration and AI platform development
