# Project Handoff

## Project Goal

`哑巴说话 / 澳新旅行英语` is a personal travel-English learning tool. It has two surfaces:

- Mac desktop floating window built with Electron, React, and Vite.
- Mobile web PWA built with React, Vite, Supabase optional cloud sync, and Cloudflare Pages deployment.

The app helps review Australian and New Zealand travel English sentences and phrases, speak them aloud, filter by scenario or priority, and track learning status.

## Current Completion

- Desktop floating HUD card is implemented.
- Excel to JSON conversion script is implemented.
- Speech synthesis works through browser `speechSynthesis`.
- Review status, settings, and last learning position are stored locally.
- Random review mode exists with weighted selection.
- Desktop shortcut helper scripts exist locally but are not committed.
- Mobile web app exists in `mobile-web/` and can run independently.
- Mobile web can run offline/local mode without Supabase env vars.
- Mobile web can deploy to Cloudflare Pages.

## Not Complete

- Desktop cloud sync is intentionally not connected.
- Formal user login is not implemented; mobile sync is single-user/default-channel oriented.
- The real Excel workbook and full generated JSON are not committed to GitHub.
- Automated browser UI tests are not yet present.

## Core Business Logic

- Source data starts from `data/澳新旅行英语_340句_915词.xlsx`.
- `scripts/convert-xlsx-to-json.mjs` converts all sheets into `src/data/travel-english.json`.
- Each item contains `id`, `type`, `category`, `english`, `chinese`, `priority`, `note`, `reviewStatus`, and `sourceSheet`.
- Desktop uses localStorage for settings, status, and last session.
- Mobile web uses its own localStorage key and optional Supabase sync.
- Random review gives higher weight to `未学`, `学习中`, and higher priority items.

## Key Files

- `electron/main.js`: Electron window, IPC, transparent always-on-top desktop behavior.
- `electron/preload.js`: Safe renderer API.
- `src/App.jsx`: Desktop learning UI and state logic.
- `src/styles.css`: Desktop HUD styling and responsive layout.
- `scripts/convert-xlsx-to-json.mjs`: Excel parsing and JSON generation.
- `mobile-web/src/App.jsx`: Mobile web learning UI.
- `mobile-web/src/lib/syncStorage.js`: Mobile local/cloud sync logic.
- `mobile-web/README.md`: Mobile deployment and Supabase SQL.

## Current Run Mode

Desktop:

```bash
npm install
npm run convert:data
npm run dev
```

Mobile:

```bash
cd mobile-web
npm install
npm run dev
```

## Known Bugs / Risks

- Missing generated JSON produces an empty-data prompt; this is expected for clean clones.
- Mobile cloud sync depends on correct Supabase env vars and SQL setup.
- macOS Gatekeeper may block unsigned packaged apps.
- Browser TTS voice availability depends on the OS/browser.
- Large desktop UI changes can accidentally break long-sentence fitting; test with long travel sentences before release.

## Next Suggestions

- Add Playwright smoke tests for desktop-rendered React state.
- Add mobile PWA smoke tests for local mode.
- Add a lightweight release checklist before building `.dmg`.
- Keep all real personal data and full Excel files outside Git.

## Do Not Modify Casually

- `scripts/convert-xlsx-to-json.mjs` data shape.
- localStorage key migration logic.
- Electron `contextIsolation` / `nodeIntegration` security settings.
- Supabase anon-only frontend configuration.
