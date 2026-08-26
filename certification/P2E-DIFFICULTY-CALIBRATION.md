# TBC P2E — Difficulty Calibration & Tier Integrity

P2E is the dedicated difficulty-calibration successor to P2D. Earlier phases deliberately preserved difficulty while repairing mechanics, semantics, and assessment wording; P2E resolves that deferred calibration instead of carrying temporary pins indefinitely.

## Scope

P2E audits all 5,799 canonical questions for:

- consistency between each QB5 numeric difficulty signal and the declared five-tier difficulty;
- complete removal of temporary P2C/P2D difficulty-preservation overrides;
- recalibration of the ten questions whose wording/evidence had been changed in earlier phases;
- coherence of the QB6 active-tier manifest and QB11 release-freeze tier contract;
- deterministic extraction and frozen aggregate identities after calibration.

P2E does not use broad heuristic guesses to re-tier unrelated questions. Near-boundary scores are recorded as review candidates rather than treated as defects.

## Deferred pins resolved

P2C and P2D had introduced ten temporary pins solely to prevent semantic or wording repairs from silently changing difficulty before a dedicated calibration phase. P2E removes all ten.

Six P2D wording repairs naturally retain their existing score and tier after the pins are removed:

- `d4.easy.place.place-elah` — Beginner / 19
- `place.elah.significance` — Standard / 49
- `place.jordan.significance` — Standard / 49
- `place.shechem.significance` — Standard / 49
- `place.shiloh.significance` — Advanced / 64
- `place.valley-elah.v20-significance` — Standard / 49

Four P2C questions legitimately recalibrate from the temporary preserved value to the score produced by their repaired current form:

- `d4.easy.major.1-chronicles-inventory-1.01` — Advanced / 63 → **Easy / 23**
- `d4.easy.mode.parables.luke-good-samaritan.16` — Expert / 97 → **Easy / 29**
- `phase9.nt.romans.7.structure` — Standard / 42 → **Advanced / 62**
- `v402.miracle.feeding-bread-discourse` — Advanced / 60 → **Expert / 80**

These four moves also align with the original authored difficulty direction of those questions before the earlier semantic-edit preservation layer intervened.

## Recalibrated distribution

The certified P2E distribution is:

- Beginner: **1,338**
- Easy: **1,668**
- Standard: **1,132**
- Advanced: **1,140**
- Expert: **521**

The total remains 5,799.

QB6's active-tier manifest and QB11's expected-tier release freeze are updated to these same counts. QB11 must pass normally; P2E does not bypass or disable that runtime audit.

## Extraction contract

P2E replaces the historical hard-coded tier assumption in workflow execution with a baseline-aware P2A extraction wrapper. The original extraction logic is unchanged; the wrapper substitutes only the certified `expected.difficultyDistribution` into a temporary copy before execution. This makes difficulty calibration a versioned certification property rather than a permanent constant from an earlier phase.

## Preservation boundary

P2E makes no question-text, answer, distractor, Scripture-reference, explanation, routing, collection, or gameplay changes. The monolith delta from the P2D production merge `3fc262f187ff9186885f9e48af86963e9d39c34c` is limited to:

1. removal of the ten temporary P2C/P2D difficulty pins;
2. update of the QB6 active-tier manifest;
3. update of the QB11 expected-tier freeze.

An exact preservation audit reconstructs this transformation from the P2D production source and rejects unrelated monolith changes.

## Completion gate

P2E passes only when:

- all 5,799 canonical questions remain represented;
- every canonical question has a finite QB5 difficulty signal in the valid range;
- every QB5 signal maps to the declared tier boundaries consistently;
- all ten deferred pins are absent;
- the four expected recalibrations and six expected unchanged questions match exactly;
- the recalibrated distribution is 1,338 / 1,668 / 1,132 / 1,140 / 521;
- QB11's bank audit passes under the new frozen distribution;
- P2B mechanical, P2C semantic, and P2D question-quality audits remain green;
- repeated P2A extraction and P2E reporting are byte-for-byte deterministic;
- the recalibrated source and aggregate hashes are frozen;
- production preservation gates remain green.
