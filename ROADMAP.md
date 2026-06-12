# Roadmap

## P0

- Protect private data in Git.
  - Why: avoid uploading real Excel, generated full JSON, launchers, or personal files.
  - Files: `.gitignore`, `sample_data/`, docs.
  - Acceptance: `git status` shows no private data staged.

- Keep desktop and mobile builds passing.
  - Why: GitHub `main` should stay stable.
  - Files: root app and `mobile-web/`.
  - Acceptance: `npm run lint`, `npm run build`, and `cd mobile-web && npm run build` pass.

## P1

- Add automated UI smoke tests.
  - Why: long-sentence layout and shortcuts are easy to regress.
  - Files: new test config, `src/App.jsx`, `mobile-web/src/App.jsx`.
  - Acceptance: tests cover navigation, speech button presence, filters, and empty-data state.

- Add release checklist.
  - Why: desktop shortcut, package, data conversion, and mobile deploy need consistent steps.
  - Files: `docs/DEPLOYMENT.md`, `CHANGELOG.md`.
  - Acceptance: a new machine can follow the checklist.

## P2

- Add optional desktop cloud sync.
  - Why: phone and Mac could share review state.
  - Files: new sync module, desktop localStorage migration.
  - Acceptance: sync is opt-in, anon-safe, and does not block local learning.

- Improve data ID stability.
  - Why: regenerated Excel data can change IDs and weaken last-position restore.
  - Files: `scripts/convert-xlsx-to-json.mjs`.
  - Acceptance: same English/Chinese rows retain stable IDs across conversion.

## Later

- Code signing and notarization.
  - Why: smoother macOS install.
  - Files: build configuration and signing secrets.
  - Acceptance: packaged app opens normally on a clean Mac.

- Multi-user mobile sync with Supabase Auth.
  - Why: required if the app is shared publicly.
  - Files: `mobile-web/src/lib/`.
  - Acceptance: users have separated data and proper auth policies.
