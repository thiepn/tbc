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

## Preservation repair checkpoint — 2026-08-27

This section supersedes the earlier authorization/next-task statements for the
local repair only. The user authorized the three bounded product repairs on
`codex/preservation-repair`, created from the clean committed Stage 0 branch
`9dbd277da6b8032dd83cd34a850186b06fb1e9fc`. No remote state was incorporated.
**Incomplete, uncommitted, not merged, not pushed, not deployed or certified.**
No completion commit was made: the expanded regression matrix and the required
identity-transition checkpoint remain unresolved. No manifest or existing test
was changed. The unchanged acceptance-test blob is still
`8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073`.

### Implemented candidate and traced paths

Only the embedded engine in `index.html` changes. Its Git-filtered candidate
blob is `ac1e55386762928fab4ec91a05222ee0cd369534`; this is a **file identity,
not a commit SHA**. The outer HTML, all 12 supporting deployed files, other
supporting assets, question data, save schema 27 and storage keys are unchanged.
The local audit replays 17 bounded replacement records against the original
decoded engine and requires exact equality with the candidate. It parses the
engine and both outer inline scripts. Evidence is ignored under
`artifacts/preservation-repair/`, including `product-edits.json`, `review.json`,
the caller maps and targeted function extracts; no full payload is printed.

- Quick Play: native/PR6 input → AF1/D4/D0/V311/Expedition launch wrappers →
  QB9 canonical selection and `v25QuestionSource` → configured quiz rendering →
  the existing serializer and local/session copies → hydration/restoration.
  Selection and serialization use the current editorial question identity;
  V18, V21 and V211 hydration instead read older `V18_QUESTION_MAP` records.
  Seed 1701 proves answer/options mismatches for unchanged IDs, including
  `d4.easy.major.matthew-inventory-5.01` and
  `phase9.nt.ephesians.2.connection`. The candidate resolves those hydration
  lookups through the current source, retains answer/option comparisons, adds
  current-field/active-ID validation for these three modes, and preserves
  knowledge IDs validated by the current source instead of dropping newer
  namespaces. It does not replace the source bank with saved data.
- Daily Five: restored native Play button/`startQuiz('daily',5)` → retained
  launch wrappers → five exact-tier canonical questions through QB9, using the
  existing `dateKey()|daily-v23` seed → existing quiz/result rendering → existing
  daily best/last/attempt and once-per-day counter logic → existing session
  serializer and validators. Its recent-selection key is isolated from ordinary
  practice so other play cannot change the deterministic daily selection.
- Weekly Challenge: native button/`startWeekly()` → retained launch wrappers →
  QB9's 15-question weekly selection, original `qb9-weekly|week|tier` seed and
  scope → existing quiz/result rendering → existing weekly first/best/attempt
  logic → session serialization and restoration. Its recent-selection key is
  likewise isolated from mixed challenge practice. The V311 redirects and
  V316 recurring-mode retirement list no longer block or scrub supported modes;
  normal question, mode, scope and answer integrity checks remain.

The new direct regression suite is `scripts/tbc-preservation-repair.cjs`.
It retains strict checks for exact round/question identity, options and matching
choice order, knowledge IDs, answer state, progress, corrupt-copy fallback,
changed-library rejection, invalid imports, completion/replay and desktop/mobile
navigation. Boot's existing unanswered-question `qStarted` reset is explicitly
excluded from equality; no score depends on that reset. Historical audits that
assert Daily/Weekly retirement were not rewritten to claim success.

### Verification and stop condition

Local environment: Windows, Node 24.16.0, locked Playwright 1.55.1, explicit
installed Edge fallback. `npm ci` succeeded. The default Chromium install
stalled; an isolated ignored browser directory then hit sandbox EACCES on
download. The approved network retry downloaded Chromium but stalled during
extraction and was cancelled. No bundled-Chromium or Linux CI pass is claimed.

- Before changes, the unchanged Stage 0 suite reproduced all three failures:
  **4/7**; the direct source probe captured `Knowledge question changed`.
- After the final candidate edits, the unchanged Stage 0 suite passed **7/7**.
  Its migration fixtures, actual export/import, legacy import, invalid-import
  rollback and loaded-core offline check passed as part of that run.
- P0E browser: **7/7 suites passed**. P1B desktop/mobile browser passed;
  P1B static activation passed **23/23**.
- P2A extracted twice; all five artifacts were byte-identical between runs.
  Both audits passed **57/58**, failing only the frozen monolith source pin.
  All counts, tier distributions, per-record and three aggregate hashes match.
  The canonical, structured and registry artifact file-byte hashes also remain
  exactly those recorded in Stage 0. Only summary/discovery source identity
  changes. Read-only P2B/C/D/E content audits all passed with existing warnings.
- `npm run verify` was executed and **failed before child commands** at its
  hardcoded Stage 0 product-byte assertion. It is not an all-child-command pass.
  P2E exact-preservation also failed, correctly identifying a delta beyond its
  exclusively authorized historical calibration patch.
- Historical P0E static certification was also run: **53/61 contract checks**,
  plus one P0A source-pin failure. Its old raw-file pins reject the current
  successor/Windows checkout; those historical manifests were not rewritten.
- Engine, both outer inline scripts and the new regression script parse;
  `git diff --check` passes. Supporting files/manifests and acceptance-test
  identity were compared with the committed Stage 0 branch, not inferred.

