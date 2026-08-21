# Cogitator Browser — Phase 7 Checkpoint

**Version:** 2.0.7
**Tag:** `cogitator-browser/v2.0.7`

## Phase 7 deliverables

| Item | Status |
|------|--------|
| Anathemetron pulse (Chat sidebar) | ✅ IPC `mind:get-pulse` reads `.heretic/consciousness_state.json` + life |
| Mens hybrid → semantic fallback | ✅ On 502 hybrid, retries `/search/semantic`; SearchPanel shows method/hint |
| Forge in-app | ✅ iframe `:9091` + online probe + reload |
| GitClient default repo | ✅ Auto-opens `~/heretic-os` on mount |
| DockerUI real IPC | ✅ Removed dead mocks; full container IDs; `docker:remove` |
| Version sync | ✅ `APP_VERSION` 2.0.7 |

## Rollback

```bash
git checkout cogitator-browser/v2.0.7
cd cogitator-browser && npm run build
```

## Known infra

- If **both** hybrid and semantic return 502, run `scripts/repair-ollama-embeddings.sh` (Ollama embeddings).

## Tests

```bash
cd cogitator-browser && npm run build
npx vitest run src/main/tests/
node scripts/smoke-cogitator.mjs
```
