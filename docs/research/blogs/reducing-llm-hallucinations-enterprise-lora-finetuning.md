---
title: "Can We Reduce LLM Hallucinations for Enterprise Use? RIKER+LoRA Says Yes"
description: "LoRA finetuning IBM Granite 4.0 Micro on ~1,100 lease contract examples boosted accuracy from 32% to 80% and reduced hallucinations from 84% to 8% - with gains transferring to document types never seen during training."
image: /img/research/blog_halluc-granite-riker-sft-ogcard.png
---

# Can We Reduce LLM Hallucinations for Enterprise Use? RIKER+LoRA Says Yes

**Author:** JV Roig
**Published:** Saturday, February 15, 2026

---

**TL;DR:** We LoRA-finetuned IBM Granite 4.0 Micro (3B) to see if we can reduce its tendency to hallucinate during document Q&A. We used [RIKER](/research/papers/riker) to create a small (8-16K tokens context), focused dataset (only 1 doc type) with automatically annotated questions and answers (including questions meant to catch hallucinations), and used those for training. We then tested against a much larger and more diverse RIKER benchmark at 32K context - including two document types the model never saw during training - and found hallucination resistance jumping from 16% to 92% and information extraction improving from 48% to 68%. Every single metric improved. Nothing was sacrificed. And the hallucination resistance transferred almost perfectly to completely unseen document types.

---

## The Enterprise Hallucination Problem

Enterprises want to use LLMs for document question-answering: insurance claims, legal contracts, HR evaluations, field reports. The use case is clear. The blocker is equally clear: **hallucination**.

When a model fabricates information that isn't in the source document, it doesn't just give a wrong answer - instead, it usually gives a **confidently wrong answer**. In regulated industries, that can lead to tremendous liability.

This problem of hallucination has plagued LLMs, big and small, ever since LLMs became the hottest thing in tech. But what if targeted finetuning on a small, focused dataset could dramatically reduce hallucinations - even for document types the model has never seen?

Our [RIKER](/research/papers/riker) technology was initially created as a way to assess the reliability of knowledge retrieval systems - from pure LLMs (context-stuffing) to vector databases to knowledge graphs and ontologies. But, given its ability to produce arbitrary scale documents automatically annotated with questions and answers deterministically, could we also just use it to train LLMs to avoid hallucination during document Q&A / knowledge extraction tasks?

We tested this with IBM's [Granite 4.0 Micro](https://huggingface.co/ibm-granite/granite-4.0-micro), a 3B-parameter dense model, and the results surprised us.

## Our Experiment: Train Small, Test Big

We deliberately designed the experiment to stress-test generalization along three axes:

### The Training Data

- **Training Data Generator:** [RIKER](/research/papers/riker) - our deterministic knowledge retrieval benchmark system, redeployed for training duty to generate synthetic documents forming a coherent universe with known ground truth
- **Document type:** Lease contracts only - a single document category
- **Task balance:** Roughly 50/50 split between hallucination resistance (correctly refusing to fabricate answers) and information extraction (finding and returning the right answer)
- **Volume:** ~1,100 total training examples
- **Context size:** Half at 8K tokens, half at 16K tokens, drawn from 12 unique document sets, each doc set with ~90 questions each.

### The Test

- **Benchmark:** RIKER, using a larger and more varied test set.
- **Context size:** 32K tokens - **2-4x larger** than anything in training
- **Document types:** Three categories:
  - **Lease contracts** (seen in training)
  - **HR evaluations** (never seen in training)
  - **Field reports** (never seen in training)
- **Questions:** Balanced across all three document types, testing both hallucination resistance and information extraction

The key question: would a model trained exclusively on lease contracts at 8K-16K generalize to unseen document types at 32K?

If our training truly imparts the concept of *"don't hallucinate"*, then it **should** generalize across different doc types. If it does not, then that means we did not really teach it to avoid fabricating answers, and instead just taught it to pattern-match some detail it specifically saw in the data set.

## The Results: Across-the-Board Improvement

IBM Granite 4.0 Micro went from 32% overall accuracy to 80% - a 48-point jump. But the aggregate numbers don't tell the full story. The per-document, per-task breakdown does:

### Hallucination Resistance (higher is better)

| Document Type | In Training? | Base Model | Finetuned | Improvement |
|---------------|-------------|------------|-----------|-------------|
| Lease Contracts | Yes | 28% | 96% | **+68 points** |
| Field Reports | No | 20% | 84% | **+64 points** |
| HR Evaluations | No | 0% | 96% | **+96 points** |

The base model had **zero** hallucination resistance on HR documents - it fabricated answers to every single question. After finetuning on lease contracts alone, it correctly refused to fabricate on 96% of HR questions. It had never seen an HR document.

### Information Extraction (higher is better)