The expanded matrix finished **8/19**, exit one, on the final candidate using
Edge 151.0.4129.107. The full report is
`artifacts/preservation-repair/regressions.json`. Passing rows: Daily Standard;
Quick/Daily/Weekly Advanced; Daily/Weekly Expert; Quick/Daily mobile navigation.
Daily Standard includes actual completion, duplicate-finish protection, replay
with a lower result, preserved best/last/attempt counters, once-per-day counting,
reload after completion and a changed deterministic identity in the next period.

The eleven failed rows remain strict and unresolved:

- Three Beginner rows and Quick Standard: the active-round identity itself
  survives two reloads, but the existing save sanitizer drops hyphenated
  `stats.typeStats` keys (for example `beginner-major` and `easy-major`). Its
  unchanged `/^[a-zA-Z]{2,20}$/` filter does not accept those current type names.
  This is real per-type progress loss; changing this sanitizer was not included.
- Three Easy rows: fresh snapshots omit `responseMode`; hydration materializes
  `choice`. The strict equality check fails on that representation difference.
  This does not by itself prove changed answer behavior, but the requested exact
  restoration matrix is not green. No assertion was relaxed to hide it.
- Weekly Standard, Quick Expert and Weekly mobile: V211 hydration replaces the
  saved `matchChoices` order with the current pair order. IDs/answers remain,
  but exact restoration fails. Weekly Standard completion/replay accounting was
  therefore not reached and is **not certified** by the successful launch test.
- The negative Quick Play group rejects changed prompt, display, answer,
  reference, difficulty, options, inconsistent totals and a changed authoritative
  answer. However, an unknown item ID is still accepted: QB6's `isActiveId`
  excludes aliases, not unknown IDs, and the legacy V23 hydrator can register a
  saved question. The candidate's active-ID check is therefore insufficient;
  a real canonical-membership check remains required. The group's subsequent
  corrupt-copy fallback, invalid-import-with-active-round and fresh recovery
  assertions were not reached. Stage 0's separate import checks still passed.

Quick/Daily mobile tests exercised real navigation, rendered questions, reload,
answering, continue/leave confirmation, Library re-entry and relaunch. Weekly
mobile failed at exact restoration before the leave/re-entry assertions. No
blanket three-mode desktop/mobile or corruption-recovery certification is claimed.
No broad freezer, migration repair, workflow cleanup, merge, push or deployment
was performed. Reproduction: start `node scripts/tbc-recovery-stage0.cjs serve`
in one terminal; in another set `$env:TBC_BROWSER_CHANNEL='msedge'` and run
`node --require ./scripts/tbc-browser-runtime.cjs scripts/tbc-preservation-repair.cjs`.

**Manifest checkpoint:** the only existing current manifest field that would
legitimately need a product-source update is P2A's `source.indexBlobSha1`.
Its question hashes, counts, distributions and P2B–P2E evidence must not change.
P0E/P0F/P1A are immutable historical manifests; P1B has no changed product hash
to update. Separately, Stage 0's hardcoded build pin and P2E's exact historical
comparator have no documented identity-only successor transition. Available
P2B–P2E freezers also rewrite content hashes, distributions and phase evidence.
Per the user's explicit stop rule, **none was run and no manifest was edited**.
Updating a source pin alone would still not make the aggregate gate accept a
product repair. A separately authorized, narrowly defined successor process is
needed; this task does not invent one or weaken the existing gates.

## P2 alias-restoration correction — 2026-08-27

**Implemented and behaviorally tested in the working tree; blocked at the frozen
identity checkpoint. Not committed, merged, pushed, deployed or certified.** This section records the user-authorized
correction to the alias rejection finding and its persistence requirements. The
previous checkpoint above is historical evidence, not the latest test result.

Current candidate Git-filtered `index.html` identity:
`ce1b30a8fe2c07822001b9542271eea60174f4f1`. The unchanged acceptance test retains
blob `8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073`. No frozen manifest was updated.

### Validation and recovery model

- Fresh selection and challenge routing are unchanged by this correction.
  Saved Quick/Daily/Weekly questions use unique supported QB0 registry entries,
  QB6's declared alias target and current `v25QuestionSource` content. An alias
  must have one supported non-alias target; missing, conflicting, ambiguous or
  removed identities fail closed. Saved IDs are never replaced by target IDs.
  Insertion options are checked against the authored source or QB8's trusted
  prepared representation (which adds its internal marker); answers, insertion
  item and anchors must still match. Arbitrary option/marker changes are rejected.
- The V23 restoration path for these modes no longer registers saved question
  data in the question cache. Existing answer, option, mode, scope, structured
  interaction and score/progress integrity checks still run. An invalid recovery
  candidate cannot leave new legacy cache registrations behind to affect its peer.
- Both local and session copies are evaluated before either is repaired or
  removed. Valid primary precedence is retained; an invalid primary cannot erase
  a valid backup. Existing legacy-key migration and Expedition checks remain.
- Exports now carry an optional `activeRound` envelope field for these supported
  modes. Import validates it before changing state, preserves both original
  copies on failure, and tolerates an unavailable secondary store. Progress-only
  exports remain supported. Storage keys and state schema 27 are unchanged.
- Restoration retains matching-choice order and absent legacy response modes,
  including after mastery would select typed recall for a new question. The
  progress sanitizer retains its original type-name rule plus an explicit list
  of 75 authored compatibility names; arbitrary new formats are not admitted.
  Existing count clamps and recent-history bounds remain unchanged.

The surrounding hydration, serialization, save/restore, import/export and launch
wrappers and callers were inspected before editing. The traced path is unchanged
input/selection → existing rendering → serialization retaining alias IDs →
registry/content validation → independent recovery-copy selection → resumed
rendering/answering. Bounded edit records, caller maps and replay/parse evidence
are under ignored `artifacts/preservation-repair/`; no question dump is tracked.

