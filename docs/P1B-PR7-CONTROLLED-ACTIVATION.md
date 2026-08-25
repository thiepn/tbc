# TBC P1B — Controlled PR7 Production Activation

## Purpose
P1B promotes the P1A-certified PR7 Library / Collections / Progress reconstruction into the normal production bootstrap without changing the canonical TBC content or state model.

## Activation boundary
- P1A merge baseline: `6ab50b944e434c42cae96eab2341573f51eeaf3a`.
- `assets/p0b-player-controls.js` remains the existing final PR5 dependency and now loads `assets/p1b-pr7-production.js`.
- P1B waits for P0C and PR6 before loading the P1A-certified PR7 adapter, core, stylesheet, and navigation guard.
- PR7 is activated for routing but remains visually hidden on Home until the player enters Library / Collections / Progress.
- Native Play / Learn / Settings and PR6 handoffs deactivate PR7. A trusted Library / Progress re-entry reactivates it.

## Ownership preserved
P1B does not own or rewrite:
- the 5,799-question canonical bank;
- the five difficulty levels;
- quiz scoring or answer state;
- mastery calculations;
- sessions or save migration;
- canonical browser persistence.

Canonical state remains `theBibleChallenge_v21` plus `theBibleChallenge_v21_recovery`, owned by the retained legacy/P0C/PR6 systems.

## Activated reconstruction
- Bible Library: all 66 books.
- Collections: all 22 retained curated collections.
- Progress and Mastery presentation from retained signals.
- Hand-offs to Focused Practice, Adaptive Review and Learning Path through PR6.

## Baseline transition
P0E, P0F and P1A remain immutable historical certification baselines. Their automatic workflows are archived to manual dispatch because P1B intentionally creates the first post-P0F production baseline. `P1B PR7 Production Activation` is the successor release gate.

## Release gate
P1B must pass:
1. P0A core-content preservation.
2. P0C retained-feature preservation.
3. P1B static activation audit.
4. Desktop production browser certification.
5. Mobile production browser certification.
6. Canonical-state health checks.
7. Library → Play exit and trusted Library re-entry regression.
8. Dark / contrast theme and horizontal-overflow checks.

P1B is complete only after the successor gate is green and the activation branch is merged to `main`.
