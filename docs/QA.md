# Current Release & QA

This document is the current QA source of truth for The Bible Challenge.

## Release identity

- Canonical release: `v4.1.0`
- Application version: `4.1.0`
- Machine-readable source: [`release.json`](../release.json)
- Production application: `index.html`

`release.json` is authoritative for release/version identity. README copy, application identity, CI, and release validation must agree with it.

## Canonical validation

Run:

```bash
npm run verify
```

The combined aggregate owns the current release decision. It serves the candidate and runs `scripts/validate-release.cjs` alongside every Stage 0 and preservation-repair gate. Phase-era scripts (P0/P1/P2, PR5/PR6/PR7) are retained as historical evidence or implementation helpers, but none of them is independently the canonical release validator.

The validator verifies:

1. release/version identity is internally consistent and matches README, this QA document, and the application;
2. `.github/workflows/release-validate.yml` is the sole automatic PR/`main` release authority and no historical workflow competes with it;
3. obsolete `1.0.0` application identity is absent;
4. current certification counts, tier distribution, and frozen question-bank hashes match `certification/p2a-question-bank-extraction-baseline.json`;
5. the runtime question-bank APIs are healthy and no page/runtime extraction errors occur;
6. current shell, Play/Learn, and Library/Progress browser smoke suites pass;
7. P27D whole-product browser certification passes across desktop, tablet, mobile, keyboard navigation, accessible control naming, semantic passive-reload preservation, reduced-motion boot, containment, and runtime error checks.

The workflow `.github/workflows/release-validate.yml` installs the exact Playwright 1.55.1 package/lockfile with `npm ci`, installs Chromium, and runs that same aggregate command. The aggregate owns the local server and includes P0E, P1B, Stage 0 (7), exact preservation (19), compatibility (27), two P2A extractions/audits, content/identity proof, historical adapters, both negative suites and reconciliation regressions. The release validator retains all its distinct assertions and browser children. CI also requires clean tracked files and uploads all evidence. `recovery-stage0.yml` was retired only after these responsibilities were transferred. The combined job allows 60 minutes for the expanded gate and the conditional deployment probe.

## Runtime/browser certification

`scripts/p27d-runtime-browser-certification.cjs` is the current whole-product browser layer. It complements the narrower PR5/PR6/P1B smoke suites rather than replacing them.

It certifies:

- the PR5, PR6 and PR7/P1B runtime layers boot together;
- Home → Play → Learn → Library → Collections → Progress → Settings → Home routing remains coherent;
- primary navigation is reachable by forward keyboard traversal, keyboard-activatable, and exposes a visible focus indicator;
- visible interactive controls have accessible names and visible images have `alt` attributes;
- duplicate DOM ids are absent;
- desktop, tablet and mobile layouts do not overflow horizontally;
- mobile primary navigation remains fixed and its primary touch targets remain at least 44 px high;
- canonical persistence keys remain parseable and present when expected;
- passive reload preserves canonical semantic user state;
- reload comparison permits only bookkeeping `*At` timestamps plus the two observed boot-normalization paths `goalMeta.clearReviewStart` and `ui.playSection` to differ;
- the recovery snapshot remains parseable and available when it existed before reload;
- obsolete `tbc_v4_` persistence keys are not introduced;
- reduced-motion browser preference boots without runtime failure;
- browser/page console errors remain empty.

The script writes evidence to `artifacts/p27d/`.

## Deployment certification

On pushes to `main`, the same `release-validate.yml` workflow also runs:

```bash
node scripts/p27d-deployment-certification.cjs
```

The deployment probe targets the repository's GitHub Pages project URL. It polls until the public deployment converges, then verifies:

- deployed `release.json` matches the canonical release/version identity;
- deployed `index.html` is byte-for-byte identical to merged `main`;
- deployed PR5, PR6, PR7 and P1B runtime assets are byte-for-byte identical to merged `main`.

A successful local release gate is therefore necessary but not sufficient for a post-merge deployment certification: the public static deployment must also converge to the merged repository state.

## CI authority

`release-validate.yml` is the only workflow allowed to run as a general release gate on pull requests to `main` and pushes to `main`.

Completed phase workflows are historical tools. They remain available through explicit `workflow_dispatch` where retained, but they must not automatically run on ordinary pull requests or `main` pushes. Historical P2 repair/certification workflows are read-only at repository level and do not write corrected monoliths or baselines back to phase branches.

A narrowly branch-scoped implementation workflow may retain automatic execution when it is tied only to its own historical implementation branch and cannot act as a general `main`/PR gate. `pr5-apply.yml` is currently the retained example.

The canonical release validator inspects workflow trigger blocks and fails if another workflow regains automatic pull-request or `main` authority.

## Question-bank preservation rule

P27B repaired release/version truth without redefining the certified question bank. P27C changed CI/workflow authority only. P27D changes release certification, browser evidence, deployment verification, and QA documentation only.

These phases do not edit question records, answers, distractors, difficulty assignments, routing data, structured-question content, or the frozen certification payload.

The validator compares the runtime bank against the frozen certification hashes rather than treating whole-file byte identity as a proxy for question preservation. This allows release/CI/certification metadata to be hardened without redefining the bank.

## Historical certification documents

Documents such as `P0F-PRODUCTION-DEPLOYMENT-CONTRACT.md` describe the gates used at their respective phase freezes. They remain useful historical evidence, but their frozen whole-file hashes and phase-specific commands are not the current canonical QA entry point after later certified changes.
