# COGITATOR BROWSER — Checkpoint 2026-06-18 (Phase 6)

**Version:** 2.0.6
**Tag:** `cogitator-browser/v2.0.6`
**Launch:** `cogitator` → `resources/launch-cogitator.sh`

## Phase 6 deliverables

| Feature | Status |
|---------|--------|
| Omnibox AI → sidebar prefill | ✅ `?` / `ai:` / `//` opens Chat + prefills (Enter sends) |
| Vault hit → CodeEditor | ✅ `.md/.ts/.py/…` opens in Editor tab |
| SQLite drag-drop `.db` | ✅ + full path in header |
| Reader mode button | ✅ visible on all `http(s)` pages |
| Version sync | ✅ `APP_VERSION` 2.0.6 |

## Restore

```bash
git checkout cogitator-browser/v2.0.6
cd cogitator-browser && npm run build
cogitator
```

## Smoke

```bash
cd cogitator-browser
node scripts/smoke-cogitator.mjs
npx vitest run src/main/tests/ src/renderer/lib/
```

## Omnibox examples

```
? объясни synapse
ai: как работает hive
10 km in mi
time Moscow
define serendipity
```

## Known blockers

- Mens `/search/hybrid` → 502 until Ollama embeddings repaired (`scripts/repair-ollama-embeddings.sh`)

## Next (Phase 7)

1. GitClient / DockerUI — wire real IPC (hide mocks until done)
2. Forge panel in-app (iframe `:9091`)
3. Anathemetron life pulse in sidebar
4. Terminal/Notes AI → unified `:11436` bridge
