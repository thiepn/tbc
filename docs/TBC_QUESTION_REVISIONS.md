# Active-round question revisions, version 1

This is a compatibility mechanism, not a content certificate or another bank.
The allowlist and its resolver are embedded in `index.html`. The readable core
in `scripts/tbc-question-revision-core.js` must be embedded verbatim; the validator
checks that equality. No new deployed asset, storage key or save schema is used.

## Authority and identity

Each record has a stable canonical ID, predecessor Git commit, a SHA-256
question fingerprint, a full JSON snapshot of the predecessor's runtime source,
and a separate SHA-256 over that full snapshot. Records are keyed by ID plus
fingerprint, so multiple explicit revisions of one ID can coexist.

Version 1 fingerprints the exact strings and static fields listed in `fields`
in the core, including answer semantics, references, tier, knowledge IDs,
structured answer data and verse identity. Object keys are sorted, absent fields
are null, and choices are sorted without normalizing their text. Choice order
is not content identity because selection shuffles it; hydration preserves the
saved order. There is no trusted fingerprint supplied by the save: the resolver
computes it from saved content, including the ID. This also supports schema-27
saves written before fingerprints existed.

Selections, hints-used/hidden state, timestamps, XP, results, mastery transitions
(`v21Evidence`), sequence ordering and matching drafts are round state. They are
not part of immutable question identity. The existing validation/sanitization of
that state remains in force, including V213 mode, scope, totals and response
integrity. `hint` itself is static authored help text and is fingerprinted.

## Restoration and selection boundary

`v25QuestionSource` and all question pools remain unchanged by this mechanism.
Saved-only source resolution is used by the V18, V21 and V211 integrity layers,
the existing alias-aware V25 guard and the base passage integrity path. A current
question must match the current source fingerprint (or its authoritative QB8
prepared representation) as well as its established validation path. A historical candidate must
match the exact archived fingerprint and still have a unique, active canonical
registry identity; aliases are not manufactured from archive entries. Existing
retained aliases continue through their existing registry path.

Historical hydration reconstructs the trusted snapshot's static metadata and
verse, retains the saved choices/order/progress, then passes the existing round
validators, recall configuration, structured preparation and feedback layers.
No archive object is inserted into a registry, current-source cache or selection
pool. The returned snapshot is a copy; saved data cannot mutate the archive.
The same path serves normal reload and active-round import. The existing
primary/backup validation, precedence, repair and rollback logic is unchanged.
Completion and intentional abandonment still clear the active round normally.

Only recognized schema-27 round-state fields may overlay the historical source.
Unserialized save properties cannot override archived learning objectives,
Scripture evidence, verse data or QB5/QB6 metadata. Static identity is checked
before reconstruction; option order and validated dynamic answer state survive.

A malformed archive disables historical lookup but does not crash startup or
disable current validation. The standalone validator fails it explicitly. The
embedded archive is trusted product code, not executable data supplied by a
save. Hashes alone do not authenticate a forged archive: tooling also compares
its full snapshot with the authoritative Git predecessor.

## Read-only validation

With the Stage 0 server on port 4173:

```sh
node scripts/tbc-question-revision-tests.cjs
node scripts/tbc-question-revisions.cjs
```

The browser harness reads predecessor HTML directly from commit
`e09333f1b532ef5fe5d3179335eafbba5e61d53b`, executes it in an isolated context,
and compares initialized runtime data with the working candidate. Its generated
captures and fixtures live only in ignored `artifacts/question-revisions/`.
Constructed mode fixtures use exact predecessor source objects, the real launch,
answer and serializer functions, and the intended tier. They are explicitly
constructed coverage fixtures, not a claim that every target occurs naturally
in a particular daily seed. Ordinary mode suites separately test selection.

The foundation uses isolated synthetic archives, including a changed answer key
and two revisions of one ID. No synthetic revision enters deployed content.
The validator checks all 5,799 IDs, unchanged sources/registry records, 273
aliases, 203 structured IDs, tier assignments, schema and sampled deterministic
pool identities. Changed IDs must have exact predecessor records; unnecessary,
missing, duplicate, malformed and stale records fail. Future release provenance
needs an explicit extension of this audit's predecessor policy; the runtime
format already supports multiple revisions. No freezer or manifest update is
part of this process.

## Current authorized predecessor policy

The read-only validator recognizes two explicit production predecessors. The four
PR #34 corrections retain their exact `e09333f1b532ef5fe5d3179335eafbba5e61d53b`
snapshots. Batch 03 adds only `1-samuel-12-24-context` from certified production
commit `dded986a1fce1683acc04b621939e67288084c17`. Each ID is bound to its declared
predecessor; a record cannot substitute another valid commit or borrow another
question's snapshot.

The browser suite captures both commits independently. Its current 64 cases
include the original 24 exact-predecessor lifecycle rows and six equivalent rows
for the Batch 03 correction, plus one export/import and unknown-revision case per
archived ID. The separate Batch 03 quality gate proves the correction changes one
distractor, retains the keyed answer and position, and limits ledger edits to
entries 101–150. These checks do not certify a new product identity.

Frozen source/content gates intentionally block release after a source or
question change. Passing these focused tests is not successor certification.
