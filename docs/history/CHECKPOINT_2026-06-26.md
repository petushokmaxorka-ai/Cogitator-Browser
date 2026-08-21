# COGITATOR BROWSER — Checkpoint 2026-06-26 (PiP + fullscreen + guards)

**Tag:** `cogitator-v2.0-checkpoint-2026-06-26`
**Version:** 2.0.0
**Launch:** `cogitator` → `resources/launch-cogitator.sh`

## This checkpoint includes

Everything from `cogitator-v2.0-checkpoint-2026-06-25`, plus:

- **Teardown guards:** `electron-guards.ts` — safe BrowserView add/remove; suppress `Object has been destroyed` races
- **Sysmon / PiP:** stop timers on window close; live `webContents` checks
- **YouTube PiP:** `videoId` from page + live URL; `cogitator://pip`; `youtube-nocookie` embed
- **True fullscreen:** `enter-html-full-screen` → `setFullScreen(true)`, BrowserView fills display, chrome hidden
- **SPA URLs:** `did-navigate-in-page` syncs tab URL (YouTube)
- **GPU fallback:** `COGITATOR_DISABLE_GPU=1` in launcher comments
- **Second instance:** `electron --user-data-dir=~/.config/cogitator-browser-instance-2 .` (avoids profile lock)

## Restore

```bash
git checkout cogitator-v2.0-checkpoint-2026-06-26
cd cogitator-browser && npm run build
cogitator
```

## Smoke

```bash
cd cogitator-browser
node scripts/smoke-youtube.mjs
node scripts/smoke-sites.mjs
```

## Requirements

- FlClash `:7890` for YouTube in restricted network
- Launch via `cogitator` (unsets `ELECTRON_RUN_AS_NODE`)
- Do not run two instances on the **same** `userData` dir simultaneously
