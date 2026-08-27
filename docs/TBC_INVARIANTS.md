# TBC preservation invariants

Authority: the committed `certification/p2a-question-bank-extraction-baseline.json`,
the initialized public QB0/QB6/QB8/QB11 runtime APIs, and the baseline identified
in `TBC_STATUS.md`. Historical phase reports are evidence, not replacement authorities.

## Question identities and counts

| Layer | Count | Meaning |
| --- | ---: | --- |
| Source registry | 6,072 | `TBC_QB0.registry()`; includes retained aliases |
| Canonical active bank | 5,799 | `TBC_QB6.activeQuestions()`; unique canonical IDs |
| Aliases | 273 | Excluded redundant registry entries, in 270 clusters; not extra playable questions |
| Structured | 203 | `TBC_QB8.canonicalStructured()`; exact subset of 5,799, not added to it |
| Non-structured | 5,596 | Remaining canonical questions |
| Bible books | 66 | All canonical books represented |

Difficulty tiers: Beginner **1,338**, Easy **1,668**, Standard **1,132**,
Advanced **1,140**, Expert **521**. The earlier P1B/P2A distribution
1,338 / 1,666 / 1,133 / 1,141 / 521 is historical: P2E already changed it.
Recovery does not rebalance it.

Derived rounds, focused pools, adaptive selections, teaching passages and
generated interaction variations are not additional canonical questions.
Effective/playable pool sizes depend on mode, tier, progress and eligibility;
they must not be summed into a second authoritative bank total.

Frozen content identities and recognized product successor (do not re-freeze to conceal a failure):

```text
predecessor index Git blob: 915ec2f5c4eeb270f63b3a04d442b8a8429c5993
authorized successor index Git blob: ce1b30a8fe2c07822001b9542271eea60174f4f1
canonical SHA-256: 1f795f1ca8d24fe393a9a4d77ac30dbeb10083c30e63c483e613c9c4bda6885b
structured SHA-256: 4b6a0c8c6a7b438a8ce0bd62b4a1464680bee58d0c0686dff077fb9e86458fcb
registry SHA-256: 9f03475faa42b2ba6317c950dc3eb4049e7acf8001df7bfee92e83dffba05f9d
```

Git-filtered candidate identity handles LF/CRLF checkout differences. It must
hash the actual working file, not substitute `HEAD` for uncommitted content.
The five generated P2A JSON files must be byte-identical across repeat runs.

## Product and persistence

- Preserve 22 collections, 25 Journey foundation stages, 63 Learning Path units,
  all five tiers and all 66 books. `TBC_LEARNING_PATH.stages` contains 63;
  `foundationStages` contains 25. Do not conflate them.
- Preserve Quick Play, Duel, Campaign, Expedition, Journey, Learning Path,
  Adaptive Review, Daily Five (5 questions), Weekly Challenge (15 questions).
  Campaign currently has 72 missions across 12 arcs.
- Preserve canonical local saves, recovery copies, export/import, existing
  migrations and active-session restoration. Save schema is 27; the principal
  key remains `theBibleChallenge_v21`, with `_recovery` and `_activeRound` keys.
  Historical key suffixes are compatibility identifiers, not current versions.
- Schema-26 Beginner/Easy settings migrate to Standard; schema-27 Beginner/Easy
  settings must remain distinct. Never reset user progress to satisfy tests.
- Preserve the single-file embedded core and current enhancement assets.
  No compile/bundle rewrite is required. `npm run build` proves all 13 deployed
  files match the pinned current identity under Git normalization, replays the
  exact authorized predecessor-to-successor repair, and permits only P2A's source
  pin to differ from Stage 0. See `TBC_PRODUCT_IDENTITY.md`; historical evidence
  and all content hashes remain immutable.
- Preserve mobile/desktop support and existing offline functionality. The core
  is embedded; enhancement assets are separate. There is no service-worker
  offline-refresh guarantee. Loaded-core offline checks are not proof that a
  fresh hosted visit or refresh without network works.

The gate fails on violations. A pre-existing product failure is a release blocker,
not permission to weaken a check or change product code during Stage 0.

## Verification ownership

`npm run verify` combines static preservation, whole-product P0E browser suites,
P1B desktop/mobile integration, Stage 0 runtime/persistence checks, P2A extraction
twice, five-file deterministic comparison, three frozen hashes, negative audit
tests, and read-only P2B–P2E audits. Quality warnings do not certify all question
content. See the release checklist for commands and test-environment limits.
