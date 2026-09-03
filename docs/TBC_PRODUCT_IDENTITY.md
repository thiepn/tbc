# TBC preservation-repair successor identity

The sections below retain the first successor's process. The current identity
is the append-only question-revision successor described at the end of this file.

This is the narrowly scoped successor process authorized after the preservation
repair's behavioral verification. It recognizes one exact product; it is not a
general baseline freezer or permission for further product edits.

## Trust and scope

The predecessor is recovery commit `f84d5eff6a93046642c681e9163baa1b0b6b31a2`,
retained by Stage 0 commit `9dbd277da6b8032dd83cd34a850186b06fb1e9fc`, with
`index.html` Git blob `915ec2f5c4eeb270f63b3a04d442b8a8429c5993`.
The only recognized successor is `ce1b30a8fe2c07822001b9542271eea60174f4f1`.

Authorized reasons: current Quick Play restoration, retained-alias compatibility,
independent primary/backup recovery, Daily Five restoration and Weekly Challenge
restoration. Only `index.html` changes among the 13 deployed files. No question,
alias mapping, difficulty, balancing, storage key or schema change is authorized.

`certification/tbc-product-identity.json` records those identities, the 12
unchanged supporting files, the unchanged Stage 0 acceptance-test blob, protected
historical evidence, storage/schema contract and exact content evidence.
`scripts/tbc-product-identity.cjs` pins the manifest's normalized SHA-256 in code.
An edited manifest cannot authorize itself or an edited product.

`certification/tbc-preservation-repair-transition.json` contains 40 ordered,
bounded replacements from the inspected repair, not a question-bank dump. Its
digest is pinned by the current manifest. `scripts/tbc-successor-transition.cjs`
replays them against the predecessor obtained from Git, checks each occurrence
count, compares the complete resulting engine and unchanged outer HTML, and
checks storage names and schema assignments. It parses the engine, outer scripts
and supporting JavaScript. The successor blob is also independently pinned.

The P2A file changes in exactly one place: `source.indexBlobSha1`. The validator
compares the entire normalized file to the Stage 0 Git blob with that single
substitution. Content hashes, distributions, counts and P2B–P2E phase evidence
cannot be rewritten even if the new file is internally consistent.

## Historical gates

`scripts/tbc-historical-preservation.cjs` creates isolated temporary shared Git
clones under ignored `artifacts/product-identity/`, checks out exact commits with
LF bytes, and runs the original scripts unchanged:

| Gate | Historical source |
| --- | --- |
| P0E | `41732fa118154e007549e9094f31b515acfa9e2a` |
| P0F | `762f02de4227bb4719232db95b2657644ada4fcd` |
| P1A | `6ab50b944e434c42cae96eab2341573f51eeaf3a` |
| P1B | `33252c17f89e7aa750c7df60f495a22b19d3c673` |
| P2E comparator | Stage 0 `9dbd277…`, with product bytes equal to recovery `f84d5ef…` |

The Stage 0 P2E comparator retains the historical calibration expectation and
reconstructs it only in a temporary file. All historical child exit codes must be
zero, and tracked files must remain unchanged after each gate. Logs survive;
temporary clones are removed only after checking their resolved workspace paths.
No live-site P0F tests, network clones, pushes or deployments occur.

The aggregate uses this adapter instead of comparing historical P2E source pins
to today's product. Original historical scripts and manifests remain untouched
and available for their historical sources. Current P0A–P0D/P1B checks and all
current browser suites still run; this separation does not waive a gate.

## Content proof and negative tests

Two fresh P2A extractions must pass their original audits and match each other in
all five files. Each is additionally checked against the pinned successor content
evidence: all three full content-artifact hashes, every canonical and structured
ID/hash pair, all alias targets, semantic aggregates, counts, tiers and schema.
The evidence matches the already verified predecessor content; no content hash
is re-frozen. The P2A source pin identifies the product that was actually read.

`scripts/tbc-product-identity.test.cjs` uses temporary copies to reject prompt,
answer, distractor, ID, alias, tier, count, aggregate, per-question hash, structured
subset, schema, asset, acceptance-test, predecessor, successor, manifest,
transition and historical-certificate mutations. It also simulates prohibited
broad-freezer rewrites of P2A hashes, distributions and phase evidence. The
existing P2A negative suite remains unchanged.

## Read-only commands

```sh
node scripts/tbc-product-identity.cjs
node scripts/tbc-successor-transition.cjs
node scripts/tbc-historical-preservation.cjs
npm run build
npm run verify
```

