# P0A — v4.1.0 Preservation Contract

P0A exists to prevent reconstruction work from silently deleting, replacing, downgrading, or bypassing functionality that was already completed in The Bible Challenge v4.1.0.

This is a preservation gate, not a redesign phase. PR5, PR6, and all later reconstruction work must remain additive progressive enhancement over the proven v4.1.0 application unless a later change explicitly replaces a subsystem and proves behavioral parity first.

## Locked content and progression invariants

The following v4.1.0 release invariants are protected:

| Invariant | Locked value |
|---|---:|
| Canonical active questions | 5,799 |
| Original compatibility registry | 6,072 |
| Redundant aliases excluded from normal selection | 273 |
| Structured questions | 203 |
| Bible books covered | 66 |
| Difficulty tiers | 5 |
| Collections | 22 |
| Bible Journey stages | 25 |
| Learning Path stages | 63 |
| Campaign missions | 72 |
| Expedition arcs | 12 |

### Difficulty distribution

| Tier | Questions |
|---|---:|
| Beginner | 1,338 |
| Easy | 1,666 |
| Standard | 1,133 |
| Advanced | 1,141 |
| Expert | 521 |

Normal playable selection must continue to use the 5,799 canonical bank rather than reintroducing the 273 redundant aliases.

## Protected product behavior

Reconstruction must preserve the existing behavior of the application, including:

- onboarding and first-run setup;
- the player level / difficulty selector;
- all five difficulty tiers and their calibrated routing;
- the completed question-quality audit and corrected canonical question bank;
- rich answer feedback, including biblical evidence, learning focus, memory cues, and wrong-answer explanations where provided by v4.1.0;
- Quick Play and focused practice;
- all-book practice and the whole-Bible library;
- Bible Journey;
- Learning Path;
- Adaptive Review;
- Campaign;
- Expedition;
- collections and collection-specific play;
- challenges and Bible Reader practice;
- Duel;
- mastery/progress tracking;
- local saving;
- active-session restoration;
- progress export/import;
- light/dark theme behavior, reduced-motion support, high contrast, touch controls, keyboard accessibility, and responsive desktop/mobile behavior;
- offline-ready static deployment.

A reconstructed screen may improve presentation or navigation, but it may not make an existing capability unreachable, alter question-bank semantics, reset user state, or reduce supported modes.

## Architecture rule

The preserved v4.1.0 monolith remains the source of truth for game/question state until a later migration explicitly proves parity.

PR5 and PR6 must remain additive layers:

- PR5 may provide shell/navigation/presentation enhancement but must not read, write, or mutate TBC game state.
- PR6 may provide reconstructed Play/Learn surfaces and narrow handoffs into the proven v4.1.0 session engine, but must not rewrite quiz/question state.
- Later PR7+ chunks must follow the same rule unless a separately reviewed migration contract says otherwise.

## Automated P0A gate

`scripts/p0a-preservation-check.cjs` protects stable machine-verifiable invariants:

1. The core `index.html` must not be accidentally replaced/truncated.
2. The documented v4.1.0 release counts and five-tier distribution must remain present.
3. PR5 must retain its no-game-state-mutation contract and PR6 loader.
4. PR6 must retain its no-question-state-rewrite contract.
5. The five named difficulty tiers must remain represented in the preserved release metadata.

The gate intentionally avoids brittle assertions against minified implementation details in the multi-megabyte monolith.

## Manual/browser preservation checks

Before a reconstruction chunk that touches these areas is considered complete, browser validation must confirm:

- [ ] Existing user with saved progress opens without reset or migration loss.
- [ ] Fresh user still receives onboarding / first-run setup.
- [ ] Level/difficulty selection is reachable and all five tiers are selectable where intended.
- [ ] Quick Play starts and uses the expected selected tier/settings.
- [ ] A focused book-practice round can be started.
- [ ] Collections remain reachable and collection-specific play starts correctly.
- [ ] Bible Journey remains reachable and can start/continue.
- [ ] Learning Path remains reachable and can start/continue.
- [ ] Adaptive Review remains reachable and can start when eligible.
- [ ] Campaign, Expedition, challenges, Reader practice, and Duel remain reachable where v4.1.0 exposes them.
- [ ] Answer feedback still exposes the v4.1.0 learning/explanation data.
- [ ] Mastery/progress persists after a completed question/session.
- [ ] Export/import still round-trips progress.
- [ ] Active session restoration still works after reload.
- [ ] Light/dark, high-contrast, reduced-motion, keyboard, touch, desktop, and mobile behavior do not regress.

## Change-control rule

If a future change intentionally modifies one of these invariants, it must do so explicitly. The same change must update this contract, update the preservation checker when appropriate, explain why the invariant changed, and provide validation for the replacement behavior.

Silently deleting a protected capability to simplify reconstruction is not acceptable.