### Executed evidence and verification

- Before correction, the exact ten-question fixture restored on `main` and kept
  both copies; the repair candidate restored zero questions and deleted both.
  Fixture SHA-256:
  `b8d2c11b734c4758ca5a85d54a006fe430d75d3d94069d23f63be9e7199c4601`.
- The focused suite derives fixtures from exact main commit
  `f84d5eff6a93046642c681e9163baa1b0b6b31a2`. It sweeps all 273 retained aliases;
  main accepts 67 current-source fixtures, all retained by the correction. This
  is an exhaustive ID sweep of that fixture corpus, not every historical payload.
- Intermediate strict runs exposed mastery-dependent response-mode mutation and
  dropped `curriculum-v2` progress. Both were corrected; failing assertions were
  retained. Expert then exposed the authored-versus-prepared insertion option
  mismatch; the validator now uses the established QB8 representation, without
  skipping option validation. All 203 structured questions pass the prepared
  restoration preflight. The complete 137-type sanitizer preflight passes with
  count bounds.
- The final sequential Edge gate run is recorded in
  `artifacts/preservation-repair/gate-progress.json` and `p2-gate-*.log`.
  It completed with **19/24 child commands exiting zero**. The five failures
  were P0A static, historical P0E static, P2E exact-source preservation, and
  both P2A audits' frozen source-identity checks. No failure was waived.
  An earlier concurrent browser run hit a boot timeout and was stopped;
  it is not a passing result.
- The engine, outer inline scripts, supporting JavaScript and changed test/gate
  scripts have been parsed. The replay audit confirms only inspected engine
  replacements, unchanged outer HTML, supporting files and acceptance test.

The focused regressions live in `scripts/tbc-session-compatibility.cjs`; the
existing strict matrix remains in `scripts/tbc-preservation-repair.cjs`. Both
are added to the aggregate test list without relaxing its existing checks.

Final environment: Windows, Node **24.16.0**, locked Playwright **1.55.1**, installed
Edge **151.0.4129.107** via `TBC_BROWSER_CHANNEL=msedge`. These are local Edge
results, not bundled-Chromium CI or deployment certification.

| Executed check | Final result |
| --- | --- |
| Strict preservation matrix | **19/19**, exit 0: three modes across five tiers, two reloads and continued answers, Standard challenge completion/replay/period identity, corrupt-session/import adjacency, all three mobile navigation cases |
| Focused session compatibility | **27/27**, exit 0: exact main fixture, all 67 main-accepted fixtures from the 273-alias sweep, mixed IDs, recovery-copy precedence/failure isolation, changed/unknown/ambiguous/removed rejection, repeated reload, actual export/import, fresh selection, 203 prepared structured identities and 137 authored progress types |
| Unchanged Stage 0 behavioral invariants | **7/7**, exit 0; includes schema-26 migration, schema-27 tier preservation, actual export/import, legacy import and rejected-import rollback |
| P0E whole-product browser | **7/7 child suites**, exit 0; bootstrap/persistence, controls, shell, play/learning, existing systems/re-entry, Duel launch, visual integrity |
| P1B | Browser exit 0; static **23/23**, exit 0 |
| P0B / P0C / P0D static | Each exit 0 |
| P0A static | **17/18**, exit 1: frozen legacy monolith identity |
| Historical P0E static | **53/61** contract checks, exit 1: eight historical/raw-byte file pins plus the P0A child failure; supporting files remain Git-equivalent to Stage 0 |
| P2E exact-source preservation | Exit 1: accepts only its historical P2D-plus-calibration engine, not this product repair |
| P2A extraction, twice | Both exit 0; all five JSON outputs byte-identical across the two runs |
| P2A audit, twice | Both **57/58**, exit 1 solely on `frozen monolith source identity`; all three frozen content hashes, counts, alias targets and distributions pass |
| P2B / P2C / P2D / P2E read-only content audits | Each exits 0 against each fresh extraction (eight commands) |
| P2A infrastructure negative suite | Exit 1: Git LF/CRLF identity test passes; negative-artifact test stops at its unaltered-artifact precondition because of the frozen source pin. Its nine mutation subtests were not reached |
| `npm.cmd run build` / `npm.cmd run verify` | Both exit 1 at `product changed outside Stage 0: index.html`; aggregate stops before child execution. The separate sequential run above executed the children for diagnostic evidence |
| JavaScript parse / bounded edit replay / `git diff --check` | All pass; embedded engine, two outer inline scripts, supporting JS, changed tests and aggregate script checked |

`final-content-comparison.json` confirms the fresh canonical, structured and
registry JSON files are also byte-identical to the pre-correction extraction.
The frozen semantic hashes remain `1f795f1c…6885b`, `4b6a0c8c…58fcb`, and
`9f03475f…5f9d`, respectively (full hashes in `TBC_INVARIANTS.md`). Counts remain
**5,799 canonical / 203 structured / 273 aliases / 6,072 registry**; tier totals
remain **1,338 / 1,668 / 1,132 / 1,140 / 521**. The single-file core and all 13
deployment paths remain; the 12 supporting deployed files are unchanged.

Remaining limitations: the main comparison exhausts the retained-alias ID corpus
with the recorded fixture construction, not every possible historical payload.
Old exports that omitted an active round cannot recover absent session data.
The unchanged frozen-identity gates still block release and the requested commit;
there is no all-green aggregate result or new commit SHA. No manifest, question
hash, registry identity, tier distribution, storage key or schema was changed.

