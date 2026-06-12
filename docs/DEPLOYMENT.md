# Deployment

## Local Desktop

```bash
npm install
npm run convert:data
npm run dev
```

For the one-click local helper, use the desktop shortcut scripts generated locally by:

```bash
npm run shortcut:desktop
```

Those `.command` and `.app` launcher files are local artifacts and are not committed.

## Desktop Build

```bash
npm run build
npm run dist:mac
```

The packaged macOS output is generated under ignored build output directories. Do not commit packaged apps, DMGs, or ZIP exports.

## Mobile Web Local

```bash
cd mobile-web
npm install
npm run dev
```

## Mobile Web Build

```bash
cd mobile-web
npm run build
```

## Cloudflare Pages

Current mobile deployment entry:

- Production URL: `https://travel-english-mobile-web.pages.dev/`

Suggested Cloudflare Pages settings:

- Root directory: `mobile-web`
- Build command: `npm run build`
- Build output directory: `dist`

Optional environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these variables are missing, mobile web remains usable in local-only mode.

## Supabase

Mobile web frontend must only use anon public credentials. Never place `service_role` keys in frontend code or `.env` files committed to Git.

See `mobile-web/README.md` for the SQL schema and setup notes.

## Common Deployment Problems

- Empty data: run `npm run convert:data` before desktop build.
- Cloud sync disabled: configure Supabase env vars in Cloudflare Pages.
- macOS cannot open app: unsigned builds may require right-click open or code signing for distribution.
- TTS silent: install or select English voices in the OS/browser.
