# The Bible Challenge repository contract

- Read `docs/TBC_STATUS.md`, `docs/TBC_INVARIANTS.md`, and `docs/TBC_RELEASE_CHECKLIST.md` before changing this repository.
- Preserve the single-file `index.html` core and its existing enhancement assets. Recovery Stage 0 changes tooling and documentation only: no question edits, UI redesign, balancing, gameplay, save-schema changes, or system removal.
- Never print the complete multi-megabyte `index.html` or its compressed/decompressed payload. Use bounded searches, counts, hashes, and targeted snippets. Never run an unbounded text diff of its embedded-package line.
- Preserve all counts and systems in `docs/TBC_INVARIANTS.md`. The committed P2A manifest is the current content authority; do not silently re-freeze it to make a test pass.
- Use `npm ci`, `npx playwright install chromium`, and `npm run verify`. `npm run build` validates the existing static product; it does not rebuild or rewrite it. `npm run deploy:verify` is read-only.
- The authoritative gate must not repair repository content or re-freeze baselines. The P2E preservation comparator may reconstruct its historical expected result in an isolated temporary file only. Historical phase workflows are not permission to run their mutation steps against the working tree.
- Generated evidence belongs in ignored `artifacts/`, not in the deployable product. Record concise results, unresolved risks, baseline identity, and the exact next task in `docs/TBC_STATUS.md`.
- Distinguish implemented, committed, merged, deployed, tested, and certified. Report tests only when actually executed, including failures and environment differences.
- Preserve user changes. Use a recovery branch, review the diff for accidental product changes, and commit only requested work. Do not merge, push, deploy, or start the next task without authorization.
