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
node scripts/validate-release.cjs
```

The canonical validator owns the current release decision. Phase-era scripts (P0/P1/P2, PR5/PR6/PR7) are retained as historical evidence or implementation helpers, but none of them is independently the canonical release validator.

The validator verifies:

1. release/version identity is internally consistent and matches README, this QA document, and the application;
2. obsolete `1.0.0` application identity is absent;
3. current certification counts, tier distribution, and frozen question-bank hashes match `certification/p2a-question-bank-extraction-baseline.json`;
4. the runtime question-bank APIs are healthy and no page/runtime extraction errors occur;
5. current shell, Play/Learn, and Library/Progress browser smoke suites pass.

The workflow `.github/workflows/release-validate.yml` installs the browser dependency, starts the local application, and runs that same canonical command. CI does not maintain a separate definition of release correctness.

## Question-bank preservation rule

P27B is release/validation repair only. It must not edit question records, answers, distractors, difficulty assignments, routing, or structured-question content. The validator compares the runtime bank against the frozen certification hashes rather than treating whole-file byte identity as a proxy for question preservation. This allows release metadata to be repaired without redefining the bank.

## Historical certification documents

Documents such as `P0F-PRODUCTION-DEPLOYMENT-CONTRACT.md` describe the gates used at their respective phase freezes. They remain useful historical evidence, but their frozen whole-file hashes and phase-specific commands are not the current canonical QA entry point after later certified changes.