The identity checkpoint remains: only P2A's `source.indexBlobSha1` is a legitimate
current manifest-field update. The documented freezer also rewrites question
hashes, distributions and phase evidence, so it must not be run. Stage 0's fixed
product pin and P2E's exact historical comparator additionally lack a documented
identity-only successor process. No such process or baseline waiver is invented.

## Authorized successor certification — 2026-08-27

**Latest result: the full local preservation gate passes.** The user explicitly
authorized the narrow product-identity successor process after the blocked
checkpoint above. That checkpoint remains historical evidence, not the current
gate result. No additional product edits were made during this identity step.
This is local Windows/Edge preservation certification, not Linux CI, deployment,
or a new content-quality certification. No push, merge or deployment occurred.

### Identity and authorized scope

- Recovery predecessor: `f84d5eff6a93046642c681e9163baa1b0b6b31a2`; Stage 0:
  `9dbd277da6b8032dd83cd34a850186b06fb1e9fc`.
- Previous `index.html` Git blob: `915ec2f5c4eeb270f63b3a04d442b8a8429c5993`.
- Verified successor: `ce1b30a8fe2c07822001b9542271eea60174f4f1`.
- Authorized scope: Quick Play current-session restoration, retained-alias
  compatibility, independent primary/backup recovery, Daily Five restoration
  and Weekly Challenge restoration. The only changed deployed file is
  `index.html`; all 12 supporting deployed files remain unchanged.
- Stage 0 acceptance blob remains `8319d90d6ca5d6b85aa8d1b34ce96ed3af96b073`.

The current identity manifest is `certification/tbc-product-identity.json`.
Its normalized SHA-256 is
`aea7b85689a2ee39dad4ae0b74ba76a3e707fb1f47a371abcbf329b25f84a773`, pinned in
`scripts/tbc-product-identity.cjs`. The bounded transition record is
`certification/tbc-preservation-repair-transition.json`, SHA-256
`2ca286cb32bfa61a27f02e993e54ead1242b7f52162f0c09daa9e35c3df05cdb`.
The transition validator replays all 40 inspected replacements from the Git
predecessor, verifies unchanged outer HTML/storage names/schema assignments,
parses the product, and independently requires the authorized successor blob.
The content validator checks both fresh extractions against the protected full
artifacts, every canonical/structured ID/hash pair, and all alias targets.

The only existing manifest modification is P2A's `source.indexBlobSha1`.
The entire remainder must equal the Stage 0 Git blob. All eight other historical
certificates/reports remain unchanged, including P0E/P0F/P1A/P1B and P2B–P2E.
Original comparator scripts are unchanged. The historical adapter runs the
original gates on pinned historical checkouts and requires zero exits and no
tracked-file changes. It does not compare the successor to historical raw bytes
or waive those historical checks. See `TBC_PRODUCT_IDENTITY.md` for the process
and exact historical source table. **No broad freezer was run.**

### Commands and results

Environment: Windows, Node **24.16.0**, Playwright **1.55.1**, Edge
**151.0.4129.107**. `npm.cmd ci --ignore-scripts --no-audit --no-fund` passed
(two locked packages installed, no lockfile change). `npx.cmd playwright install
chromium` stalled in the sandbox and was stopped; an escalated retry reached
100% download but stalled before producing an executable and was also stopped.
Neither attempt is reported as a pass. The documented Edge channel was used for
all browser checks. No bundled-Chromium or Linux CI pass is claimed.

Preflights, all exit 0: `node scripts/tbc-product-identity.cjs`,
`node scripts/tbc-successor-transition.cjs`,
`node scripts/tbc-historical-preservation.cjs`,
`node scripts/tbc-product-identity.cjs --content artifacts/preservation-repair/p2-final`,
and `node --test scripts/tbc-product-identity.test.cjs` with `P2A_OUT_DIR` set to
that same directory (**31/31**). `npm.cmd run build` passed separately.

The final command was `npm.cmd run verify` with
`TBC_BROWSER_CHANNEL=msedge`. It ran from **20:58:24 to 21:22:32 UTC** on
2026-08-27 and exited **0**. **All 27 child commands exited zero**, with build
validation before and after. The tested worktree had Stage 0 HEAD `9dbd277…`
and the exact successor product recorded above. Results and exact child arguments
are in ignored `artifacts/recovery-stage0/verify-report.json`; complete output is
`artifacts/preservation-repair/successor-verify.log`.

All commands below ran under `node` (with `--test` for the two test files).
The two extraction passes used `artifacts/p2a` and `artifacts/p2a-repeat`.

