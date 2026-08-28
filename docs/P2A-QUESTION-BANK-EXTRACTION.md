# TBC P2A — question-bank extraction and audit infrastructure

P2A creates a deterministic, read-only audit representation of the initialized
runtime. It does not edit questions, selection, scoring, navigation or saves.
P2A originally followed P1B (`33252c17f89e7aa750c7df60f495a22b19d3c673`);
the committed manifest now incorporates already-merged P2B–P2E changes.
See `TBC_STATUS.md` for the exact recovery baseline and executed results.

## Authority and counts

- `TBC_QB0.registry()`: 6,072 source records, including 273 retained aliases.
- `TBC_QB6.activeQuestions()`: 5,799 unique canonical questions.
- `TBC_QB8.canonicalStructured()`: 203 questions **within** the 5,799.
- `TBC_QB11.freezeManifest` / `bankAudit()`: current release assertions.
- All 66 books; five tiers: Beginner 1,338, Easy 1,668, Standard 1,132,
  Advanced 1,140, Expert 521. The original P1B distribution is historical.

Aliases and derived mode pools are not additional canonical questions.
Current runtime IDs are required; no missing-ID hash fallback is implemented.
P2A requires a running browser runtime, not a best-effort static fallback.

## Commands and files

Use `npm ci`, `npx playwright install chromium`, then `npm run audit:p2a`.
The runner owns a local server on port 4173 and performs both extraction passes.
Low-level commands (server must already be running) are:

```sh
node scripts/p2a-question-bank-extract-certified.cjs
node scripts/p2a-question-bank-audit.cjs
```

The certified wrapper reads tier expectations from the committed manifest and
executes the shared `p2a-question-bank-extract.cjs`; it is not duplicate bank
logic. Its historical `P2A_EXPECTED_TIERS` override is for deliberate maintenance,
not certification; the aggregate gate clears that override. `P2A_OUT_DIR` selects
the evidence directory. The authoritative gate fixes the local candidate URL.

Five generated files live under `artifacts/p2a/` and `artifacts/p2a-repeat/`:

| File | Contents |
| --- | --- |
| `question-bank.json` | Normalized canonical records and per-record content hashes |
| `structured-questions.json` | Exact canonical structured subset |
| `question-registry.json` | Full source records and alias metadata |
| `question-bank-summary.json` | Counts, books, tiers, coverage, source identity, runtime audits, aggregate hashes |
| `candidate-discovery.json` | Authority, counts and runtime-health diagnostics |

Normalized fields include question/answer/distractors/options, reference/book,
category, difficulty, explanation/evidence/memory cue, collections, mode
eligibility, interaction type, quality metadata and source keys. Nullable fields
do not imply authored evidence exists for every record; coverage is reported.
Generated dumps are ignored and uploaded as CI evidence, never deployed.

## Hashes and fail-closed validation

The frozen contract is `certification/p2a-question-bank-extraction-baseline.json`
(schema `P2A.1`). Exact source blob and three SHA-256 values are in
`TBC_INVARIANTS.md`. Each canonical content hash excludes audit ID, ID-source
label, source origin, source-array index and the hash field itself. Canonical
and structured aggregates hash ordered ID/content-hash pairs. The registry
aggregate hashes sorted raw ID/record-hash pairs. These are not file-byte hashes.

The audit requires all five files, unique IDs, exact counts/tiers/books,
recomputed content/aggregate hashes, three nonempty frozen hashes, exact
structured subset, registry integrity, current candidate source identity and
healthy QB11/QB8 runtime reports. Git source identity uses the actual candidate
with Git text filters; LF/CRLF differences do not conceal substantive changes.
Both passes must produce byte-identical **all five** JSON files.

`scripts/tbc-p2a-infrastructure.test.cjs` tests normalization and rejects missing
registry, registry tampering, removed/invalid alias, canonical/structured tampering,
stale source identity, runtime errors and stale discovery health. The complete command also runs existing
read-only P2B–P2E audits against each extraction; it never runs a freezer.

P2A integrity is not biblical/pedagogical certification. Implemented, tested,
committed, merged and deployed are separate states. Historical P2A is committed
and merged; recovery tooling is not merged/deployed merely because local tests
pass. Never re-freeze the manifest just to make a recovery check green.
