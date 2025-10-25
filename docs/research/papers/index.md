---
title: Highlights
description: Peer-reviewed publications and technical reports from Kamiwaza AIR
---

# Featured Publications

### PICARD: Testing What Models Can Do, Not What They've Seen

**JV Roig** | July 2025

A framework for contamination-resistant LLM evaluation through multi-layered randomization. PICARD creates over 10^80 unique test configurations—more than atoms in the observable universe—making memorization impossible while testing real-world agentic tasks like file manipulation, database operations, and multi-step workflows.

**Key Innovation:** Unlike static benchmarks that models can memorize, PICARD generates unique test instances every time while maintaining deterministic scoring and statistical validity. Extends beyond math to complex enterprise scenarios.

📄 [Read the paper](/research/papers/picard) | [Download PDF](/papers/picard_paper.pdf) | [GitHub](https://github.com/jvroig/picard)

---

### KAMI v0.1: Enterprise-Relevant Agentic AI Benchmark

**JV Roig** | October 2025

Lessons from 5.5 billion tokens' worth of agentic AI evaluations showing traditional benchmarks fail to predict real-world performance. Through massive-scale testing of 35 model configurations using the PICARD framework, we demonstrate that models ranking high on traditional benchmarks often fail at practical enterprise tasks.

**Key Finding:** Traditional benchmark rankings fail to predict enterprise task performance, even tool-calling benchmarks like BFCLv3 or TAU2-Bench, or even aggregated benchmarks. Benchmarking is not enough - **simulation** is what is needed.


📄 [Read the paper](/research/papers/kami-v0-1) | [Download PDF](/papers/KAMI_v0_1.pdf)
