# TBC P2D — Question Quality, Ambiguity & Distractor Audit

P2D is the successor gate to P2C. P2A established a deterministic 5,799-question representation, P2B removed mechanically confirmed defects, and P2C repaired Scripture/stem/evidence semantic mismatches. P2D audits whether multiple-choice questions are fair and well-formed as assessment items.

## Scope

P2D reviews all 5,799 canonical questions and, specifically, all 5,596 multiple-choice questions for mechanically or semantically defensible quality failures including:

- answer leakage from the stem;
- metadata marking multiple defensible answers or unresolved quality flags;
- `all/none/both` meta-options;
- task/domain mismatch between a generic stem and every offered choice;
- obvious answer-format cues;
- unusually vague stems;
- near-duplicate choices;
- extreme correct-answer length cues;
- distractor feedback that falls back to generic contextual language.

Only the first group of high-confidence conditions is blocking. Heuristic cues such as option length, unique negation, near-duplicate wording, and generic distractor feedback are recorded as review warnings rather than being automatically rewritten.

## Confirmed defects

P2D found six canonical questions with the same confirmed assessment-task mismatch. Each used the QB1-generated stem:

`Which option identifies the place associated with the cited passage?`

but all four choices were descriptive significance statements rather than place names. A player was therefore asked to perform a different task from the one represented by the answer set.

Affected IDs:

- `d4.easy.place.place-elah`
- `place.elah.significance`
- `place.jordan.significance`
- `place.shechem.significance`
- `place.shiloh.significance`
- `place.valley-elah.v20-significance`

The repair changes only the QB1 override stem to:

`Which statement best describes the significance of the cited location?`

Answers, distractors, references, explanations, routing, and gameplay behavior are unchanged.

## Difficulty preservation

QB5 dynamically re-scores wording. P2D is a question-quality phase, not a difficulty-recalibration phase, so the six repaired questions retain their P2C-certified tier and score through one explicit six-ID preservation map:

- `d4.easy.place.place-elah` — Beginner / 19
- `place.elah.significance` — Standard / 49
- `place.jordan.significance` — Standard / 49
- `place.shechem.significance` — Standard / 49
- `place.shiloh.significance` — Advanced / 64
- `place.valley-elah.v20-significance` — Standard / 49

The global five-tier distribution must therefore remain **1,338 Beginner / 1,666 Easy / 1,133 Standard / 1,141 Advanced / 521 Expert**.

## Review warnings

P2D deliberately does not auto-rewrite lower-confidence patterns. The audit records, but does not fail on, candidates such as:

- a correct option being the only choice with explicit negation;
- extreme answer-length asymmetry;
- high lexical similarity between choices;
- vague but still answerable stems;
- all three wrong-answer explanations using QB7 fallback contextual feedback.

These warning classes are evidence for later editorial/pedagogical phases, not proof that the question is invalid.

## Preservation boundary

P2D changes only the embedded question engine through six approved prompt transformations plus one six-ID difficulty-preservation injection. Its exact preservation audit reconstructs the expected P2D candidate from the P2C production merge `fc5be02b1163306177cd7de1588b4664cbfa0143` and rejects any unrelated monolith change.

## Completion gate

P2D passes only when:

- all 5,799 canonical questions and all 5,596 choice questions remain represented;
- P2B continues to report zero mechanical defects;
- P2C continues to report zero semantic/reference defects;
- inherited QB1 leakage scanning remains at zero blockers;
- P2D reports zero confirmed question-quality blockers;
- all six confirmed place/significance stem mismatches are repaired;
- the frozen difficulty distribution is unchanged;
- repeated P2A extraction is byte-for-byte deterministic;
- the corrected source and aggregate identities are frozen;
- P0A/P0C/P1B production-preservation gates remain green.