| Aggregate command(s) | Result |
| --- | --- |
| `scripts/p0a-preservation-audit.cjs` | 18/18, exit 0 |
| `scripts/p0b-player-controls-audit.cjs`, `scripts/p0c-existing-feature-preservation-audit.cjs`, `scripts/p0d-visual-preservation-audit.cjs` | Each exit 0 |
| `scripts/p1b-pr7-activation-audit.cjs` | 23/23, exit 0 |
| `scripts/tbc-historical-preservation.cjs` | All five original-source children exit 0: P0E, P0F, P1A, P1B, P2E |
| `scripts/tbc-stage0-invariants.cjs` (unchanged) | 7/7, exit 0 |
| `scripts/tbc-preservation-repair.cjs` | 19/19, exit 0; all modes/tiers, exact restoration, completion/progress, desktop/mobile navigation |
| `scripts/tbc-session-compatibility.cjs` | 27/27, exit 0; exact main fixture, 67 main-accepted aliases, recovery matrix, export/import, structured identity and fresh eligibility |
| `scripts/p0e-browser-certification.cjs` | All seven browser child suites pass, exit 0 |
| `scripts/p1b-pr7-browser-smoke.cjs` | Desktop/mobile integration passes, exit 0 |
| `scripts/p2a-question-bank-extract-certified.cjs` (twice) | Each exit 0; all five artifacts byte-identical between independent runs |
| `scripts/p2a-question-bank-audit.cjs` (twice) | Each 58/58, exit 0 |
| `scripts/tbc-product-identity.cjs --content artifacts/p2a`, then `--content artifacts/p2a-repeat` | Both exit 0; all protected content evidence unchanged |
| `scripts/p2b-mechanical-integrity-audit.cjs`, `scripts/p2c-semantic-accuracy-audit.cjs`, `scripts/p2d-question-quality-audit.cjs`, `scripts/p2e-difficulty-calibration-audit.cjs` (each against both extractions) | All eight commands exit 0; existing non-blocking content-review warnings are not new certification work |
| `scripts/tbc-p2a-infrastructure.test.cjs` (unchanged) | 11/11, exit 0; all nine corruption/missing/stale-artifact scenarios reached |
| `scripts/tbc-product-identity.test.cjs` | 31/31, exit 0, including replacement with a different valid alias target and prohibited evidence rewrites |

Final independent comparison:
`node artifacts/preservation-repair/successor-final-comparison.cjs` exited 0.
It repeats current identity and bounded replay, verifies both fresh content
proofs, compares all five outputs between runs, and compares all three content
files to predecessor-content evidence. It confirms **5,799 canonical / 203
structured / 273 aliases / 6,072 registry / 66 books**, unchanged tier totals
**1,338 / 1,668 / 1,132 / 1,140 / 521**, every question hash and alias target,
all three semantic hashes, schema 27, all supporting assets and historical files.
Evidence: `artifacts/preservation-repair/successor-final-comparison.json`.

`node --check` passed for all seven changed/added scripts: the aggregate runner,
preservation matrix, compatibility suite, current identity validator, transition
validator, historical adapter and successor negative suite. Product/outer-inline
and supporting-JavaScript parses also passed through the transition validator.
`git diff --check` passed. The final review used bounded replay rather than
printing the embedded payload, and confirmed no tracked question dumps, workflow
changes, historical-certificate rewrites or supporting-asset changes.

### Files in this repair and successor change

- Product: `index.html`.
- Identity: P2A source field only; new `certification/tbc-product-identity.json`
  and `certification/tbc-preservation-repair-transition.json`.
- Scripts: `tbc-recovery-stage0.cjs`, `tbc-preservation-repair.cjs`,
  `tbc-session-compatibility.cjs`, `tbc-product-identity.cjs`,
  `tbc-successor-transition.cjs`, `tbc-historical-preservation.cjs`,
  `tbc-product-identity.test.cjs` (all under `scripts/`).
- Documentation: `TBC_STATUS.md`, `TBC_INVARIANTS.md`,
  `TBC_RELEASE_CHECKLIST.md`, `TBC_PRODUCT_IDENTITY.md` (all under `docs/`).

Remaining limitations: local Edge verification is not Linux/Node-22 CI or live
deployment evidence. The alias comparison exhausts its recorded 273-ID corpus,
not every possible historical payload; all 67 fixtures accepted by main are
retained. Old exports without session data cannot recover an absent round.
Historical phase workflows remain outside this change's cleanup scope. Content
quality was not newly reviewed. These limits do not hide a failed local gate.

## Exact next task

Review the local `Certify TBC preservation repair successor identity` commit for
merge readiness. Obtain separate authorization before pushing, merging or
deploying; then run the unchanged full gate in the release environment and the
read-only deployment comparison only after an authorized release. Do not start
content work or historical-workflow cleanup as part of this repair.

## Local reconciliation — 2026-08-28

Authorization is limited to reconciling the known audit/CI overlaps locally.
Initial HEAD was clean at `af683dd8943d24c6c6f4b251bbbbe2dd99ffde7f`.
`git fetch --all --prune` succeeded; `origin/main` remains
`4eab35e7a615dd714ecf4aa86acc64e54add962f`, with no newly introduced overlap.
The reconciliation branch starts at the unchanged certified repair; its prior
certification is not evidence for the combined tree. No push, PR, main merge or
deployment is authorized in this phase.

### Responsibility map recorded before merge/resolution

