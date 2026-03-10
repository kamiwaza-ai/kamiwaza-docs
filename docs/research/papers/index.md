---
title: Highlights
description: Research publications and technical reports from Kamiwaza AIR
---

# Featured Publications

### How Much Do LLMs Hallucinate in Document Q&A Scenarios?

**JV Roig** | March 2026

The largest systematic study of LLM hallucination in document Q&A to date — 172 billion tokens across 35 models, three context lengths (32K/128K/200K), four temperatures, and three hardware platforms (NVIDIA H200, AMD MI300X, Intel Gaudi 3). Uses the RIKER evaluation methodology for deterministic, ground-truth-based scoring.

**Key Finding:** Even the best model fabricates at 1.19% at 32K, and no model stays under 10% at 200K. Model selection dominates all other factors (72pp accuracy range). Temperature effects are nuanced — T=0.0 is best ~60% of the time for accuracy, but higher temperatures reduce fabrication for most models and dramatically cut coherence loss (up to 48x).

📄 [Read the paper](/research/papers/riker2) | [Download PDF](/papers/riker2_2026.pdf) | [arXiv](https://arxiv.org/abs/2603.08274)

---

### RIKER: Scalable and Reliable Evaluation of AI Knowledge Retrieval Systems

**JV Roig** | December 2025

A ground-truth-first synthetic evaluation methodology for LLMs, RAG, and knowledge graphs. RIKER inverts the traditional approach—generating documents from known ground truth rather than extracting ground truth from documents—enabling deterministic scoring without human annotation and contamination resistance through regenerable corpora.

**Key Finding:** Context length claims frequently exceed usable capacity (significant degradation beyond 32K tokens), cross-document aggregation is fundamentally harder than single-document extraction, and grounding ability and hallucination resistance are distinct capabilities.

📄 [Read the paper](/research/papers/riker) | [Download PDF](/papers/riker2025.pdf)

---

### How Do LLMs Fail In Agentic Scenarios?

**JV Roig** | December 2025

A qualitative analysis of 900 execution traces from three representative models (Granite 4 Small, Llama 4 Maverick, DeepSeek V3.1) revealing how LLMs fail when operating as autonomous agents. Rather than aggregate scores, this study surfaces the behavioral strategies that enable success and the recurring failure modes that undermine reliability.

**Key Finding:** Recovery capability—not initial correctness—best predicts overall success. Four failure archetypes emerge across all models: premature action without grounding, over-helpfulness under uncertainty, context pollution vulnerability, and fragile execution under load.

📄 [Read the paper](/research/papers/llm-agentic-failures) | [Download PDF](/papers/How_do_LLMs_fail_in_agentic_scenarios.pdf)

---

### KAMI v0.1: Enterprise-Relevant Agentic AI Benchmark

**JV Roig** | October 2025

Lessons from 5.5 billion tokens' worth of agentic AI evaluations showing traditional benchmarks fail to predict real-world performance. Through massive-scale testing of 35 model configurations using the PICARD framework, we demonstrate that models ranking high on traditional benchmarks often fail at practical enterprise tasks.

**Key Finding:** Traditional benchmark rankings fail to predict enterprise task performance, even tool-calling benchmarks like BFCLv3 or TAU2-Bench, or even aggregated benchmarks. Benchmarking is not enough - **simulation** is what is needed.


📄 [Read the paper](/research/papers/kami-v0-1) | [Download PDF](/papers/KAMI_v0_1.pdf)

---

### PICARD: Testing What Models Can Do, Not What They've Seen

**JV Roig** | July 2025

A framework for contamination-resistant LLM evaluation through multi-layered randomization. PICARD creates over 10^80 unique test configurations—more than atoms in the observable universe—making memorization impossible while testing real-world agentic tasks like file manipulation, database operations, and multi-step workflows.

**Key Innovation:** Unlike static benchmarks that models can memorize, PICARD generates unique test instances every time while maintaining deterministic scoring and statistical validity. Extends beyond math to complex enterprise scenarios.

📄 [Read the paper](/research/papers/picard) | [Download PDF](/papers/picard_paper.pdf) | [GitHub](https://github.com/jvroig/picard)
