# P0F — Production Deployment & Live-Site Certification

P0F is the post-P0E release gate. P0E proves the repaired product locally as one frozen whole-product baseline; P0F proves that the public GitHub Pages deployment is serving that exact product and remains usable in a real browser.

## Frozen prerequisite

P0F may run only on top of the completed P0E freeze:

- P0E freeze commit: `41732fa118154e007549e9094f31b515acfa9e2a`
- Production URL: `https://thiepn.github.io/tbc/`
- Canonical bank: 5,799 questions
- Structured questions: 203
- Books: 66
- Difficulty tiers: Beginner, Easy, Standard, Advanced, Expert
- Canonical state keys: `theBibleChallenge_v21`, `theBibleChallenge_v21_recovery`

P0F does not redefine or update any gameplay, question, progression, state, navigation, or visual contract. Any P0E failure blocks P0F.

## Gate 1 — Local release identity

`scripts/p0f-production-certification.cjs` executes P0E first and then verifies that every production-deployed file still matches the hashes frozen in `certification/p0e-preservation-baseline.json`.

A mismatch is a release-blocking regression.

## Gate 2 — Deployed-byte identity

`scripts/p0f-live-byte-certification.cjs` downloads the public production document and reconstructed assets from GitHub Pages with cache-busting requests. It computes their Git blob SHA-1 values and compares them to the P0E frozen hashes.

The probe retries for a bounded deployment-convergence window so a normal GitHub Pages publication delay does not create a false failure. P0F fails if production never converges to the frozen product.

## Gate 3 — Live browser behavior

`scripts/p0f-live-browser-smoke.cjs` opens the public site in Chromium and verifies:

- successful production document load;
- PR6 and P0C runtime layers initialize;
- desktop primary navigation remains present;
- Home, Play, and Learn handoffs remain functional;
- desktop has no horizontal overflow;
- mobile navigation remains visible and fixed;
- mobile Learn cards remain inside the viewport;
- no blocking first-run modal remains over the tested flow;
- no page exceptions or failed same-origin JS/CSS/HTML requests occur;
- desktop and mobile evidence screenshots are captured.

## Release rule

P0F passes only when all of the following are green in the same workflow:

1. complete P0E preservation certification;
2. P0F local byte identity;
3. public deployed-byte identity;
4. live desktop/mobile browser smoke;
5. final local freeze recheck after the browser run.

When this gate is green on `main`, the deployed P0E product is considered production-certified. Any future product-file change requires an intentional new preservation baseline rather than silently drifting the P0F production freeze.
