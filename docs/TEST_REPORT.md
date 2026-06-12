# Test Report

## Tested Functions

- Desktop lint script.
- Desktop Vite build.
- Mobile web Vite build.
- Data conversion command behavior is documented; real workbook is local-only.
- Mobile web local mode without Supabase configuration.

## Manual Test Steps

Desktop smoke checklist:

1. Run `npm install`.
2. Put the Excel workbook in `data/`.
3. Run `npm run convert:data`.
4. Run `npm run dev`.
5. Verify previous/next, random review, speech, search, filters, hide Chinese, mini mode, always-on-top, status buttons, and shortcuts.
6. Close and reopen; verify the last learning position is restored.

Mobile smoke checklist:

1. Run `cd mobile-web`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL on a phone-sized viewport.
5. Verify local mode works without Supabase env vars.
6. Verify search, filters, speech, status, random review, and PWA manifest.

## Current Result

2026-06-12 handoff check:

- `npm run lint`: passed.
- `npm run build`: started but did not finish within the local 2-minute check window, then was stopped manually. This should be investigated before treating the desktop build as release-ready.
- GitHub handoff structure: prepared with real Excel/JSON excluded from Git and sample data included.

## Not Tested Yet

- Full macOS `.dmg` installation flow on a clean machine.
- Supabase cross-device sync with a fresh database.
- Cloudflare Pages production redeploy after every future feature branch.
- Voice availability on every iOS/Android browser.

## Known Failure Modes

- Missing `src/data/travel-english.json`: run `npm run convert:data`.
- Missing Supabase env vars: mobile web shows local mode, not cloud sync.
- Unsigned macOS package: right-click open or use local launcher while developing.

## Reproduction Notes

For long-sentence fitting issues, test these phrases:

- `Sorry, my English is not very good.`
- `Could you write it down for me, please?`
- `Please call roadside assistance, the car has a problem.`
- `Could you explain the insurance options to me?`
