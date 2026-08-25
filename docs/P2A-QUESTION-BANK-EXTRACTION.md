# TBC P2A — Question Bank Extraction & Audit Infrastructure

## Purpose

P2A creates a deterministic, read-only audit representation of the playable TBC question bank. It does not modify gameplay, question selection, scoring, themes, navigation, progression, or browser persistence.

Parent production baseline: `33252c17f89e7aa750c7df60f495a22b19d3c673` (P1B).

## Canonical contract

P2A must recover and represent:

- 5,799 canonical playable questions;
- the preserved 6,072-question source registry before the 273 redundant aliases are excluded;
- 203 structured questions;
- all 66 biblical books;
- exactly five difficulty tiers: Beginner, Easy, Standard, Advanced, Expert;
- the frozen P1B difficulty distribution: 1,338 / 1,666 / 1,133 / 1,141 / 521.

## Extraction model

`scripts/p2a-question-bank-extract.cjs` reads the frozen production document and, when available, its initialized browser runtime. It locates the canonical question registry without changing the application.

The extractor normalizes each question into an audit schema containing, where represented by the source question:

- canonical ID;
- question text;
- correct answer;
- distractors and answer options;
- Bible reference;
- book;
- category/topic;
- difficulty;
- explanation;
- evidence;
- memory cue;
- collection membership;
- mode eligibility;
- question/interaction type;
- source field names.

Runtime IDs are preserved when available. If a source item does not expose a stable ID, P2A derives a deterministic SHA-256-based audit ID from the question identity fields. Content hashes intentionally exclude the audit ID and source-array position so later revisions can be compared semantically.

## Generated evidence

The workflow generates, but does not commit, the following files:

- `artifacts/p2a/question-bank.json` — all canonical questions in normalized audit form;
- `artifacts/p2a/structured-questions.json` — the structured-question subset/registry;
- `artifacts/p2a/question-bank-summary.json` — counts, field coverage, source strategy and aggregate hashes;
- `artifacts/p2a/candidate-discovery.json` — extraction diagnostics used to make source discovery reviewable.

The full extraction is uploaded as a GitHub Actions artifact. Keeping generated question data out of the repository prevents P2A from increasing the production application payload.

## Deterministic hashing

Every normalized question receives a SHA-256 content hash. P2A then computes aggregate hashes over the ordered canonical ID/content-hash pairs for:

1. the complete canonical bank; and
2. the structured-question bank.

The workflow performs the extraction twice from the same checkout and requires byte-for-byte identical question JSON plus identical aggregate hashes. The accepted hashes are frozen in `certification/p2a-question-bank-extraction-baseline.json` before P2A may merge.

## Audit gate

`scripts/p2a-question-bank-audit.cjs` requires:

1. exactly 5,799 canonical audit records;
2. exactly 203 structured audit records;
3. exactly 66 observed books;
4. only the five approved difficulty levels;
5. the frozen difficulty distribution;
6. unique canonical audit IDs;
7. deterministic per-question content hashes;
8. all normalized audit-schema fields to be represented;
9. aggregate hashes to be self-consistent and, once frozen, equal to the P2A baseline;
10. source identity to remain tied to the P1B monolith unless a later phase intentionally establishes a new baseline.

## Explicit non-goals

P2A does **not** claim that all 5,799 questions are biblically correct or pedagogically optimal. It establishes the infrastructure required to make those claims auditable in P2B–P2J.

P2A does not:

- rewrite any question;
- judge theological or factual accuracy;
- rebalance difficulty;
- remove semantic duplicates;
- alter Duel/Campaign/Expedition behavior;
- write `localStorage` or `sessionStorage`;
- replace canonical game-state ownership.

## Completion criterion

P2A is complete when the branch has a green `P2A Question Bank Extraction` workflow, both deterministic aggregate hashes are frozen in the baseline, all 5,799 canonical questions and all 203 structured questions are represented in the generated audit evidence, and the branch is merged to `main`.