| Source / responsibility | Combined-tree enforcement |
| --- | --- |
| Stage 0 `9dbd277`: single-file and 13-asset identity, unchanged acceptance test, repeat extraction, all child exit codes, no gate mutations | Keep the aggregate runner, build/replay checks, both P2A audits and negatives; transfer `recovery-stage0.yml`'s npm-ci, full verify, clean-tree assertion and evidence upload to `release-validate.yml` before retiring the duplicate workflow. |
| Repair `af683dd`: canonical and retained-alias saves, independent recovery copies, import/export, recurring challenge completion and deterministic exact reload | Keep the unchanged 7/7 acceptance, 27/27 compatibility and 19/19 preservation suites. Keep 31/31 successor negatives, historical adapters and successor replay/current-content checks. Do not apply P27D's passive-reload normalizer to these exact-round tests. |
| P27B `7025ef5`: P2B certification metadata and integer certified tier counts in README | Preserve every metadata/tier assertion. Explicitly check Git-normalized candidate identity and raw text identity allowing only LF/CRLF representation; focused fixtures must reject substantive changes even if a Git filter would hide them. |
| P27C `9cc81be`: exactly one automatic PR/main authority | Retain the authority assertions in the release validator, add LF/CRLF trigger fixtures, and keep only `release-validate.yml` automatic for PR/main. Historical dispatch workflows and the branch-specific PR5 helper remain outside release authority. |
| P27D `667ecb3`, `c83c7ac`: whole-product runtime, keyboard/focus, accessible controls, layout profiles, passive reload | Keep the runtime script and all four release-validator browser children, including its established field-name normalizer. Run the release validator inside the complete aggregate using the same server/browser runtime. |
| P27D `142e104`: read-only post-main deployed-byte comparison | Retain the release workflow's conditional deployment probe and evidence. Do not contact or deploy production during this local reconciliation. |
| Playwright dependency/runtime | Use exact 1.55.1 from the existing package/lockfile pair, including playwright-core; replace active workflow ad-hoc 1.55.0 installs with npm ci. P27D requires browser certification, not a documented 1.55.0-specific behavior. Keeping the certified locked pair avoids an untracked runtime override or a downgrade; prove the combined browser suites on it. |
| Historical/product identity | Keep all af683dd product bytes, supporting assets, identity/transition records and historical certification unchanged. No freezer or new identity record is planned. |

### Resolution

The no-commit, non-rebase merge had one textual conflict:
`scripts/p0a-preservation-audit.cjs`. P27B's cached manifest, integer tier-count
checks and P2B metadata checks remain. P0A now reports 20 checks, explicitly
separating `git-normalized-certified-source` (Git filters applied to the actual
working file) from `raw-text-certified-source` (raw Git blob hash, or the hash
after only CRLF-to-LF conversion). The second check is independent of clean
filters and cannot hide substantive bytes. Raw deployed-byte comparison remains
strict in the unchanged P27D deployment probe. No hash authority was re-frozen.

`release-validate.yml` is the sole automatic PR/main certification workflow.
It runs npm ci, installs Chromium, runs the complete `npm run verify`, requires
clean tracked files, retains the push-main-only read-only deployment probe, and
uploads all ignored artifacts for 30 days. Its timeout is 60 minutes to cover
the union of suites and deployment retries. The duplicate recovery workflow was
removed after the responsibility map above was recorded and its checks moved.
Twelve manual phase workflows remain, plus the existing PR5 branch-only helper;
none is a second automatic PR/main release authority. Historical mutation/freezer
helpers were not run and are not part of the authoritative aggregate.

The aggregate now has 29 child commands: its prior 27, plus the reconciliation
regressions and the full release validator. That validator retains its four
browser children (PR5, PR6, P1B, P27D) and all release/content assertions. It now
uses the established certified extractor and requires its exit code to be zero,
even if a summary exists. Its P27C trigger reader is shared with focused tests
and accepts LF/CRLF checkouts. P27D's runtime script, field-name passive-reload
comparison, and the repair's stricter exact-round suites are unchanged; their
different assertions were not collapsed into a weaker common comparison.

Playwright remains exactly 1.55.1 in package.json, package-lock.json and
playwright-core. All eleven former workflow ad-hoc 1.55.0 installs now use npm ci
(including the surviving release workflow); the P2A workflow already used it.
This preserves the repair's locked toolchain and the release checklist's minimal
patch selection instead of overriding it with an untracked install. No package
or lockfile edit was needed. The 15 reconciliation regressions exercise raw and
Git-normalized LF/CRLF identity, substantive changes, certification/tier/README
negatives, workflow authority on both line endings, toolchain agreement and
release-extractor failure propagation with all browser children retained.

No index, supporting asset, question, schema, alias, tier, acceptance test,
successor manifest, transition record or protected historical certificate changed
relative to af683dd. The upstream P0F documentation's historical labeling is
retained as fetched; its frozen certification records are unchanged. The existing
successor identity is sufficient: no append-only transition or new identity is
structurally required. The source-only P2A pin difference seen against origin/main
is the already-certified af683dd change, not a new manifest update.

### Executed combined-tree evidence

Environment: Windows, Node 24.16.0, npm 11.13.0, locked Playwright 1.55.1,
Edge 151.0.4129.107 (`TBC_BROWSER_CHANNEL=msedge`). `npm.cmd ci` exited 0.
`npm.cmd run build` exited 0. The full `npm.cmd run verify` ran from
**2026-08-28 05:00:34 to 05:22:50 UTC**, exited 0, and all **29/29** child
commands exited zero. Build/current identity/replay checks passed before and
after the run. This tested the combined worktree while HEAD was still af683dd,
with MERGE_HEAD 4eab35e7; it does not claim the old repair certification covers
the reconciliation. Exact child arguments, timings and exits are retained in
`artifacts/reconciliation/precommit-verify-report.json`; full output is in
`artifacts/reconciliation/precommit-verify.log`.

| Executed gate in the combined aggregate | Result |
| --- | --- |
| Reconciliation LF/CRLF, metadata/tier, workflow, toolchain and orchestration regressions | 15/15 |
| P0A / P0B / P0D static | 20/20 / 23/23 / 45/45 |
| P0C existing-feature static | Exit 0 |
| P1B static + desktop/mobile browser | 23/23; browser exit 0 |
| Original-source historical P0E/P0F/P1A/P1B/P2E adapters | 5/5 children exit 0 |
| Unchanged Stage 0 behavioral invariants | 7/7 |
| Unchanged preservation matrix | 19/19 |
| Unchanged legacy/alias/recovery/import compatibility matrix | 27/27 |
| P0E whole-product browser | 7/7 children pass |
| Release validator, including unchanged P27D runtime/reload and all four browser children | Exit 0, zero failures; four P27D profiles complete |
| Fresh P2A extraction/audit, twice | Both extraction exits 0; both audits 58/58 |
| P2B/P2C/P2D/P2E read-only audits, both passes | All eight exits 0 |
| Current successor content proof against both extractions | Both exits 0; all five repeat files byte-identical |
| Unchanged P2A negatives / successor negatives | 11/11 / 31/31 |