| Document Type | In Training? | Base Model | Finetuned | Improvement |
|---------------|-------------|------------|-----------|-------------|
| Lease Contracts | Yes | 56% | 88% | **+32 points** |
| Field Reports | No | 36% | 60% | **+24 points** |
| HR Evaluations | No | 52% | 56% | **+4 points** |

Every cell improved. Zero regressions. The model got better at everything - it just got *more* better at some things than others.

### The Full Picture

| Metric | Base Model | Finetuned | Change |
|--------|-----------|-----------|--------|
| Overall Accuracy | 32.0% | 80.0% | **+48.0** |
| F1 Score | 24.0 | 78.2 | **+54.2** |
| Hallucination Resistance | 16.0% | 92.0% | **+76.0** |
| Information Extraction | 48.0% | 68.0% | **+20.0** |

## Generalization Surprises

Two findings stood out:

### 1. "Don't Fabricate" Is a Transferable Principle

Hallucination resistance generalized almost perfectly across document types. The model didn't learn *"don't fabricate about lease contracts"* - it learned **"don't fabricate."** This transferred to HR evaluations (+96 points) and field reports (+64 points) with no additional training data.

This makes intuitive sense. The skill of recognizing "this information isn't in the document" is fundamentally about understanding the boundary between what's present and what's absent. That boundary-awareness is document-type-agnostic.

### 2. Extraction Is Structural, Hallucination Resistance Is Principled

Information extraction improved everywhere, but the gains were heavily skewed toward the trained document type:

- **Lease contracts (trained):** +32 points
- **Field reports (unseen):** +24 points
- **HR evaluations (unseen):** +4 points

Extraction requires understanding document structure - where to find specific information, how it's formatted, what patterns indicate the right answer. This is inherently more document-specific. The model learned lease contract structure well, and some of that structural understanding transferred to field reports. HR evaluations benefited the least. *(This is very early research, and we don't really have a clear understanding yet of why the gap between FR and HR extraction is so wide.)*

The implication: **you can get hallucination resistance "for free" across document types, but extraction performance might require document-type-specific training data.** This is actually great news - it means you can prioritize your finetuning efforts on extraction quality, knowing that hallucination resistance will come along for the ride as long as you have a process - like our RIKER-enabled process - to easily scale hallucination-type training data along with your extraction training data. 

### 3. Context Length Extrapolation Worked

The model trained on 8K-16K contexts and was tested at 32K - 2-4x larger. The strong performance at 32K suggests that the finetuning didn't just memorize patterns at specific context lengths but learned generalizable retrieval behaviors.

## Why This Matters

### Small Model, Small Data, Big Impact

IBM Granite 4.0 Micro is a 3B-parameter model. Our training set was ~1,100 examples of a single document type. LoRA finetuning is lightweight - no full model retraining required. Yet the result was a 48-point accuracy improvement and a near-complete elimination of hallucinations.

For enterprises evaluating whether finetuning is worth the investment: the barrier to entry is lower than you might think.

### You Don't Need to Train on Everything

The most practical finding: **hallucination resistance transfers across document types without specific training data.** If your enterprise handles contracts, HR documents, compliance reports, and technical specifications, you don't necessarily need training examples for all four. A well-constructed finetuning dataset for one domain can provide meaningful hallucination reduction across all of them. This barrier is even lower, when you consider that out-of-the-box RIKER-generated datasets may already be enough to reduce hallucinations - but that is something that still needs more research. *(We're working on it!)* 

Extraction accuracy will still benefit from domain-specific examples, but the hardest problem - stopping the model from making things up - appears to be a generalizable skill.

### The Path Forward

These results suggest a practical enterprise finetuning strategy:

1. **Start with one well-curated document type** - get hallucination resistance across the board
2. **Add extraction examples incrementally** - target the document types where extraction accuracy is lacking.
3. **Test at production context lengths** - our results show training at shorter contexts can generalize upward

And note that our training dataset was purposely gimped for experimental purposes here, so the results here are by no means indicative of any realistic upper bound. Outside of experimental conditions, we could simply train using more examples, more data sets, more variety in doc types, and also train in much longer contexts (whatever context size best represents real-world deployment). Given how successful even this purposely-gimped training dataset was, it is highly likely that datasets without the experimental constraints we adopted here would result in even better real-world performance.


## Methodology Note

Training data sets were generated, and eval results were measured, using our [RIKER benchmark](/research/papers/riker), which generates synthetic documents from known ground truth to enable deterministic, reproducible scoring. Several unique sets were used for training. A single, larger, unique set was used for benchmarking. 

Finetuning used LoRA (Low-Rank Adaptation) - a parameter-efficient method that trains a small adapter on top of the frozen base model. The base model was [IBM Granite 4.0 Micro](https://huggingface.co/ibm-granite/granite-4.0-micro) (3B dense). All inference was conducted at temperature 0.0 for deterministic output.

---

*This analysis is part of ongoing LoRA finetuning research at Kamiwaza AIR. For the full RIKER methodology, see our [RIKER paper](/research/papers/riker).*
