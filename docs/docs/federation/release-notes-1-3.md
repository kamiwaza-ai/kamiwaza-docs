---
sidebar_position: 8
title: Federation 1.3.0 release notes
---

# Federation 1.3.0 release notes

This note records the consumer-facing authorization changes tracked by
[ENG-9924](https://linear.app/kamiwaza/issue/ENG-9924) and implemented by
[ENG-8859](https://linear.app/kamiwaza/issue/ENG-8859). The change is a
privacy boundary: a denied caller must learn that its view was filtered, but
must not learn the size of the withheld set or the policy that made the
decision.

## `gate_audit` footer compatibility

Before 1.3.0, a gated result could expose counts and the gate name:

```json
{
  "gate_audit": {
    "gate": "acme-clearance",
    "included": 4,
    "redacted": 1,
    "total": 5
  }
}
```

In 1.3.0 the four existing keys remain present for structural compatibility,
but their values are always `null`:

```json
{
  "gate_audit": {
    "filtered": true,
    "included": null,
    "redacted": null,
    "total": null,
    "gate": null
  }
}
```

`filtered` is the only disclosure signal. It is `true` when rows were withheld
or when released rows were narrowed to fewer columns. Column narrowing is not
row redaction, so it contributes zero to `redacted_count` in the counting
contract below.

The old keys are intentionally not numeric zeroes. Existing consumers that
index a key continue to receive `None`; consumers that perform arithmetic or
ordering (for example, `metadata["redacted"] > 0`) now fail with a `TypeError`
and must migrate to the released rows plus `filtered`.

### Envelope shape is seam-specific

Do not infer the shape from the runtime type. On the job-result seam,
`metadata["gate_audit"]` is a **list** with one entry per gated target. On
inline and SSE retrieval seams it is a **dict** for the current gate. This
asymmetry is retained for compatibility; branch on the API seam documented for
your client.

For chained gates, each list entry describes that gate's own input. A later
entry can therefore be `filtered: false` even when an earlier gate already
removed rows. A caller asking whether the overall view changed should read the
aggregate `metadata["filtered"]` flag, not infer it from one entry.

## GateResult counting contract

Gate authors return a `GateResult`, but the runner owns the release boundary
and validates the result before any records leave the cluster. For an input
batch of `N` records:

* `included_count == len(records)` — the records returned by the gate are the
  records released;
* `redacted_count` counts records withheld **entirely**; column narrowing is
  not counted as row redaction; and
* `included_count + redacted_count == total_count`.

Counts are converted with Python's `operator.index`, so integer-like values
such as NumPy integer scalars are accepted while floats, strings, and other
non-integral values are rejected. A gate result that violates any invariant is
replaced with a whole-batch fail-closed result and the audit reason is
`gate_postcondition_violation`. No partially trusted records from that batch
are released.

Gate authors should test both the ordinary pass/filter path and malformed
postconditions. The server contract tests live in
[`tests/unit/services/authz/gates/test_runner.py`](https://github.com/kamiwaza-internal/kamiwaza/blob/develop/tests/unit/services/authz/gates/test_runner.py)
and the job-result list-shape tests live in
[`tests/unit/cluster/jobs/test_result_gate.py`](https://github.com/kamiwaza-internal/kamiwaza/blob/develop/tests/unit/cluster/jobs/test_result_gate.py).

## SDK and application migration

The SDK's MiniClearance acceptance helper now preserves every parsed footer,
including explicit `null` values, and its assertions count the rows actually
released. It must not sum or compare the four deprecated fields. The offline
consumer contract is covered by
[`tests/integration/test_mini_clearance_gate_audit_contract.py`](https://github.com/kamiwaza-ai/kamiwaza-sdk/blob/develop/tests/integration/test_mini_clearance_gate_audit_contract.py)
and the parser is documented in
[`tests/integration/_mini_clearance.py`](https://github.com/kamiwaza-ai/kamiwaza-sdk/blob/develop/tests/integration/_mini_clearance.py).

Applications should:

1. treat `filtered` as the disclosure-safe indicator;
2. count the records/columns in the response they actually received;
3. tolerate the retained null keys during the compatibility window; and
4. avoid using a gate name or a withheld-count estimate for authorization or
   UI decisions.

## Deprecation window

The four keys (`included`, `redacted`, `total`, and `gate`) are retained as
nullable fields for the 1.3.x compatibility window. They are candidates for
removal in the next breaking API/schema revision after downstream SDK and UI
consumers have removed numeric and policy-name dependencies. Until that window
is announced, clients must accept the keys when present and must not require
them to be numeric. `filtered` and the released payload are the stable
contract.

See also [Execution Gates](./execution-gates.md) for gate configuration and
[Federation API Reference](./api-reference.md) for the transport envelopes.