`node artifacts/preservation-repair/successor-final-comparison.cjs` exited 0;
its copied report is `artifacts/reconciliation/precommit-content-comparison.json`.
This independently confirms all five repeat files, all three full content files
against predecessor evidence, 5,799 canonical / 203 structured / 273 aliases /
6,072 registry / 66 books, all tier totals, question hashes, alias targets,
schema 27, the 12 supporting files and eight historical certificates.
`node artifacts/reconciliation/review-combined-tree.cjs` exited 0 and inventories
all 46 files differing from origin/main (including the two new regression/helper
files). All other differences are the exact inherited Stage 0/repair bytes;
all certification files equal af683dd and both P27D scripts equal origin/main.
No embedded payload diff was printed.

`node --check` passed for all 69 JavaScript files under scripts/assets; the build
also parsed the embedded engine and outer inline scripts. Node `JSON.parse`
accepted all 10 tracked JSON files. An initial PowerShell ConvertFrom-Json probe
rejected package-lock.json's valid empty-string package key; the authoritative
Node parse passed without any JSON edit. `git diff --check` and
`git diff --cached --check` passed.

Additional browser evidence: the unchanged P27D script passed all four profiles
with cached Chromium **151.0.7922.34**, still using Playwright 1.55.1, via
`node --require ./artifacts/reconciliation/cached-chromium.cjs scripts/p27d-runtime-browser-certification.cjs`.
Output and copied screenshots/report are in
`artifacts/reconciliation/cached-chromium-p27d.log` and
`artifacts/reconciliation/cached-chromium-p27d/`. The preload is ignored local
test tooling, not product or CI code. This is explicitly an alternate cached
Chromium run, not the pinned Playwright browser or a Linux CI result.

Browser-install limitation: `npx.cmd playwright install chromium` stalled in the
sandbox; an approved retry with a 20-second connection timeout downloaded to
100% but stalled before installing the executable. Only those identified install
processes were stopped. The required Edge suite and the available alternate
Chromium P27D suite passed; bundled Chromium 1193 and Linux/Node-22 CI remain
unverified locally. No production probe, push, PR, deployment, remote CI run,
historical freezer or content-quality work was performed. Existing heuristic
quality warnings and the prior legacy-corpus coverage limits remain unchanged.

The standalone `npm.cmd test` with `TBC_BROWSER_CHANNEL=msedge` ran from
**05:23:15 to 05:42:22 UTC** on 2026-08-28 and exited 0: **13/13** child
commands passed, repeating the 15 reconciliation regressions, all static and
historical checks, Stage 0 7/7, preservation 19/19, compatibility 27/27,
P0E 7/7, P1B browser, and the complete release validator including P27D.
Evidence: `artifacts/reconciliation/precommit-test.log` and
`artifacts/reconciliation/precommit-test-report.json`.

### Reconciliation decision and changed paths

All available pre-commit gates pass. The reviewed combined tree preserves the
union of Stage 0, repair, P27B, P27C and P27D responsibilities without product
changes or historical-certificate rewrites. Proceed with one local non-rebase
merge commit on `codex/preservation-repair-reconcile`, with parents
`af683dd8943d24c6c6f4b251bbbbe2dd99ffde7f` and
`4eab35e7a615dd714ecf4aa86acc64e54add962f`. Keep the original repair branch at
af683dd. No new identity/transition record or manifest update is needed.

The 31 changed paths relative to the certified repair include the fetched remote
additions and workflow retirement, as well as the bounded local resolutions:

```text
.github/workflows/p0a-preservation.yml
.github/workflows/p0b-player-controls.yml
.github/workflows/p0d-visual-preservation.yml
.github/workflows/p0e-final-certification.yml
.github/workflows/p0f-production-certification.yml
.github/workflows/p1a-pr7-staging.yml
.github/workflows/p1b-pr7-production.yml
.github/workflows/p2a-question-bank-extraction.yml
.github/workflows/p2b-mechanical-integrity.yml
.github/workflows/p2c-semantic-accuracy.yml
.github/workflows/p2d-question-quality.yml
.github/workflows/p2e-difficulty-calibration.yml
.github/workflows/pr5-validate.yml (retired by upstream release-workflow replacement)
.github/workflows/recovery-stage0.yml (responsibilities transferred; removed)
.github/workflows/release-validate.yml
README.md
docs/P0F-PRODUCTION-DEPLOYMENT-CONTRACT.md
docs/P27C-CI-GATE-CONSOLIDATION.md
docs/P27D-RUNTIME-BROWSER-CERTIFICATION.md
docs/QA.md
docs/TBC_RELEASE_CHECKLIST.md
docs/TBC_STATUS.md
release.json
scripts/p0a-preservation-audit.cjs
scripts/p27d-deployment-certification.cjs
scripts/p27d-runtime-browser-certification.cjs
scripts/tbc-reconciliation.test.cjs
scripts/tbc-recovery-stage0.cjs
scripts/tbc-source-identity.cjs
scripts/tbc-workflow-authority.cjs
scripts/validate-release.cjs
```

