---
title: "How Much Do LLMs Hallucinate in Document Q&A Scenarios?"
description: "A 172-billion-token study across temperatures, context lengths, and hardware platforms revealing fabrication rates, temperature effects, and the grounding-fabrication distinction."
image: /img/research/riker2_paper_ogcard.png
---

# How Much Do LLMs Hallucinate in Document Q&A Scenarios? A 172-Billion-Token Study Across Temperatures, Context Lengths, and Hardware Platforms

**Authors:** JV Roig
**Published:** March 2026

---

## Abstract

How much do large language models actually hallucinate when answering questions grounded in provided documents? Despite the critical importance of this question for enterprise AI deployments, reliable measurement has been hampered by benchmarks that rely on static datasets vulnerable to contamination, LLM-based judges with documented biases, or evaluation scales too small for statistical confidence. We address this gap using RIKER, a ground-truth-first evaluation methodology that enables deterministic scoring without human annotation. Across 35 open-weight models, three context lengths (32K, 128K, and 200K tokens), four temperature settings, and three hardware platforms (NVIDIA H200, AMD MI300X, and Intel Gaudi 3), we conducted over 172 billion tokens of evaluation - an order of magnitude beyond prior work. Our findings reveal that: (1) even the best-performing models fabricate answers at a non-trivial rate - 1.19% at best at 32K, with top-tier models at 5-7% - and fabrication rises steeply with context length, nearly tripling at 128K and exceeding 10% for all models at 200K; (2) model selection dominates all other factors, with overall accuracy spanning a 72-percentage-point range and model family predicting fabrication resistance better than model size; (3) temperature effects are nuanced - T=0.0 yields the best overall accuracy in roughly 60% of cases, but higher temperatures reduce fabrication for the majority of models and dramatically reduce coherence loss (infinite generation loops), which can reach 48x higher rates at T=0.0 versus T=1.0; (4) grounding ability and fabrication resistance are distinct capabilities - models that excel at finding facts may still fabricate facts that do not exist; and (5) results are consistent across hardware platforms, confirming that deployment decisions need not be hardware-dependent.

## Why This Matters

This is our largest systematic study of LLM hallucination in document Q&A to date — 172 billion tokens across 4,264 runs. If you're deploying LLMs for document-grounded tasks, the findings have direct implications:

- **No model is hallucination-free** - Even the best model at short context (GLM 4.5) fabricates at 1.19% at 32K; at 200K, even the best model at long context (Qwen3 Next 80B-A3B) hits 10%
- **Model selection matters most** - A 72-percentage-point accuracy range means picking the right model dwarfs all other optimization efforts
- **Temperature is not one-size-fits-all** - T=0.0 is best for accuracy ~60% of the time, but higher temperatures reduce fabrication in the majority of models and dramatically reduce coherence loss
- **Grounding and fabrication resistance are distinct skills** - Some models excel at finding facts but still fabricate non-existent ones (e.g., Llama 3.1 70B: 90% grounding, 50% fabrication)
- **Hardware doesn't matter** - Results are consistent across NVIDIA H200, AMD MI300X, and Intel Gaudi 3 (mean delta = 0.58pp)

## Downloads & Resources

📄 **[Download PDF](/papers/riker2_2026.pdf)**

🔗 **Additional Links:**
- arXiv: [arxiv.org/abs/2603.08274](https://arxiv.org/abs/2603.08274)
- Data availability: [docs.kamiwaza.ai/research/datasets](/research/datasets)
- [RIKER Methodology](/research/papers/riker) - The evaluation methodology used in this study
- [PICARD Framework](/research/papers/picard) - Related contamination-resistant evaluation methodology

## Citation

If you use this work in your research, please cite:

```bibtex
@article{roig2026hallucinate,
  title={How Much Do LLMs Hallucinate in Document Q\&A Scenarios? A 172-Billion-Token Study Across Temperatures, Context Lengths, and Hardware Platforms},
  author={Roig, JV},
  year={2026},
  eprint={2603.08274},
  archivePrefix={arXiv},
  primaryClass={cs.CL},
  url={https://arxiv.org/abs/2603.08274}
}
```

## Related Work

- [RIKER](/research/papers/riker) - The evaluation methodology and original 21B-token study
- [KAMI v0.1](/research/papers/kami-v0-1) - Enterprise-relevant agentic AI benchmark
- [How Do LLMs Fail In Agentic Scenarios?](/research/papers/llm-agentic-failures) - Qualitative analysis of LLM failure modes
- [PICARD](/research/papers/picard) - Contamination-resistant evaluation framework
