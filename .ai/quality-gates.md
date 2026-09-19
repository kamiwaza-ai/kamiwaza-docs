---
name: quality-gates
managed-by: quality-gates
version: 2
---

# Quality Gates

This policy covers the local quality gates that need engineering judgment rather
than mechanical reruns: CodeScene Code Health and the AuthNZ boundary guard.

## CodeScene Code Health

CodeScene runs as an advisory pre-push gate and is available on demand via the
CodeScene MCP (`analyze_change_set` for a branch, `code_health_review` /
`code_health_score` per file). Bias toward leaving every file you touch as
healthy or healthier than you found it, but spend the effort where it changes the
outcome, not chasing a green number.

- **A "degraded" verdict is a prompt to look, not noise to wave off.** "It is
  advisory" is not a reason to skip it. Before you conclude, pull the per-file
  detail and classify each degraded file.
- **Improve what you own.** If Code Health declined in production logic you wrote
  or edited, fix it when the fix is small and safe — reduce nesting, extract a
  helper, split an over-long method. This is where Code Health pays off.
- **When it is a campaign, not a helper-extraction.** A red-band Brain Class /
  God-class with a numeric health target (industry-average / ≥N) is a
  multi-milestone, behavior-preserving decomposition — not an in-place tidy-up. Use
  the **`quality-gates:codescene-refactor-campaign`** skill for the campaign playbook
  (extraction-first sequencing, coverage-gating, per-destination burndown,
  build/decorator verification), with `codescene:guiding-refactoring-with-code-health`
  for the per-file inner loop.
- **Do not rathole on no-value findings:**
  - **Generated code** (`zz_generated*.go`, `*.pb.go`, generated clients/mocks)
    is machine output — not hand-editable, and in-file markers are clobbered on
    regen. Note it and move on; never refactor it or bend the generator to a metric.
  - **Idiomatic test patterns** (e.g. Go table-driven tests flagged "Bumpy
    Road") — only restructure if it genuinely reads better; do not make a clear
    test worse for a score.
  - **Pre-existing debt your change merely nudged** — if the file was already
    over threshold and your change crossed no new threshold, you do not own that
    debt. Note it (file a tech-debt ticket if it is material) and move on.
- **Make the call visible.** When you accept a degraded finding, say so in one
  line — which file, which class (generated / idiomatic test / pre-existing), and
  why it is not worth fixing here. A silent dismissal and a reasoned acceptance
  look identical in the diff; write the reason.

The aim is net-positive health on the code you control, with judgment about where
improvement adds value — not a clean dashboard at the cost of mangling generated
files, tests, or unrelated legacy.

## AuthNZ Boundary Guard

`auth-guards` is an enforced pre-push gate when a repo provides
`scripts/lint_auth_guards.py`. The marketplace wrapper does not invent policy; it
runs the repo-owned AST linter against changed Python files so the product repo
remains the source of truth for AuthN/AuthZ contracts.

- **Treat failures as boundary regressions, not style nits.** Missing route auth,
  missing guarded mutations, unsafe raw authority-header reads, and workroom-scope
  regressions affect who can do what. Fix the boundary before looking for a bypass.
- **Use the existing authorization vocabulary.** Prefer the repo's established
  decorators, dependency helpers, requester context APIs, and workroom-scope
  checks. Do not add a one-off boolean or alternate header parser to make the gate
  pass.
- **Keep compatibility explicit.** If a false positive is real, document why in
  the PR, preserve the runtime contract, and update the repo linter or tests in
  the same change when practical.
- **Do not disable the gate casually.** A repo without the linter skips cleanly;
  a repo with the linter is declaring that AuthNZ checks are part of its local
  merge readiness.