After committing, rerun `npm.cmd run build` and the complete
`TBC_BROWSER_CHANNEL=msedge npm.cmd run verify` on the resulting SHA, plus parse,
content/identity, combined-diff and clean-tree checks. Preserve those post-commit
results under `artifacts/reconciliation/postcommit-*` and report them in the
handoff; pre-commit results alone do not certify the final commit.

## PR #32 CI-harness repair — 2026-08-28

PR #32's first `Release validation / validate-release` failure was isolated to
the Linux bundled-Chromium test harness, not a product, dependency-install or
identity failure. The job used Node 22 and successfully installed the locked
Playwright 1.55.1 Chromium 140 build. Its first failing preservation assertion
reported Playwright's injected-clock error, `Cannot clear timer: timer created
with requestIdleCallback() but cleared with clearTimeout()`. Four preservation
cases then failed only because the strict existing no-page-error assertion saw
that injected-clock exception. A separate P0E child observed the dynamically
reconciled Duel card as absent between a visible wait and a one-time count.

The committed product is unchanged. Test-only corrections are limited to:

- `scripts/tbc-calendar-fixture.cjs`: a shared init-time mutable `Date`
  fixture for preservation and compatibility browser contexts. It controls
  `new Date()` and `Date.now()`, retains its selected calendar value across
  reloads, and explicitly proves that `setTimeout`, `clearTimeout`,
  `setInterval`, `clearInterval`, `requestIdleCallback`, `cancelIdleCallback`,
  `requestAnimationFrame` and `cancelAnimationFrame` retain their native
  identities. No scheduler API is patched, and the existing no-page-error
  assertions remain unchanged.
- `scripts/p0c-duel-launch-smoke.cjs`: the Play view now polls the exact
  one-card, visible, enabled condition itself, invokes that current card in the
  page, and retains the direct canonical Duel bridge/modal/audit checks. It no
  longer samples a potentially detached locator after a separate visible wait.

Focused Windows/Edge 151.0.4129.107 evidence:

| Command / check | Result |
| --- | --- |
| Shared fixture initial navigation, updated calendar reload, and all eight native scheduling identities | PASS |
| `scripts/tbc-preservation-repair.cjs` | 19/19; Daily Five and Weekly cases completed with zero page errors |
| `scripts/tbc-session-compatibility.cjs` | 27/27 |
| `scripts/p0c-duel-launch-smoke.cjs` | PASS on three consecutive runs |
| `TBC_BROWSER_CHANNEL=msedge npm.cmd run verify` | PASS, 29/29 child commands |
| `TBC_BROWSER_CHANNEL=msedge npm.cmd test` | PASS, 13/13 child commands |
| `node --check` over 62 `scripts/*.cjs` files; `git diff --check` | PASS |

No `index.html`, supporting asset, question/alias/tier data, storage schema,
manifest, historical certificate, package lock, Playwright version, workflow or
deployment configuration changed. The product identity and both P2A extraction
passes remained valid within the complete aggregate run. Ignored evidence is in
`artifacts/reconciliation/ci-harness-*` and the existing `artifacts/` reports.

Bundled Chromium is unavailable locally; no browser download or dependency
change was made. GitHub Actions on Linux/Node 22 with the lockfile Chromium is
the remaining confirmation after the authorized push. The next exact task is to
commit this test-infrastructure-only repair, run the post-commit aggregate
verification, push only `codex/preservation-repair-reconcile`, and inspect PR
#32's replacement CI run. Do not merge or deploy.

### Exact next task after post-commit verification

Obtain separate authorization for the push-and-PR phase: push only the reviewed
reconciliation branch, open its PR against main, and run the combined gate in
Linux/Node-22 CI with the lockfile's bundled Chromium. Do not merge main or deploy
as part of this local reconciliation or infer that local browser evidence is a
remote CI/deployment certificate. No content-quality or workflow-cleanup task is
included.

## Canonical question-content audit — started 2026-08-28

Starting baseline is merged `main` commit
`e09333f1b532ef5fe5d3179335eafbba5e61d53b`. The local-only audit branch is
`codex/question-bank-quality`, created cleanly from that exact commit. No push,
PR, merge, deployment, freezer, manifest update, historical-evidence update, or
successor certification is authorized for this work.

The authoritative runtime inventory has been extracted without changing product
content: `TBC_QB6.activeQuestions()` reports 5,799 unique canonical questions;
`TBC_QB0.registry()` reports 6,072 records including 273 aliases; QB8 reports a
203-question structured subset; all 66 books and the frozen five-tier
distribution are present. The initial P2A extraction and audit passed **58/58**
with the committed canonical, structured, and registry hashes.

`docs/TBC_QUESTION_AUDIT.json` is the non-certification per-question inventory;
it records each canonical ID exactly once with runtime source/index/content hash,
text, choices, answer, Bible evidence, explanation, aliases, collections, mode
eligibility, and audit state. `docs/TBC_QUESTION_AUDIT.md` is its readable
primary-entry index. `node scripts/tbc-question-audit-ledger.cjs check` proves
the inventory has exactly the current runtime IDs, no duplicates or nonexistent
records, and current content/alias identities. Initial result: **5,799/5,799**
entries, **0** complete, **5,799** pending, **0** unresolved. The checker uses
linear membership comparison after an initial quadratic `Set` deep comparison
exhausted Node memory; no product data was involved.

The next exact task is to complete the first individually evidenced batch (no
more than 50 canonical IDs), record each status and Scripture evidence in the
ledger, and stop any source edit that would invalidate active saved sessions
until a compatible non-destructive handling path is established.
