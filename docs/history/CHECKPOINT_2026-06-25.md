# COGITATOR BROWSER — Checkpoint 2026-06-25 (YouTube stable)

**Tag:** `cogitator-v2.0-checkpoint-2026-06-25`
**Version:** 2.0.0
**Launch:** `cogitator` → `resources/launch-cogitator.sh`

## This checkpoint includes

- **YouTube / proxy:** FlClash `:7890` via Chromium CLI `--proxy-server` (`early-proxy.ts`); `COGITATOR_PROXY_MODE=auto` default
- **No GNOME PAC:** avoids `ERR_MANDATORY_PROXY_CONFIGURATION_FAILED (-131)`
- **Error pages:** `cogitator://error` (no broken `data:` URLs); poisoned `session.json` sanitized
- **Transient retries:** `-21` / `-7` auto-retry before CONNECTION FAILED
- **Splash:** 6.5 s min, 12 s hard cap; main window always reveals
- **Start page:** 3 folders (HereticArch, Web & Forge, Quick Links) + Heretic Forge `:9091`
- **Context menu:** PKM cut/copy/paste on pages and chrome
- **Smoke:** `node scripts/smoke-youtube.mjs`, `node scripts/smoke-sites.mjs`

## Restore

```bash
git checkout cogitator-v2.0-checkpoint-2026-06-25
cd cogitator-browser && npm run build
cogitator
```

## Requirements

- FlClash running (`127.0.0.1:7890`) for YouTube/GitHub/Reddit in restricted network
- Launch only via `cogitator` (script unsets `ELECTRON_RUN_AS_NODE`)
- Local links need services: Mens `:8000`, Forge `:9091`, SearXNG `:8080`

## Next (planned)

- Reduce start-page folder **height** (compact row for mouse hit-targets)
