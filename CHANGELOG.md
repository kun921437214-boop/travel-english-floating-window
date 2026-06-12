# Changelog

## 2026-06-09

- Prepared GitHub handoff structure.
  - Files: `README.md`, `AGENTS.md`, `docs/`, `sample_data/`, `.gitignore`, `.env.example`.
  - Reason: provide a stable project-management entry point.
  - Remaining: verify GitHub repository privacy and push status.

## 2026-05-31 to 2026-06-09

- Built Mac desktop floating English-learning app.
  - Files: `electron/`, `src/`, `scripts/`.
  - Reason: provide desktop corner-card travel English study.
  - Remaining: automated UI tests.

- Added Excel conversion pipeline.
  - Files: `scripts/convert-xlsx-to-json.mjs`.
  - Reason: convert travel English workbook into frontend JSON.
  - Remaining: improve stable IDs if workbook changes often.

- Added desktop launcher helpers.
  - Files: local `.command`/`.app` artifacts and helper scripts.
  - Reason: easier one-click startup on Mac.
  - Remaining: local artifacts are intentionally ignored by Git.

- Added last learning position restore.
  - Files: `src/App.jsx`.
  - Reason: reopen from the last studied card instead of item 1.
  - Remaining: keep migration compatibility when localStorage changes.

- Added random review mode.
  - Files: `src/App.jsx`, `src/styles.css`.
  - Reason: prioritize unlearned, learning, and high-priority content.
  - Remaining: add tests for weighted distribution behavior.

- Added mobile web PWA.
  - Files: `mobile-web/`.
  - Reason: study on phone and deploy through Cloudflare Pages.
  - Remaining: finalize Supabase production environment and optional Auth if shared publicly.
