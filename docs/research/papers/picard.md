---
title: "PICARD: Testing What Models Can Do, Not What They've Seen"
description: A framework for contamination-resistant LLM evaluation through multi-layered randomization and agentic task assessment
---

# Testing What Models Can Do, Not What They've Seen: PICARD

**Probing Intelligent Capabilities via Artificial Randomized Data**

**Authors:** JV Roig
**Published:** July 2025 (Technical Report)
**Affiliations:** Metro Manila, Philippines

---

## Abstract

As large language model training datasets absorb popular benchmarks, evaluation increasingly measures memorization rather than genuine capability. Static benchmarks become unreliable when test questions inevitably appear in training corpora, leading to inflated performance scores that misrepresent actual problem-solving ability. I introduce PICARD (Probing Intelligent Capabilities via Artificial Randomized Data), a framework that generates unique test instances through multi-layered systematic randomization while retaining deterministic scoring and statistical validity for model comparison. PICARD prevents memorization by creating combinatorially vast question spaces—well over 10^80 unique test configurations for modest complexity scenarios, more combinations than atoms in the observable universe—making comprehensive memorization computationally impossible. Unlike existing dynamic evaluation approaches that focus on mathematical reasoning, PICARD extends to complex agentic AI tasks such as file manipulation, database operations, and multi-step workflows relevant to production AI deployment. Through multi-layered randomization combining entity substitution with dynamic data generation, PICARD creates realistic, practical and real-world evaluation scenarios while guaranteeing that no model can encounter identical test instances during training and evaluation. PICARD addresses the critical challenge of trustworthy AI evaluation in an era where traditional benchmarks become increasingly compromised by training data inclusion, providing a sustainable foundation for measuring genuine agentic AI capabilities rather than memorization patterns.

## Why This Matters

If you're evaluating LLMs for production deployment, static benchmarks are measuring the wrong thing. PICARD provides a sustainable solution that measures genuine problem-solving capability instead of memorization, while testing scenarios that actually reflect how you'll use these models—as agents with tools, not as quiz-takers.

The framework revealed surprising insights: Llama 3.3 70B beat both its newer siblings and generally-superior Qwen models (89.0% vs 81.5% and 60.0%). Amazon Nova Premier unnecessarily invoked tools for trivial questions, going on elaborate explorations for simple requests. These are actionable insights impossible to get from traditional benchmark scores.

## Downloads & Resources

📄 **[Download PDF](/papers/picard_paper.pdf)** (347 KB)

🔗 **Additional Links:**
- [PICARD GitHub Repository](https://github.com/jvroig/picard) - Open-source implementation
- [KAMI v0.1 Paper](/research/papers/kami-v0-1) - Application of PICARD framework at scale


## Citation

If you use this work in your research, please cite:

```bibtex
@techreport{roig2025picard,
  title={Testing What Models Can Do, Not What They've Seen: PICARD: Probing Intelligent Capabilities via Artificial Randomized Data},
  author={Roig, JV},
  institution={Kamiwaza AI},
  year={2025},
  url={https://docs.kamiwaza.ai/research/papers/picard}
}
```

## Related Work

- [KAMI v0.1](/research/papers/kami-v0-1) - Large-scale application of PICARD framework
