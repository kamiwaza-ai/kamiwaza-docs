---
title: "Hallucination Resistance Holds at 64K and 128K Context"
description: "We pushed our Granite 4.0 Micro LoRA from 32K to 64K and 128K context. Hallucination resistance transferred. Extraction didn't. Here's what that means."
image: /img/research/blog_hallucination-resistance-long-context-ogcard.png
---

# Hallucination Resistance Holds at 64K and 128K Context

**Author:** JV Roig
**Published:** Tuesday, February 18, 2026

---

**TL;DR:** We took the same LoRA-finetuned Granite 4.0 Micro from [our earlier experiment](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning) and tested it at 64K and 128K context — 4x to 16x longer than anything it saw during training. Hallucination resistance held up well (92% at 32K → 88% at 64K → 83% at 128K). Extraction accuracy did not (68% → 24% → 27%). The model learned *"don't make things up"* as a general principle that survives extreme context scaling. It did not learn *"find the answer in a much bigger haystack."*

---

## Quick Recap

In our [previous article](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning), we LoRA-finetuned IBM Granite 4.0 Micro (3B dense) on ~1,100 lease contract examples at 8K-16K context, then tested at 32K against three document types — including two the model had never seen. The results were striking: hallucination resistance jumped from 16% to 92%, information extraction improved from 48% to 68%, and the gains generalized across document types. (Check out the previous article for the specifics of the training dataset)

But 32K is only 2-4x the training context. What happens when you really push it?

## Extending to 64K and 128K

We generated larger [RIKER](/research/papers/riker) test sets at 64K and 128K context and ran the same finetuned model through them. Same three document types, same balanced mix of hallucination and extraction questions. The only thing that changed was the size of the haystack.

Here's what happened:

### Overall Results

| Metric | 32K | 64K | 128K |
|--------|-----|-----|------|
| **Overall Accuracy** | 80.0% | 56.0% | 54.7% |
| **Hallucination Resistance** | 92.0% | 88.0% | 82.7% |
| **Information Extraction** | 68.0% | 24.0% | 26.7% |
| **F1 Score** | 78.2 | 37.7 | 40.4 |

Two very different stories in one table.

### Hallucination Resistance: Still Standing

| Document Type | 32K | 64K | 128K |
|---------------|-----|-----|------|
| Field Reports | 84% | 92% | 72% |
| HR Evaluations | 96% | 80% | 88% |
| Lease Contracts | 96% | 92% | 88% |

At 32K, the finetuned model resisted hallucination 92% of the time overall. At 64K, it still resisted 88%. At 128K — where the prompt is 8-16x longer than anything in training — it still held at 83%.

Lease contracts (the trained document type) stayed strong throughout: 96% → 92% → 88%. The unseen document types showed more variation — field reports actually *improved* at 64K before dipping at 128K, while HR evaluations dipped at 64K but recovered at 128K. But the pattern is clear: the model consistently refuses to fabricate answers, even when drowning in context.

### Extraction: The Cliff

| Document Type | 32K | 64K | 128K |
|---------------|-----|-----|------|
| Field Reports | 60% | 16% | 16% |
| HR Evaluations | 56% | 16% | 40% |
| Lease Contracts | 88% | 40% | 24% |

This is the other side of the coin. Extraction falls off a cliff between 32K and 64K. Lease contracts — the document type the model trained on — go from 88% to 40%. Field reports crater to 16% and stay there.

## What's Next

As we explained in the previous blog post, we purposely gimped the training data set: short training context, single document type, small dataset. We wanted to isolate whether the learned principle of *"don't hallucinate"* transfers across context lengths and generalizes. It does. 

The obvious next step is training with longer context data. RIKER can generate training examples at any context length, so if we train with longer-context examples, we expect extraction performance at those context lengths to improve while maintaining the hallucination resistance we've already established. We're working on this now, along with testing whether larger models push the extraction cliff further out.

Early signs from our ongoing experiments suggest larger models do help — but that's a story for another post.

## Methodology Note

All evaluations used [RIKER](/research/papers/riker)-generated test sets at 64K and 128K context lengths, with the same balanced question design (hallucination resistance + information extraction) across three document types. The finetuned model is the same IBM [Granite 4.0 Micro](https://huggingface.co/ibm-granite/granite-4.0-micro) LoRA from our [original experiment](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning). Inference was run at temperature 0.0 for deterministic output.

---

*This is a follow-up to [Can We Reduce LLM Hallucinations for Enterprise Use?](/research/blogs/reducing-llm-hallucinations-enterprise-lora-finetuning). For the full RIKER methodology, see our [RIKER paper](/research/papers/riker).*
