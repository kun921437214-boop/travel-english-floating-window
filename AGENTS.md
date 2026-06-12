# AGENTS.md

Guidance for Codex and future AI agents working on this repository.

## Project Goal

Maintain a personal Australian/New Zealand travel-English learning tool:

- Desktop Electron floating card for Mac.
- Mobile web PWA for phone learning and optional Supabase sync.

Preserve the current desktop workflow unless the user explicitly asks to change it.

## Directory Map

- `electron/`: Electron main/preload process.
- `src/`: Desktop React app.
- `scripts/`: Data conversion, local runner, shortcut helpers.
- `data/`: Local-only real Excel workbook. Do not commit real files.
- `mobile-web/`: Independent mobile PWA.
- `docs/`: Handoff, test, data, and deployment documentation.
- `sample_data/`: Sanitized samples safe for GitHub.

## Tech Stack

- Desktop: Electron, React, Vite, xlsx, electron-builder.
- Mobile: React, Vite, Supabase JS, vite-plugin-pwa.
- Data: Excel workbook converted to JSON.

## Commands

Desktop:

```bash
npm install
npm run convert:data
npm run dev
npm start
npm run lint
npm run build
npm run dist:mac
```

Mobile:

```bash
cd mobile-web
npm install
npm run dev
npm run build
```

## Files To Read Before Code Changes

- `README.md`
- `docs/PROJECT_HANDOFF.md`
- `docs/DATA_RULES.md`
- `docs/DEPLOYMENT.md`
- Relevant source files in `src/`, `electron/`, or `mobile-web/src/`.

## Key Business Rules

- Do not change the generated item data shape casually.
- Preserve `id`, `type`, `category`, `english`, `chinese`, `priority`, `note`, `reviewStatus`, and `sourceSheet`.
- Review statuses are `未学`, `学习中`, `已掌握`.
- Priorities are usually `A 必背`, `B 常用`, `C 备用`.
- Desktop last learning position must survive app restart.
- Random review should prefer unlearned / learning / high-priority content but never fully hide mastered content.

## Data Rules

- Do not commit `data/*.xlsx`.
- Do not commit full generated `src/data/travel-english.json` or `mobile-web/src/data/travel-english.json`.
- Only sanitized examples belong in `sample_data/`.
- Do not commit private phone numbers, IDs, real registration forms, API keys, or Supabase service-role keys.

## Validation After Changes

Run at least:

```bash
npm run lint
npm run build
```

When mobile web is touched:

```bash
cd mobile-web
npm run build
```

For UI changes, manually check:

- Normal sentence.
- Long sentence.
- Word item.
- Empty data state.
- Search and filter panels.
- Mini/focus mode.
- Last-position restore.

## Prohibited

- Do not enable Electron `nodeIntegration`.
- Do not disable `contextIsolation`.
- Do not add online TTS APIs; speech uses browser `speechSynthesis`.
- Do not overwrite user local learning progress.
- Do not upload real source data or generated full data to GitHub.
- Do not commit local desktop shortcut `.app` or `.command` files.
- Do not put Supabase `service_role` keys in frontend code.

## Completion Standard

A change is complete when:

- Requested behavior works.
- Existing navigation, speech, filters, status, shortcuts, and localStorage remain intact.
- Builds pass.
- Git status is clean except for intentionally ignored local data.
