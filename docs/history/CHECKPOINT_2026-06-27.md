# COGITATOR BROWSER — Checkpoint 2026-06-27 (Noosphere fix + smoke)

**Tag:** `cogitator-v2.0-checkpoint-2026-06-27`
**Version:** 2.0.0
**Launch:** `cogitator` → `resources/launch-cogitator.sh`

## This checkpoint includes

Everything from `cogitator-v2.0-checkpoint-2026-06-26`, plus:

- **Noosphere / localhost proxy fix:** removed `<-loopback>` from CLI bypass — SearXNG `:8080`, Dashboard `:7777`, Forge `:9091` no longer routed through FlClash (502)
- **Anathemetron AI brain:** Cogitator WEB sidebar chat uses **llama-server** `:11436/v1`, model alias **`Anathemetron`**
- **GGUF:** `Huihui-gemma-4-12B-coder-fable5-composer2.5-v1-abliterated.Q3_K_S.gguf` (router + symbiont Memoria Aeterna)
- **Sidebar:** PAGE (`PageContextPanel`) + TR (`TranslatePanel`) tabs wired
- **Smoke:** `smoke-anathemetron.mjs` (direct chat to llama-server), `smoke-noosphere.mjs`

## Restore

```bash
git checkout cogitator-v2.0-checkpoint-2026-06-27
cd cogitator-browser && npm run build
cogitator
```

## Smoke

```bash
cd cogitator-browser
node scripts/smoke-anathemetron.mjs  # llama-server Anathemetron chat
node scripts/smoke-noosphere.mjs   # local services + Noosphere UI
node scripts/smoke-youtube.mjs     # YouTube via proxy
node scripts/smoke-sites.mjs       # sites + Mens/Forge/Dashboard/SearXNG
node scripts/smoke-pip-youtube.mjs # PiP embed
npx vitest run src/main/tests/
```

## Requirements

- FlClash `:7890` for YouTube / clearnet in restricted network
- SearXNG on `:8080` (host network / `searxng_anathemetron`)
- Dashboard `:7777`, Forge `:9091`, Mens `:8000` for start-page links
- Ollama `:11434` optional fallback — **primary:** llama-server `:11436`, model **`Anathemetron`**
- Launch via `cogitator` (unsets `ELECTRON_RUN_AS_NODE`)

## Feature matrix (honest)

| Area | Status |
|------|--------|
| Tabs, navigation, bookmarks, history | ✅ Working |
| Proxy (FlClash auto), adblock, privacy | ✅ Working |
| Start page, Noosphere (SearXNG) | ✅ Working |
| PiP YouTube, HTML fullscreen | ✅ Working |
| Downloads, find, zoom, split view | ✅ Working |
| Sigil, Vault, Torrent, Sysmon, OCR, File manager | ✅ Working |
| **AI sidebar (WEB tab → ChatPanel)** | ✅ llama-server `Anathemetron` on `:11436` |
| **PAGE / TR sidebar tabs** | ✅ PageContext + Translate wired |
| Terminal AI, Notes/RSS AI helpers | ⚠️ Partial — needs Ollama |
| PageContext / SearchPanel / TranslatePanel | ❌ Built, not wired in sidebar |
| Heretic Forge in-app integration | ❌ Link only (`localhost:9091`) |
| Git, Docker, SSH, SQLite, LAN/Port scan UI | ❌ Mock / stub |
| Reader mode button | ❌ Hidden (`isReadable={false}`) |
| VPN panel | ⚠️ Needs external API `:9999` |

## Next (suggested)

1. Wire `PageContextPanel` + `TranslatePanel` into sidebar tabs
2. Implement real `git-manager` IPC or hide Git tool until ready
3. Mens/Forge context in chat (HTTP to `:8000` / bibliotheca)
4. Compact start-page folder row height (deferred)
5. Optional: IPC Noosphere search in main process (belt-and-suspenders)
