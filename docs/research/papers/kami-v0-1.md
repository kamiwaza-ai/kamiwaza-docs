---
title: "KAMI v0.1: Enterprise-Relevant Agentic AI Benchmark"
description: Lessons from 5.5 billion tokens' worth of agentic AI evaluations showing traditional benchmarks fail to predict real-world performance
image: /img/research/kami_v01_paper_ogcard.png
---

# Towards a Standard, Enterprise-Relevant Agentic AI Benchmark

**Lessons from 5.5 billion tokens' worth of agentic AI evaluations**

**Authors:** JV Roig
**Published:** Oct 2025

---


## Abstract

Enterprise adoption of agentic AI systems requires reliable evaluation methods that reflect real-world deployment scenarios. Traditional LLM benchmarks suffer from training data contamination and fail to measure agentic capabilities such as multi-step tool use and decision-making under uncertainty. We present the Kamiwaza Agentic Merit Index (KAMI) v0.1, an enterprise-focused benchmark that addresses both contamination resistance and agentic evaluation. Through 170,000 LLM test items processing over 5.5 billion tokens across 35 model configurations, we demonstrate that traditional benchmark rankings poorly predict practical agentic performance. Notably, newer generation models like Llama 4 or Qwen 3 do not always outperform their older generation variants on enterprise-relevant tasks, contradicting traditional benchmark trends. We also present insights on cost-performance tradeoffs, model-specific behavioral patterns, and the impact of reasoning capabilities on token efficiency—findings critical for enterprises making deployment decisions.


## Why This Matters

If you're selecting AI models for production deployment, traditional benchmarks may lead you to the wrong choice. KAMI v0.1 shows that smaller, cheaper models can outperform larger ones on specific enterprise tasks, and that reasoning models' 10-14x token cost may not justify their accuracy gains for routine work. This benchmark helps enterprises make evidence-based model selection decisions aligned with actual deployment scenarios.

## Downloads & Resources

📄 **[Download PDF](/papers/KAMI_v0_1.pdf)** (272 KB)

🔗 **Additional Links:**
- Data availability: Test suite definitions and evaluation code to be released at [docs.kamiwaza.ai/research/datasets](/research/datasets)
- [PICARD Framework](/research/papers/picard) - Contamination-resistant evaluation methodology

## Citation

If you use this work in your research, please cite:

```bibtex
@techreport{roig2025kami,
  title={Towards a Standard, Enterprise-Relevant Agentic AI Benchmark: Lessons from 5.5 billion tokens' worth of agentic AI evaluations},
  author={Roig, JV},
  institution={Kamiwaza AI},
  year={2025},
  url={https://docs.kamiwaza.ai/research/papers/kami-v0-1}
}
```