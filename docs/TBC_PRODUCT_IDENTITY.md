# TBC preservation-repair successor identity

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
