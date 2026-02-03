---
title: "RIKER: Scalable and Reliable Evaluation of AI Knowledge Retrieval Systems"
description: A ground-truth-first synthetic evaluation methodology for LLMs, RAG, and knowledge graphs using the Coherent Simulated Universe approach
image: /img/research/riker_paper_ogcard.png
---

# Scalable and Reliable Evaluation of AI Knowledge Retrieval Systems: RIKER and the Coherent Simulated Universe

**Authors:** JV Roig
**Published:** December 2025

---

## Abstract

Evaluating knowledge systems (LLMs, RAG, knowledge graphs, etc) faces fundamental challenges: static benchmarks are vulnerable to contamination, LLM-based judges exhibit systematic biases, and ground truth extraction requires expensive human annotation. We present RIKER (Retrieval Intelligence and Knowledge Extraction Rating), both a benchmark and a replicable methodology based on paradigm inversion - generating documents *from* known ground truth rather than extracting ground truth *from* documents. This approach enables deterministic scoring and scalable evaluation without human annotation or reference models, and contamination resistance through regenerable corpora. Our evaluation of 33 models using over 21 billion tokens reveals that context length claims frequently exceed usable capacity, with significant degradation beyond 32K tokens; cross-document aggregation proves substantially harder than single-document extraction; and grounding ability and hallucination resistance are distinct capabilities - models excelling at finding facts that exist may still fabricate facts that do not. Beyond the specific benchmark, we contribute a domain-agnostic methodology for constructing scalable and contamination-resistant evaluations wherever synthetic documents can be generated from structured ground truth.

## Why This Matters

If you're building or deploying RAG systems, knowledge graphs, or any AI system that needs to retrieve and reason over documents, traditional benchmarks may not reflect real-world performance. RIKER reveals critical insights:

- **Context length claims are misleading** - Significant degradation occurs beyond 32K tokens, regardless of advertised context windows
- **Aggregation is fundamentally harder** - Cross-document reasoning proves substantially more difficult than single-document extraction
- **Grounding and hallucination resistance are separate skills** - Models that excel at finding facts that exist may still fabricate facts that do not

The RIKER methodology also provides a replicable framework for creating your own contamination-resistant evaluations in any domain where synthetic documents can be generated from structured ground truth.

## Downloads & Resources

📄 **[Download PDF](/papers/riker2025.pdf)**

🔗 **Additional Links:**
- Data availability: [docs.kamiwaza.ai/research/datasets](/research/datasets)
- [PICARD Framework](/research/papers/picard) - Related contamination-resistant evaluation methodology

## Citation

If you use this work in your research, please cite:

```bibtex
@techreport{roig2025riker,
  title={Scalable and Reliable Evaluation of AI Knowledge Retrieval Systems: RIKER and the Coherent Simulated Universe},
  author={Roig, JV},
  institution={Kamiwaza AI},
  year={2025},
  url={https://docs.kamiwaza.ai/research/papers/riker}
}
```

## Related Work

- [KAMI v0.1](/research/papers/kami-v0-1) - Enterprise-relevant agentic AI benchmark
- [How Do LLMs Fail In Agentic Scenarios?](/research/papers/llm-agentic-failures) - Qualitative analysis of LLM failure modes
- [PICARD](/research/papers/picard) - Contamination-resistant evaluation framework
