# P27D — Runtime/Browser Certification & Final Release Hardening

## Purpose

P27D closes the remaining release-evidence gap after P27B established truthful release identity and P27C consolidated CI authority.

The phase adds one whole-product runtime/browser certification layer and one post-merge public-deployment certification layer.

## Local whole-product certification

Canonical command:

```bash
node scripts/validate-release.cjs
```

The canonical validator now includes:

```bash
node scripts/p27d-runtime-browser-certification.cjs
```

The P27D browser certification checks the integrated product rather than one historical implementation slice at a time.

### Required runtime evidence

- PR5 shell, PR6 Play/Learn and PR7/P1B Library/Progress all boot in one browser session.
- Home → Play → Learn → Library → Collections → Progress → Settings → Home navigation remains coherent.
- Desktop primary navigation is reachable by forward keyboard traversal and supports Enter activation.
- Focus remains visually detectable.
- Visible interactive controls have accessible names.
- Visible images have `alt` attributes.
- Duplicate DOM ids are absent.
- Desktop 1440×1000, tablet 820×1180 and mobile 390×844 profiles have no horizontal overflow.
- Mobile primary navigation remains fixed with 44 px minimum primary touch-target height.
- Canonical persistence keys are parseable when present.
- Passive reload preserves canonical semantic user state.
- Reload comparison permits only bookkeeping `*At` timestamps plus the two observed boot-normalization paths `goalMeta.clearReviewStart` and `ui.playSection` to differ.
- A pre-existing recovery snapshot remains parseable and available after reload.
- Obsolete `tbc_v4_` persistence keys are not introduced.
- Reduced-motion preference boots without runtime or console errors.
- Page errors and console errors remain empty.

Evidence is written to `artifacts/p27d/`.

## Public deployment certification

On a push to `main`, `release-validate.yml` additionally runs:

```bash
node scripts/p27d-deployment-certification.cjs
```

against the GitHub Pages project URL derived from the repository owner/name. For this repository the expected production target is `https://thiepn.github.io/tbc/`.

The deployment probe retries while Pages converges and then requires:

- deployed `release.json` release/version identity equals local `release.json`;
- deployed `index.html` bytes equal merged `main` bytes;
- deployed PR5/PR6/PR7/P1B runtime asset bytes equal merged `main` bytes.

The probe writes `artifacts/p27d/deployment-report.json`.

## Preservation boundary

P27D does not intentionally modify:

- `index.html`;
- question text;
- answers or distractors;
- difficulty assignments;
- question routing or structured-question content;
- certification baselines;
- certified question-bank counts or hashes.

If browser certification exposes a real UI/runtime defect, a narrowly targeted non-question-bank fix is allowed in P27D, but the frozen bank hashes must remain unchanged and the canonical release validator must pass afterward.

## Acceptance criteria

P27D is complete when:

1. the branch diff contains no question-bank or certification-baseline mutation;
2. the canonical Release validation PR run passes with the new whole-product browser certification;
3. no accessibility/runtime defect exposed by the new certification remains unresolved;
4. after merge, the push-to-`main` Release validation run passes;
5. the post-merge deployment probe confirms the public GitHub Pages files have converged byte-for-byte to merged `main`;
6. the certified question-bank counts and hashes remain unchanged.

## Release stop condition

Once these criteria pass, the P27 repair program has trustworthy release identity, one canonical CI authority, integrated browser evidence, and verified public deployment parity. Further work should then be driven by actual product defects or new feature goals rather than additional release-process repair phases.
