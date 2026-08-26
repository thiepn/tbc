# P27C — CI Gate Consolidation & Historical Workflow Retirement

## Purpose

P27C removes competing phase-era release gates after P27B established one canonical release validator.

The release authority is now:

- workflow: `.github/workflows/release-validate.yml`
- command: `node scripts/validate-release.cjs`
- release identity: `release.json`

## Retired automatic phase workflows

The following completed phase workflows are retained for explicit historical/manual execution only:

- `p0a-preservation.yml`
- `p0b-player-controls.yml`
- `p0d-visual-preservation.yml`
- `p1b-pr7-production.yml`
- `p2a-question-bank-extraction.yml`
- `p2b-mechanical-integrity.yml`
- `p2c-semantic-accuracy.yml`
- `p2d-question-quality.yml`
- `p2e-difficulty-calibration.yml`

P0E, P0F, and P1A were already historical/manual before this phase and remain so.

`pr5-apply.yml` remains branch-scoped to its historical PR5 implementation branch. It is not a pull-request or `main` release gate.

## Safety changes

- retired phase workflows no longer run automatically on ordinary pull requests or pushes to `main`;
- P2B–P2E historical workflows use repository read permission;
- P2B–P2E historical workflows no longer contain active phase-branch writeback steps;
- the canonical release validator now checks workflow authority and fails if another workflow regains automatic pull-request or `main` release authority.

## Preservation boundary

P27C is CI/workflow metadata repair only.

It does not edit:

- `index.html`;
- question text;
- answers or distractors;
- difficulty assignments;
- routing;
- structured-question content;
- certified question-bank counts or hashes;
- certification baseline payloads.

The frozen certified question-bank contract remains unchanged.

## Required validation

The phase is merge-ready only when:

1. the branch diff contains no application/question-bank/certification payload change;
2. `release-validate.yml` is the only automatic general PR/`main` release gate;
3. `node scripts/validate-release.cjs` passes, including the CI-authority checks and frozen question-bank hash checks;
4. the current browser smoke suites pass through the canonical validator.
