# TBC release checklist

Use Node 22 in CI (Node >=22 supported locally). `package-lock.json` pins the
audit toolchain. Playwright 1.55.1 is the minimal security patch over the historic
1.55.0 pin; changing the toolchain does not change the deployed application.

## Authoritative commands

Run from the repository root, with port 4173 free. On Windows use `npm.cmd` and
`npx.cmd` if PowerShell execution policy blocks the `.ps1` shims.

```sh
npm ci
npx playwright install chromium
npm run build
npm test
npm run audit:p2a
npm run verify
npm run deploy:verify
git diff --check
git status --short --branch
```

- `build`: validates the pinned current identity, exact authorized repair replay,
  12 unchanged supporting files, protected evidence, storage/schema, acceptance
  test and P2A ancestry; emits no bundle and never rewrites the product.
- `test`: current static P0A/B/C/D/P1B, original-source historical preservation,
  Stage 0 runtime/persistence, the 19-case repair and 27-case compatibility
  suites, all seven P0E browser suites, P1B desktop/mobile smoke, reconciliation
  regressions, and the release validator including P27D runtime/reload coverage.
- `audit:p2a`: certified extraction twice, audit twice, read-only successor audits,
  five-file byte comparison, successor content proof, and both P2A and successor
  corruption/missing/stale-artifact and tampering negative suites.
- `verify`: the complete local Stage 0 gate (`build` + `test` + `audit:p2a`).
  It serves the working candidate itself and exits nonzero on any failed suite.
- `deploy:verify`: read-only HTTPS fetch of all 13 deployed files, comparing their
  exact bytes with `HEAD` Git blobs. It follows HTTPS redirects, rejects a
  downgrade, and requires candidate product files to match `HEAD`. It neither
  deploys nor proves a workflow ran. Override only deliberately with
  `npm run deploy:verify -- --url=https://example.test/tbc/`.

Only `release-validate.yml` automatically certifies PR/main. It incorporates the
retired Recovery Stage 0 workflow's full gate, clean-tree check and evidence
upload; all workflow Playwright installs use the exact existing lockfile via npm ci.
CI installs Chromium with `npx playwright install --with-deps chromium` and runs
the same commands. Evidence is in ignored `artifacts/`; CI uploads it on success
or failure. Do not track regenerated question dumps or screenshots.

An explicitly labelled local fallback is available when browser installation is
blocked: in PowerShell, `$env:TBC_BROWSER_CHANNEL='msedge'`, then run the same
commands; clear it with `Remove-Item Env:TBC_BROWSER_CHANNEL`. This uses installed
Edge with the locked Playwright package. It is **not** a bundled-Chromium CI pass.

## Before committing

- Read `TBC_STATUS.md` and `TBC_INVARIANTS.md`; preserve unrelated changes.
- Run the complete gate and record every command, environment, pass/fail and
  unresolved risk. Do not label an API-presence probe a behavior test.
- Review the diff, especially generated files, workflow permissions and scripts.
  Stage 0 itself made no product or manifest changes. Its explicitly authorized
  successor is limited to the exact repair and source-only P2A update documented
  in `TBC_PRODUCT_IDENTITY.md`. Never print the embedded payload diff; inspect
  bounded repair replay and the source-pin diff instead:

  ```sh
  node scripts/tbc-successor-transition.cjs
  git diff f84d5eff6a93046642c681e9163baa1b0b6b31a2 -- assets/ favicon.svg certification/p2a-question-bank-extraction-baseline.json
  git diff --check
  ```

- Update `TBC_STATUS.md` with completed scope, baseline, executed tests/results,
  unresolved risks and one exact next task. Do not silently waive a failing gate.
- Commit only completed authorized work on the recovery branch. A tooling-only
  commit may record pre-existing product failures, but must label the gate failed
  and keep those failures blocking release. A local commit is not merged,
  deployed, CI-tested or product-certified.

## Deployment, only with separate authorization

The observed Pages setting is legacy branch publishing from `main` at `/`.
There is no repository build/deploy command to run: an authorized merge/push to
`main` triggers GitHub Pages. Stage 0 must not do either. Check current settings
with `gh api repos/thiepn/tbc/pages`, and check the exact SHA's Actions/Pages runs.
After an authorized release, run `npm run deploy:verify` from its clean checkout.

The production alias currently redirects from `https://thiepn.github.io/tbc/`
to `https://thiepn.dev/tbc/`. Settings are external state, not guaranteed by
this document. `https_enforced` was false during baseline inspection.

Historical P0F manifests/smoke scripts pin older production artifacts; they are
not current release authority. Historical P0E/P0F/P1A dispatch-only workflows do
not substitute for a current SHA's aggregate gate. P2B–P2E repair/freezer workflows
remain a recorded risk until separately made audit-only on main/PR.
