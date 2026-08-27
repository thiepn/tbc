# TBC recovery status

## Repository baseline

- Recovery baseline: `f84d5eff6a93046642c681e9163baa1b0b6b31a2`
  (`Merge P2E difficulty calibration audit`).
- Initial branch: clean `main`, equal to `origin/main`. Recovery implementation
  branch: `codex/recovery-stage0`. The initial implementation authorized no
  merge, push or deployment; subsequent branch-push authorization is recorded below.
- P2A merge `25d2ff4975e91c031a78ba07ce57fab4c46d80f0` is an ancestor.
  P2B, P2C, P2D and P2E are already merged. Recovery preserves that actual
  baseline; it does not reset to initial P2A or begin another content phase.
- P2A manifest and all 13 deployed files are unchanged by recovery.
- Runtime reports `4.1.0-d12`; QB11 reports `4.1.0`; save schema remains 27.
  Historical labels elsewhere are not authoritative application versions.

## Stage 0 scope and state

Implemented locally: repository guidance, this status, preservation invariants,
release checklist, locked npm commands, read-only aggregate runner and CI,
stronger P2A auditing/negative tests, and runtime migration/import/session checks.
Stage 0 tooling completion and product release certification are separate:
pre-existing product failures remain hard failures in the gate and release blockers.
The authorized tooling can be committed without claiming those failures are fixed.
See executed results below.
No product content, UI, balancing, mode, persistence implementation or deployment
asset was edited. No certification manifest was re-frozen.

P2A infrastructure corrections: candidate Git-filtered source hashing (Windows
CRLF previously produced a false source mismatch); current tier expectations;
registry artifact validation; per-record hash recomputation; exact structured
subset; live candidate identity; runtime health; all five deterministic files;
and all three frozen aggregate hashes. The P0A/P2E comparators now use Git text
equivalence. This normalizes comparison, not application files.

## Repository evidence map

- Guidance: root `AGENTS.md`; the three `docs/TBC_*.md` files.
- Existing documentation: `README.md`; `docs/P0F-PRODUCTION-DEPLOYMENT-CONTRACT.md`,
  `docs/P1A-PR7-STAGED-RECONSTRUCTION.md`, `docs/P1B-PR7-CONTROLLED-ACTIVATION.md`,
  `docs/P2A-QUESTION-BANK-EXTRACTION.md`.
- Frozen manifests: `certification/p0e-preservation-baseline.json`,
  `p0f-production-baseline.json`, `p1a-pr7-staging-baseline.json`,
  `p1b-pr7-production-baseline.json`, `p2a-question-bank-extraction-baseline.json`.
- Phase reports: `certification/P2B-MECHANICAL-INTEGRITY.md`,
  `P2C-SEMANTIC-ACCURACY.md`, `P2D-QUESTION-QUALITY.md`,
  `P2E-DIFFICULTY-CALIBRATION.md`.
- P2A code: `scripts/p2a-question-bank-extract.cjs`,
  `p2a-question-bank-extract-certified.cjs`, `p2a-question-bank-audit.cjs`;
  shared source identity helper and Stage 0 negative tests. The certified wrapper
  supplies committed tier expectations; it is not an independent question bank.
- P2A outputs (each under `artifacts/p2a/` and `artifacts/p2a-repeat/`):
  `question-bank.json`, `structured-questions.json`, `question-registry.json`,
  `question-bank-summary.json`, `candidate-discovery.json`. Source blob, three
  aggregate hashes and per-question hashes are documented in the P2A guide and
  invariants. Generated files are evidence, not deployable data.
- Later maintenance utilities: each P2B–P2E has repair, freeze-P2A-baseline,
  preservation and audit scripts. They are historical, not interchangeable
  build commands. The aggregate gate runs only audits, except P2E's comparator
  reconstructing expected historical bytes in a temporary file.
- Browser suites: P0A runtime; P0B controls; PR5 shell; PR6 play/learning;
  P0C systems and Duel; P0D visuals (the seven-suite P0E group); P1B PR7
  integration. Additional historical probes include P0B browser/control-map/
  level-chip, P1A staging and P0F live checks; they are not blanket certification.
- CI originally had 14 workflows: P0A, P0B, P0D, P0E, P0F, P1A, P1B, P2A,
  P2B, P2C, P2D, P2E, PR5 apply and PR5 validate. Stage 0 adds
  `.github/workflows/recovery-stage0.yml` and updates P2A to the locked commands.
- Pages has no repository deployment workflow, `CNAME` or `.nojekyll` file in
  this baseline; external Pages settings publish `main` `/` with legacy builds.
- The existing save probes checked API presence/persistence keys, not full
  export/import and restoration behavior. Stage 0 adds explicit behavioral tests.

## Source-confirmed product scope

