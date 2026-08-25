# TBC P2B — Mechanical Integrity Audit

P2B is the exhaustive mechanical validation gate for the canonical 5,799-question TBC bank extracted by P2A.

## Scope

P2B validates mechanically detectable integrity defects, including:

- missing, malformed, duplicate, or orphaned canonical IDs;
- source-index collisions and broken registry/alias targets;
- invalid book and difficulty metadata;
- empty question/answer/option fields;
- malformed option counts and duplicate choices;
- correct answers absent from the option set;
- malformed distractor structures and answers leaking into distractors;
- invalid structured-question membership;
- invalid interaction types;
- insertion questions whose option domain is not exactly positions `0`, `1`, `2`, and `3`;
- obvious corrupted Unicode, control characters, mojibake, and invalid reference placeholders.

The audit intentionally does not resolve theological, historical, pedagogical, or difficulty-quality questions that require semantic judgment; those belong to later P2 phases.

## Confirmed defects discovered

The frozen P2A extraction exposed 31 invariant failures across 30 canonical questions:

1. 29 insertion questions had one numeric insertion position replaced by an unrelated person-name distractor in the QB2 reconstruction layer.
2. `numbers-6-24-context` had a punctuation mismatch between its correct answer and the corresponding option, causing both an answer-membership failure and a four-distractor structure.

The original insertion source structures established the intended four-position domain. P2B therefore makes only the mechanically compelled repairs: restore the missing numeric position while preserving option order, and restore the missing terminal period in the Numbers 6:24 option.

## Accepted warnings

Two non-defects are retained for later semantic review:

- `phase11.match.letters` is intentionally cross-book (`Romans; Galatians; Hebrews; James`) and therefore has no single `book` value.
- `phase11.connection.passover-christ` uses the descriptive reference `Gospel Passion narratives` rather than a formal verse reference.

## Completion gate

P2B passes only when:

- all 5,799 canonical questions remain represented;
- all 6,072 registry records and 273 aliases remain intact;
- all 203 structured questions remain intact;
- the mechanical audit reports **0 confirmed defects**;
- repeated extraction is byte-for-byte deterministic;
- corrected P2A source and aggregate hashes are frozen;
- existing production-preservation audits remain green.