`verify` includes the two fresh extractions, content validation against each,
both negative suites, all behavioral suites and a final build recheck. Standalone
content validation uses `node scripts/tbc-product-identity.cjs --content artifacts/p2a`;
the negative suite uses `node --test scripts/tbc-product-identity.test.cjs` after
extraction. The documented Edge fallback remains available on Windows.

No command above changes a product or baseline. The one-time authorization was
implemented by recording the verified edits and evidence, pinning both records,
and changing only the P2A source field. No P2B–P2E freezer was used. There is no
automatic update command: a future product change requires a separate explicit
authorization, reviewed transition and content-preservation proof. Do not update
the manifest digest just to make a failed test pass.

## Authorized question-revision successor

The certified production predecessor is `e09333f1b532ef5fe5d3179335eafbba5e61d53b`.
Its authoritative identity remains in `certification/tbc-product-identity.json`:
index Git blob `ce1b30a8fe2c07822001b9542271eea60174f4f1`. That manifest and the
original forty-edit transition are unchanged historical records.

The new, independently pinned `certification/tbc-question-revision-identity.json`
recognizes content commit `1ca52ecb9ba3781c4212610d2b3fff83e2c11b6e`, index blob
`2009bc20e2fb95646ccd54976342d79bbabe0223`. Its append-only transition is
`certification/tbc-question-revision-transition.json`. This record contains old
and new product/content hashes, thirteen bounded positional engine edits, the
four changed IDs and their exact fingerprints, predecessor/current audit rows,
archive guarantees and the incomplete review count: 100 reviewed, 5,699 pending.
It is not a whole-bank editorial certificate.

The deployed surface remains the same thirteen files. The readable revision
core and its fixtures are tooling; their core is already embedded in index.html.
No new script is fetched by the deployed application. The twelve supporting
assets retain their original identities. Runtime source and question data do not
change during this certification.

P2A's designated `source.indexBlobSha1` moves to the new product. Its historical
hashes, counts, tier distribution and P2B–P2E evidence remain untouched. The
read-only `currentP2ABaseline()` validates that exact source-only substitution,
then supplies only the new canonical/registry hash expectations from the pinned
successor. Both the P2A audit and release validator use that explicit authority;
none of their structural or runtime assertions are removed. The structured hash
is unchanged. Editing either authority cannot self-authorize another product.

Build replays the historical transition against its historical source and then
the new transition against production. Content validation reverses only the four
recorded canonical/registry rows and requires byte-identical predecessor artifact
hashes, proving that all other IDs, fields, aliases and structured content remain
unchanged. Git-filtered and independently checked LF/CRLF identities remain
distinct checks; deployed-byte verification stays strict.

The original 31 successor negatives and 11 P2A negatives remain intact. Seven
additional successor tests protect authority separation, old records and missing
new records; `npm run verify` now includes that additional negative suite. The
57-case revision suite and four-question quality gate remain explicit standalone
certification commands, alongside the aggregate, with results in TBC_STATUS.md.
No freezer or automatic identity updater is introduced.

## Batch 04 append-only successor

The next certified predecessor is merged production commit
`c2a129cf9e41fff089dc361c0019acb2148ccaef`, whose `index.html` Git blob is
`29994bf8bf0357a92a9c84bd84d327d3f5538221`. The independently pinned
`certification/tbc-batch04-question-revision-identity.json` recognizes only
successor blob `3ece1c38070abe3e98b47696bba34b2eee2bb2c1`; its transition is
`certification/tbc-batch04-question-revision-transition.json`.

That transition replays two bounded engine edits: it appends the exact c2
snapshot for `1-timothy-6-6-context`, then replaces only its overlapping first
distractor with “Paul begins by praising God after severe affliction.” The
predecessor fingerprint `9857d3803ebca3b2d38580a0f23263fdddaef96ba4e119494bb6aa73ce098377`
and successor fingerprint `37aca4e8b8907af0dc61aeb4dc5b7d9e4734ffc42747d8c2c8fe9c99767be9c7`
are deterministic static-question identities. The prior five archive rows,
outer HTML, storage names, save schema and twelve supporting assets must match
their predecessor exactly.

Current content validation first reverses the Batch 04 row and requires exact
Batch 03 artifacts, then reverses the Batch 03 row and requires exact first-
successor artifacts. This preserves both earlier proofs while recognizing the
new canonical and registry hashes. Historical P2A and predecessor certificates
remain byte-identical; `currentP2ABaseline()` overlays only the current source
and semantic expectations from the new append-only manifest. No freezer or
historical rewrite is part of this successor.
