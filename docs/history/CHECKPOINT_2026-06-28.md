# COGITATOR BROWSER — Checkpoint 2026-06-28 (Mens + Anathemetron TR)

**Version:** 2.0.0
**Launch:** `cogitator` → `resources/launch-cogitator.sh`

## This checkpoint includes

Everything from `cogitator-v2.0-checkpoint-2026-06-27`, plus:

- **Mens bibliotheca context** in WEB chat (`mens-bridge.ts`, digest injection before llama-server)
- **TR tab:** primary translation via **Anathemetron** (`:11436`); LibreTranslate `:5000` optional fallback
- **Smoke:** `smoke-mens.mjs`, `smoke-translate.mjs`
- **Tests:** mens-bridge (2), translate-helpers (3) — vitest 14 total
- **systemd:** `heretic-router`, `mens-machinae`, `heretic-forge` enabled

## Restore

```bash
git checkout cogitator-v2.0-checkpoint-2026-06-28   # after tag pushed
cd cogitator-browser && npm run build
cogitator
```

## Smoke

```bash
cd cogitator-browser
node scripts/smoke-anathemetron.mjs
node scripts/smoke-mens.mjs
node scripts/smoke-translate.mjs
node scripts/smoke-noosphere.mjs
npx vitest run src/main/tests/
```

## Requirements

| Service | Port | Role |
|---------|------|------|
| llama-server (router) | 11436 | Anathemetron chat + TR |
| Mens | 8000 | digest + semantic (needs Ollama embed) |
| Ollama | 11434 | `nomic-embed-text` for semantic search |
| Forge | 9091 | start-page link |
| SearXNG | 8080 | Noosphere |
| FlClash | 7890 | YouTube / clearnet |

## Feature matrix (honest)

| Area | Status |
|------|--------|
| AI WEB chat | ✅ Anathemetron + Mens digest |
| AI PAGE | ✅ summarize / translate page / code |
| AI TR | ✅ Anathemetron (LibreTranslate optional) |
| Mens semantic in chat | ⚠️ needs Ollama `:11434` + embed model |
| Git, Docker, SSH, SQL, LAN | ❌ mock — hide or implement |
| Forge in-app | ❌ link only |
| Reader mode | ❌ hidden |

## Next (suggested)

1. Enable `ollama.service` + `nomic-embed-text` → full Mens semantic context
2. Forge panel in Cogitator (iframe or IPC)
3. Migrate Terminal/Notes/Todo AI helpers to `:11436`
4. Hide mock sidebar tools until real IPC
5. Reader mode re-enable + test
