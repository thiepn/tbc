# P1A — PR7 Safe Rebase & Staged Reconstruction

P1A begins the post-P0 product-development block after the P0 preservation/certification sequence.

The earlier `codex/pr7-library-progress-reconstruction` branch is **reference material only**. It predates the P0 repairs and must not be merged or rebased wholesale because it carries obsolete PR5 shell changes.

## P1A purpose

Stage a current-architecture Library / Collections / Progress reconstruction and prove it works against the P0F-certified product **without activating it in production yet**.

P1A adds only new, unreferenced staging assets and certification infrastructure:

- `assets/pr7-library-progress.js`
- `assets/pr7-library-progress.css`
- `scripts/p1a-pr7-staging-audit.cjs`
- `scripts/p1a-pr7-browser-smoke.cjs`
- `.github/workflows/p1a-pr7-staging.yml`
- `certification/p1a-pr7-staging-baseline.json`

## Hard preservation boundary

P1A must leave the P0F production payload byte-identical.

The following remain frozen and are not edited in P1A:

- `index.html`
- `assets/pr5-foundation.css`
- `assets/pr5-shell.js`
- `assets/pr6-play-learning.css`
- `assets/pr6-play-learning.js`
- `assets/p0b-player-controls.js`
- `assets/p0c-existing-feature-preservation.js`

The P0E and P0F manifests remain historical release evidence and are not rewritten.

## Staging behavior

`assets/pr7-library-progress.js` exposes `window.TBC_PR7`, but it does not automatically activate routing. P1A CI injects the JS/CSS after the certified app has loaded and explicitly calls `TBC_PR7.activate()`.

The staged reconstruction then validates:

1. Bible Library discovery against the retained Library route.
2. The retained 22-collection engine through P0C.
3. Progress/Mastery discovery through the retained Progress route.
4. Hand-off to PR6 Focused Practice, Adaptive Review, and Learning Path.
5. Desktop and mobile containment, fixed mobile navigation, dark/contrast inheritance, and keyboard-safe focus.
6. No competing storage implementation (`localStorage.setItem` / `sessionStorage.setItem`) in PR7.
7. Existing P0A–P0F gates remain green.

## State ownership

PR7 does not create a new question, score, mastery, difficulty, session, or persistence model. It delegates to the established legacy/P0C/PR6 entry points.

Canonical state remains owned by:

- `theBibleChallenge_v21`
- `theBibleChallenge_v21_recovery`

## Activation boundary

P1A is complete when the staged PR7 module is green in CI and can be merged to `main` without changing the live product.

**P1B is the controlled activation phase.** P1B must explicitly define the new post-P0F release baseline before any frozen production loader is changed. P1A does not silently weaken or rewrite the P0E/P0F freeze.
