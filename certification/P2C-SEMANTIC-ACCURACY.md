# TBC P2C — Biblical & Semantic Accuracy Audit

P2C is the successor gate to P2B. P2B established that the 5,799-question canonical bank is mechanically coherent; P2C checks whether the semantic form of each reviewed question remains aligned with its answer domain and Scripture anchors.

## Scope

P2C screens the full canonical representation for:

- formal Scripture-reference integrity across `bibleReference` and evidence fields;
- alignment between each question's primary-book metadata and cited Scripture books;
- semantic stem/answer-domain mismatches introduced by later editorial overrides;
- explicit evidence coverage where the question itself depends on more than one passage or chapter;
- descriptive/non-reference placeholders embedded in Scripture-reference fields;
- the previously deferred cross-book matrix exception.

P2C does **not** claim that an automated check can prove every theological or interpretive judgment in 5,799 questions. It repairs only defects with a strong, reviewable semantic basis. Distractor quality, ambiguity calibration, broader difficulty review, redundancy, and feedback pedagogy remain separate later P2 concerns.

## Confirmed defects

The P2C screen found 12 canonical questions requiring correction.

### 1. Nine stem/domain mismatches

Later QB1 leakage-neutralization overrides had replaced semantically valid stems with generic templates that asked for the wrong kind of answer.

- `d4.easy.mode.parables.luke-good-samaritan.16` — asked for a person; options state the parable's closing challenge.
- `d4.easy.mode.parables.matt-tenants.09` — asked for a person; options name parables.
- `phase6.jesus.luke.cross.criminal` — asked for a person; options are assurances concerning the criminal.
- `phase8.wp.joel.spirit.scope` — asked for a person; options describe the scope of Joel's Spirit promise.
- `phase9.nt.2-peter.2.meaning` — asked for a person; options describe the contradiction exposed in false teachers.
- `d4.easy.major.1-chronicles-inventory-1.01` — asked for a place; options summarize literary/theological emphases.
- `phase9.nt.1-timothy.2.context` — asked for a place; options explain how the instruction fits the letter's wider mission.
- `v402.miracle.feeding-bread-discourse` — asked for a place; options explain the relationship between the feeding sign and discourse.
- `v21.clueReduction.39` — asked for an event; all options identify people and the correct answer is John the Baptist.

P2C restores semantically aligned, leakage-safe stems while leaving answers and option sets unchanged.

### 2. Two evidence-set gaps in Romans

- `phase9.nt.romans.7.structure` asks how Romans 8 answers a predicament developed in Romans 7. Evidence now includes both Romans 7 and Romans 8.
- `phase9.nt.romans.8.book-understanding` asks what question drives Romans 9–11 after the promises of Romans 8. Evidence now includes Romans 8 and Romans 9–11.

The primary display references remain focused on the target units; P2C only completes the supporting evidence set.

### 3. One non-formal Passover reference

`phase11.connection.passover-christ` contained `Gospel Passion narratives` inside a field otherwise reserved for formal Scripture references. P2C replaces that descriptive placeholder with `John 19:14, 36`, retaining Exodus 12 and 1 Corinthians 5:7. The resulting anchor is:

`Exodus 12; 1 Corinthians 5:7; John 19:14, 36`

This keeps the explicit Passover identification in 1 Corinthians 5:7 while supplying a formal Passion-narrative anchor in John 19.

## Leakage and difficulty preservation

The repaired stems are also required to pass the inherited QB1 answer-leakage audit. Four first-draft semantic stems were rephrased after QB1 correctly detected that they repeated terms unique to the correct option. The final P2C stems pass QB1 with zero blockers.

Because QB5 dynamically re-scores wording and evidence, the semantic repairs would otherwise have moved four already-certified questions between difficulty tiers. P2C therefore preserves the pre-P2C QB5 tier/score for those four IDs only. This is one explicit policy injection containing four frozen pins; it keeps the global distribution at **1,338 Beginner / 1,666 Easy / 1,133 Standard / 1,141 Advanced / 521 Expert** while allowing the semantic defects themselves to be corrected.

## Accepted cross-book case

`phase11.match.letters` remains intentionally cross-book across Romans, Galatians, Hebrews, and James. It therefore correctly has no single `book` value. P2C records this as an accepted semantic exception rather than manufacturing a false primary book.

## Preservation boundary

P2C changes only the embedded question engine through **15 approved question-field transformations across 12 confirmed questions plus one targeted difficulty-preservation injection containing four certified pins**. An exact preservation audit reconstructs the expected candidate from the P2B production merge and rejects any unrelated monolith change.

## Completion gate

P2C passes only when:

- all 5,799 canonical questions, 6,072 registry records, 273 aliases, and 203 structured questions remain represented;
- P2B still reports zero mechanical defects;
- inherited QB1 leakage scanning reports zero blockers;
- all Scripture-reference fields pass the formal-reference screen;
- primary-book metadata remains aligned with cited books, with the documented cross-book matrix exception;
- all nine confirmed stem/domain defects are repaired;
- both Romans evidence gaps are repaired;
- the descriptive Passover placeholder is replaced by a formal reference;
- the frozen five-tier difficulty distribution remains unchanged;
- P2A extraction remains deterministic byte-for-byte;
- the corrected source and aggregate hashes are frozen;
- existing production-preservation gates remain green.
