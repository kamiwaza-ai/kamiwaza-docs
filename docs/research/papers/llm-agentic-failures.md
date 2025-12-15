---
title: "How Do LLMs Fail In Agentic Scenarios?"
description: A qualitative analysis of success and failure scenarios of various LLMs in agentic simulations, identifying four recurring failure archetypes across 900 execution traces
image: /img/research/how_do_llms_fail_ogcard.png
---

# How Do LLMs Fail In Agentic Scenarios?

**A Qualitative Analysis of Success and Failure Scenarios of Various LLMs in Agentic Simulations**

**Authors:** JV Roig
**Published:** December 2025

---

## Abstract

We investigate how large language models (LLMs) fail when operating as autonomous agents with tool-use capabilities. Using the Kamiwaza Agentic Merit Index (KAMI) v0.1 benchmark, we analyze 900 execution traces from three representative models - Granite 4 Small, Llama 4 Maverick, and DeepSeek V3.1 - across filesystem, text extraction, CSV analysis, and SQL scenarios. Rather than focusing on aggregate scores, we perform fine-grained, per-trial behavioral analysis to surface the strategies that enable successful multi-step tool execution and the recurrent failure modes that undermine reliability. Our findings show that model scale alone does not predict agentic robustness: Llama 4 Maverick (400B) performs only marginally better than Granite 4 Small (32B) in some uncertainty-driven tasks, while DeepSeek V3.1's superior reliability derives primarily from post-training reinforcement learning rather than architecture or size. Across models, we identify four recurring failure archetypes: premature action without grounding, over-helpfulness that substitutes missing entities, vulnerability to distractor-induced context pollution, and fragile execution under load. These patterns highlight the need for agentic evaluation methods that emphasize interactive grounding, recovery behavior, and environment-aware adaptation, suggesting that reliable enterprise deployment requires not just stronger models but deliberate training and design choices that reinforce verification, constraint discovery, and adherence to source-of-truth data.

## Why This Matters

Understanding *how* models fail is often more important than knowing *that* they fail. While benchmark scores tell you a model achieves 75% accuracy, they tell you nothing about whether the remaining 25% of failures are random, systematic, recoverable, or catastrophic.

This qualitative analysis reveals that **recovery capability—not initial correctness—best predicts overall success**. DeepSeek V3.1's dominance stems not from never failing, but from consistently recognizing errors, diagnosing root causes, and iteratively refining its approach. This insight is critical for enterprises making deployment decisions: a model that fails gracefully and recovers reliably may be preferable to one with higher initial accuracy but brittle error handling.

### Four Failure Archetypes

Our analysis identifies recurring failure patterns that cut across model families:

1. **Premature Action Without Grounding** - Models guess schemas instead of inspecting them, leading to silent failures in multi-file or multi-table settings.

2. **Over-Helpfulness Under Uncertainty** - When faced with missing entities, models substitute "similar" alternatives rather than returning the correct answer of zero—a disaster for enterprise data integrity.

3. **Sensitivity to Context Pollution** - All models occasionally incorporate distractor data, treating irrelevant information as signal. Even DeepSeek V3.1 failed this way in 10/30 trials on distractor-heavy scenarios.

4. **Fragile Execution Under Cognitive Load** - Coherence collapse, generation loops, and tool-call formatting errors appear when models inline large data blocks or face repeated debugging cycles.

## Downloads & Resources

📄 **[Download PDF](/papers/How_do_LLMs_fail_in_agentic_scenarios.pdf)** (247 KB)

🔗 **Additional Links:**
- [KAMI v0.1 Paper](/research/papers/kami-v0-1) - The benchmark used for this analysis
- [PICARD Framework](/research/papers/picard) - Contamination-resistant evaluation methodology
- Data availability: Execution traces to be released at [docs.kamiwaza.ai/research/datasets](/research/datasets)

## Citation

If you use this work in your research, please cite:

```bibtex
@techreport{roig2025llmfailures,
  title={How Do LLMs Fail In Agentic Scenarios? A Qualitative Analysis of Success and Failure Scenarios of Various LLMs in Agentic Simulations},
  author={Roig, JV},
  institution={Kamiwaza AI},
  year={2025},
  url={https://docs.kamiwaza.ai/research/papers/llm-agentic-failures}
}
```

## Related Work

- [KAMI v0.1](/research/papers/kami-v0-1) - Enterprise-relevant agentic AI benchmark
- [PICARD](/research/papers/picard) - Contamination-resistant evaluation framework
