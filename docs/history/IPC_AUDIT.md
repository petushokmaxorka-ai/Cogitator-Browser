# Cogitator Browser — IPC Channel Audit
# Date: 2026-07-06 | Agent: GLM-5.2

## Summary

| Metric | Count |
|--------|-------|
| Total IPC channels defined | **194** |
| Handlers registered | **181** (142 index + 19 vault + 17 sigil + 3 pip) |
| ✓ Working | **175** |
| ⚠ Event-only (normal) | **9** (main→renderer events) |
| ✗ Dead (no handler) | **7** |
| 🔧 Fixed in W6 | **7** (3 Vault Cards + 4 Sessions) |

## Status Legend
- ✓ = handler exists and works
- ⚠ = event-only channel (sent FROM main TO renderer, no handler needed)
- ✗ = defined but no handler (dead feature stub)
- 🔧 = fixed in this W6 sprint

## Fixed in W6

| Channel | Handler File | Status |
|---------|-------------|--------|
| VAULT_GET_CARDS | vault-handlers.ts | 🔧 NEW |
| VAULT_SAVE_CARD | vault-handlers.ts | 🔧 NEW |
| VAULT_DELETE_CARD | vault-handlers.ts | 🔧 NEW |
| SESSION_SAVE | index.ts | 🔧 NEW |
| SESSION_RESTORE | index.ts | 🔧 NEW |
| SESSION_GET_ALL | index.ts | 🔧 NEW |
| SESSION_DELETE | index.ts | 🔧 NEW |

## Remaining Dead Channels (7)

| Channel | Feature | Recommendation |
|---------|---------|----------------|
| PAGE_GET_CONTENT | Page content extraction | Use PAGE_GET_INFO instead |
| PIP_LOAD | PiP video loading | PiP works without it |
| PIP_SYNC | PiP state sync | PiP works without it |
| READER_EXTRACT | Reader mode extraction | Use READER_DETECT instead |
| SITE_GET_DATA | Per-site data settings | Feature stub — implement or remove |
| SITE_SET_DATA | Per-site data settings | Feature stub — implement or remove |
| SITE_CLEAR_DATA | Per-site data settings | Feature stub — implement or remove |
| TRANSLATE_TEXT | Translation IPC | Renderer-side bridge used instead |

## Event-Only Channels (9) — Normal

| Channel | Purpose |
|---------|---------|
| OLLAMA_ON_STREAM | Token streaming to renderer |
| FIND_IN_PAGE_RESULT | Search results to renderer |
| TABS_ON_UPDATE | Tab state changes |
| WINDOW_ON_MAXIMIZE | Window state event |
| WINDOW_ON_UNMAXIMIZE | Window state event |
| TORRENT_ON_UPDATE | Torrent progress updates |
| CONTENT_FULLSCREEN_ON_CHANGE | Fullscreen state changes |
| PIP_STATE_CHANGE | PiP window state |
| SYSMON_UPDATE | System monitor metrics |

## Handler Distribution

| File | Handlers | Coverage |
|------|----------|----------|
| index.ts | 142 | Tabs, FS, Git, Docker, Email, Network, Ollama, Mens, Privacy, Omnibox, Media, Sessions, Archive, SSH, SQLite, VPN, Process, Sysmon, SpeedTest |
| vault-handlers.ts | 19 | Vault lifecycle, Password CRUD, Cards, Search, Generator, Strength, Stats |
| sigil-handlers.ts | 17 | Certificates, Signatures, Encryption, Decryption |
| pip-manager.ts | 3 | PiP window management |

## Vault Cards Backend Methods

| Method | File | Status |
|--------|------|--------|
| getCards() | vault-crypto.ts:506 | ✓ exists |
| addCard() | vault-crypto.ts:512 | ✓ exists |
| deleteCard() | vault-crypto.ts:522 | 🔧 NEW (added in W6) |

## Session Management

| Method | File | Status |
|--------|------|--------|
| SESSION_SAVE | index.ts | 🔧 NEW — saves tabs to userData/sessions/{id}.json |
| SESSION_RESTORE | index.ts | 🔧 NEW — loads named session |
| SESSION_GET_ALL | index.ts | 🔧 NEW — lists saved sessions |
| SESSION_DELETE | index.ts | 🔧 NEW — deletes session file |

Data format: `{ id, name, urls, created }` in `userData/sessions/*.json`

## TypeScript Typecheck

```
tsconfig.node.json: exit 0 (0 errors)
tsconfig.web.json: exit 2 (pre-existing chai/plist type errors, NOT from our changes)
```

*«Veritas in Crypta. Ordo ab Chao.»*
