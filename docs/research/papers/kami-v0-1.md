---
title: "KAMI v0.1: Enterprise-Relevant Agentic AI Benchmark"
description: Lessons from 5.5 billion tokens' worth of agentic AI evaluations showing traditional benchmarks fail to predict real-world performance
---

# Towards a Standard, Enterprise-Relevant Agentic AI Benchmark

**Authors:** JV Roig
**Published:** 2025 (Technical Report)
**Affiliations:** Kamiwaza AI

---

## About This Paper

Traditional LLM benchmarks are broken for enterprise AI deployment. They suffer from data contamination (models memorize test answers) and fail to measure what actually matters: can the AI agent reliably handle mundane enterprise tasks like analyzing CSVs, querying databases, and managing files?

We introduce **KAMI v0.1** (Kamiwaza Agentic Merit Index), a contamination-resistant benchmark focused on real-world enterprise scenarios. Through massive-scale testing—170,000+ test items processing over 5.5 billion tokens across 35 model configurations—we discovered something surprising: **models that rank high on traditional benchmarks often fail at practical enterprise tasks**.

For example, Llama 3.1 70B scored near-bottom on TAU2-Bench but achieved 73.4% on KAMI v0.1 (top tier performance). Claude 3.5 Haiku ranked second-worst in AAII but performed near the top in our benchmark. Newer generation models like Qwen 3 and Llama 4 didn't always outperform their older variants on enterprise tasks, contradicting what traditional benchmarks suggest.

**Key Achievements:**
- **Contamination-resistant evaluation** using randomized test generation (PICARD framework)
- **170,000+ test items** across 35 model configurations, processing 5.5 billion tokens
- **Demonstrated "agentic disconnect"** between traditional benchmark rankings and practical performance
- **Real-world deployment insights** on cost-performance tradeoffs, quantization effects, and reasoning model efficiency
- **Reliability metrics** tracking consistency across runs—critical for enterprise decisions

**Why This Matters:**

If you're selecting AI models for production deployment, traditional benchmarks may lead you to the wrong choice. KAMI v0.1 shows that smaller, cheaper models can outperform larger ones on specific enterprise tasks, and that reasoning models' 10-14x token cost may not justify their accuracy gains for routine work. This benchmark helps enterprises make evidence-based model selection decisions aligned with actual deployment scenarios.

---

## Abstract

Enterprise adoption of agentic AI systems requires reliable evaluation methods that reflect real-world deployment scenarios. Traditional LLM benchmarks suffer from training data contamination and fail to measure agentic capabilities such as multi-step tool use and decision-making under uncertainty. We present the Kamiwaza Agentic Merit Index (KAMI) v0.1, an enterprise-focused benchmark that addresses both contamination resistance and agentic evaluation. Through 170,000 LLM test items processing over 5.5 billion tokens across 35 model configurations, we demonstrate that traditional benchmark rankings poorly predict practical agentic performance. Notably, newer generation models like Llama 4 or Qwen 3 do not always outperform their older generation variants on enterprise-relevant tasks, contradicting traditional benchmark trends. We also present insights on cost-performance tradeoffs, model-specific behavioral patterns, and the impact of reasoning capabilities on token efficiency—findings critical for enterprises making deployment decisions.

---

## Downloads & Resources

📄 **[Download PDF](/papers/KAMI_v0_1.pdf)** (272 KB)

🔗 **Additional Links:**
- Data availability: Test suite definitions and evaluation code (repository URL to be announced)
- [PICARD Framework](/research/papers/picard) - Contamination-resistant evaluation methodology
- Model Context Protocol (MCP): https://modelcontextprotocol.io/docs/getting-started/intro

---

## Key Findings

### The "Agentic Disconnect"

Traditional benchmark rankings fail to predict enterprise task performance:
- **Llama 3.1 70B**: Near-bottom on TAU2-Bench → 73.4% on KAMI v0.1 (top tier)
- **Claude 3.5 Haiku**: Second-worst in AAII → Near-top on KAMI v0.1
- **Qwen3 models**: Superior traditional scores → Underperformed older Qwen2.5 72B on enterprise tasks
- **Llama 3.1 8B**: Catastrophically failed nearly all agentic tasks (10.5% accuracy)

### Best Performing Models

- **Qwen3 235B-A22B Instruct 2507**: 88.8% pooled accuracy (best overall)
- **Qwen3 14B**: Consistently outperformed the larger 32B variant
- **Llama 4 Maverick**: 74.6% despite poor TAU2 scores

### Reasoning Model Tradeoffs

- **Accuracy gains**: 12-15 percentage points for small models, smaller for large models
- **Cost penalty**: 10-14x more output tokens, 4-6x longer wall-time
- **Verdict**: Generally not justified for routine enterprise tasks

### Quantization Effects (FP8)

Results are model-specific, not universally positive:
- Qwen3 14B and 32B: Slightly improved
- Llama 3.3 70B: FP8 outperformed full precision
- Llama 4 Maverick: FP8 underperformed full precision

---

## Compute Resources

- **32 AMD MI300X GPUs** (4 servers)
- **8 Intel Gaudi 3 accelerators** (1 server)
- **Anthropic API access**
- **Total computation**: 3,541 hours (147 days compressed to ~2 weeks via parallel execution)

---

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

---

## Topics Covered

- Agentic AI evaluation
- Benchmark contamination resistance
- Enterprise AI deployment
- Multi-step tool use
- Cost-performance analysis
- Model quantization (FP8)
- Reasoning model efficiency
- Database querying (SQLite)
- CSV data processing
- File system operations