Runtime and browser checks, not chat history, establish 5,799 canonical questions,
203 structured (subset), 66 books, five tiers, 22 collections, 25 Journey stages
and 63 Learning Path units. Registry 6,072 includes 273 aliases. See invariants
for the distinction between canonical, alias, derived and effective pool sizes.
Quick Play, Duel, Campaign, Expedition, Journey, Learning Path and Adaptive Review
are present. Daily Five and Weekly Challenge have retained legacy code, but
Standard-tier launch is redirected to Play; their presence is not active support.
Local saves, import/export and
migration/restoration implementations are present, but presence is not proof
that every saved round restores. Mobile/desktop flows have dedicated suites.
Core offline capability is distinct from offline refresh of the hosted shell.

## Executed validation

Implementation runs on 2026-08-27 used Windows, Node 24.16.0, Playwright 1.55.1
and explicitly selected installed Edge 151.0.4129.107. No Linux Node-22 or
bundled-Chromium pass is claimed. `npm ci` succeeded; npm reported zero
vulnerabilities for the locked dependencies. Chromium installation was attempted
and cancelled after stalling in extraction; it did not complete.

The full gate was executed, not waived. **Release gate: FAILED** on pre-existing
product behavior. Static/tooling/P2A and the older browser suites passed.
Final full run: **2026-08-27 04:53:35–04:59:17 UTC**, 22 child commands executed;
21 exited zero. Only the new behavioral-invariants suite exited one (4/7 checks
passed; three product failures). Product/manifest identity passed both before
and after the complete run. The working `index.html` raw blob also remained
`089859497f2ab5fe4838fddf1fc48ee00dab05fd`, identical to the initial Windows checkout.

| Executed check | Result |
| --- | --- |
| `npm run build` | PASS: all 13 product files, frozen manifest and P2A ancestry |
| Static P0A / P0B / P0C / P0D / P1B (inside `npm run verify`) | PASS: 18 / 23 / 52 / 45 / 23 checks |
| P2E exact-preservation comparator | PASS: expected historical engine delta only |
| P0E browser group | PASS: all seven suites |
| P1B desktop/mobile browser | PASS: 66 books, 22 collections, navigation, persistence and containment |
| Stage 0 behavioral invariants | 4/7 PASS; Quick Play restoration, Daily Five and Weekly Challenge FAIL |
| Schema-26/27 migration fixtures | PASS: ten tier/schema cases preserve progress and expected tier mapping |
| Real export/import, legacy import, reload and invalid-import rollback | PASS |
| Core without enhancement assets, followed by offline Quick Play/save | PASS; not hosted offline-refresh certification |
| P2A audit | PASS: 58/58 checks; all three frozen hashes match |
| Repeated P2A extraction | PASS: all five JSON artifacts byte-identical |
| P2B/C/D/E read-only audits on both extractions | PASS, with the existing warnings described below |
| Node infrastructure tests | PASS: 11 tests including nine negative cases |
| `npm run deploy:verify` | PASS: all 13 HTTPS-fetched production files match HEAD |
| `node --check` on nine new/modified CJS files | PASS |
| `git diff --check` and product/manifest diff review | PASS: no whitespace errors or product/data changes |

Reproduction (PowerShell): `$env:TBC_BROWSER_CHANNEL='msedge'; npm.cmd run verify`.
The final aggregate result must remain nonzero while the three product failures
remain. `npm run audit:p2a` also ran independently, as did the Node negative
tests and focused behavioral checks. `npm test` is the same suite path invoked
inside `verify`, not a separately claimed command execution.

Early new-harness defects (Windows preload-path escaping and a redundant
navigation probe that timed out) were corrected and retested.
The final count check uses direct runtime counts; existing P1B remains responsible
for rendered book/collection counts. No test expectation for the three product
failures was relaxed. Initial sandbox denial of HTTPS was resolved by an approved
read-only network retry. Evidence is in `artifacts/recovery-stage0/` (aggregate
report, per-invariant details, deployment identities), `artifacts/p2a*/` and
`artifacts/p2d*/` / `artifacts/p2e*/`; these outputs are intentionally ignored.

Final deterministic artifact **file-byte** SHA-256 values (distinct from the
semantic aggregate hashes in `TBC_INVARIANTS.md`):

```text
question-bank.json          07cf6935a9b1299124670b55006bc421410919d139f2ddf1b2423ffa4469057d
structured-questions.json   60fad2a3985e9dc6304026ad84325d2ea4053273f639b81bd1aa327c5459e878
question-registry.json      b09bacd42671f678445b856d5e6df8396bbb6cc20e9e4db59fbab90525dbae46
question-bank-summary.json  9ee1d94c38a35b6535232f35b7c64cba79ad4e5f3189fbe8ddacd2635ca67a6b
candidate-discovery.json    88bc2dc10faf9c7b6ded34eececc02631d4017c213e260c653587ab704ec0754
```

Baseline inspection actually executed: two P2A extractions (all five files
identical; all three frozen content hashes matched), P2A audit 40/41 (only raw
CRLF source identity failed), P0A 17/18 (same identity issue), P2E preservation
failed on CRLF shell comparison, P0E browser 7/7 and P1B browser passed using
Playwright 1.55.0 with installed Edge. Read-only P2B/C/D/E audits passed with
warnings: B/C one cross-book case, D 877 flags (758 generic distractor,
119 negation), E 459 tier-boundary flags. These are inspection results, not
new bundled-Chromium CI certification.

Baseline remote evidence: P2A run
https://github.com/thiepn/tbc/actions/runs/33013254046 succeeded for the baseline;
Pages run https://github.com/thiepn/tbc/actions/runs/33013253661 succeeded.
Read-only HTTPS comparison found all 13 deployed files equal to baseline Git
blobs. Production thus matched the product baseline when checked, not the
uncommitted recovery tooling. External Pages settings reported `built`, legacy
`main` `/`, `http://thiepn.dev/tbc/`, HTTPS enforcement false; the public HTTPS
alias redirected to HTTPS custom-domain content.

## Acceptance and branch-publication checkpoint

On 2026-08-27 the user accepted Stage 0's bounded conclusions and authorized
commit message `Add TBC recovery baseline and preservation gates` and a push of
`codex/recovery-stage0` only. No merge, product change or product-preservation
repair is authorized. The base remains `f84d5eff6a93046642c681e9163baa1b0b6b31a2`.
Pre-push inspection found no remote recovery branch; remote `main` had advanced
to `962ce4909a0a161d45a879aa06856eaed5778888`. It was not merged or rebased into recovery.

Focused rerun at **06:45:18–06:46:47 UTC**: `npm run audit:p2a` passed all 13
child commands, including both 58/58 P2A audits and 11/11 infrastructure tests.
All five artifact hashes equal the earlier full-gate report. `npm run build`,
P0A (18/18), P2E exact preservation and whitespace checks also passed.
The same Node 24.16.0 / Playwright 1.55.1 / explicit Edge environment was used.
No behavioral suite was rerun or weakened in this acceptance check:
`scripts/tbc-stage0-invariants.cjs` retains Git blob
`8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073`. The three recorded product failures
and failed full release-gate conclusion remain unchanged. Generated artifacts
remain ignored, untracked and unstaged. This checkpoint does not certify remote
CI or production; the earlier deployment comparison remains historical evidence.

## Unresolved risks and limits

1. Real Quick Play save/reload rejects a freshly saved session. The diagnostic
   console reports `Knowledge question changed`; a deterministic seed-1701 test
   also loses the saved round on reload. The new check stays strict. This is
   unchanged product code, not a Stage 0 regression.
2. Daily Five and Weekly Challenge do not launch at Standard: both land at
   `#play-now` with no round. Embedded `V311_START_QUIZ` explicitly redirects
   these modes; later wrappers retain that behavior. This contradicts the
   requested preserved systems. Recovery does not declare the requirement
   obsolete or alter the product to restore it without authorization.
3. Local bundled-Chromium installation stalled while extracting build 1193.
   Edge fallback results must be labelled; Linux Node-22 CI remains unexecuted
   until a separately authorized push/run.
4. Historical workflows still install Playwright 1.55.0; npm audit reports
   GHSA-7mvr-c777-76hp (browser-download certificate verification). New locked
   tooling/P2A use 1.55.1; broad historical workflow migration is out of scope.
5. P2B–P2E workflows can repair/re-freeze during main/PR runs, although their
   auto-commit steps target phase branches. Do not treat mutated candidates as
   proof of the checkout. They need a separate audit-only workflow task.
6. Older exposed audits are unreliable: several v296/v3011/v316/v330/v340 audit
   calls reference missing `V342_CONTEXT_UNITS`; v213/v214 return undefined;
   v281/v322 report false. No product changes are made to silence these.
7. Historical P0F manifests pin an older source, and obsolete reports/embedded
   version labels coexist with the current baseline. They are retained for
   provenance, not current certification. P2A's old two-artifact/two-hash and
   fallback-ID prose has been corrected. Runtime IDs are required.
8. Content quality flags remain; P2A proves extraction integrity, not biblical
   accuracy or pedagogical certification. Full hosted offline refresh, all
   browsers, every migration generation, every mode's saved sessions and device
   performance remain outside the tested coverage.

## Exact next task

Obtain approval for a bounded product-preservation repair of Quick Play
active-session restoration and Daily Five/Weekly Challenge routing, using
`scripts/tbc-stage0-invariants.cjs` as the unchanged acceptance test. Do not edit
questions, rebalance modes or begin another content phase. This task is not
authorized or started by the Stage 0 commit.

The originally proposed next task (making P2B–P2E main/PR workflows audit-only)
is deferred behind these newly demonstrated preservation blockers. Their
repair/freezer utilities remain untouched.
