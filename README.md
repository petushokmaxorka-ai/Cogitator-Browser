# ◆ COGITATOR BROWSER

**Dark Mechanicus AI browser** — an Electron browser with a local-AI chat layer,
60+ built-in tools, and a hard privacy posture (sandboxed, context-isolated,
adblock, fingerprint spoofing). Born inside the HereticArch swarm; extracted
as a standalone product.

> Status: **2.2.0-beta.4 (public beta)** — feature-honest beta. The core browser is daily-driver
> solid; the long tail of tools varies (see matrix). Auto-update is wired from
> this version on.

*«Veritas in Crypta. Ordo ab Chao.»*

---

## Install / Run

```bash
npm install
npm run dev          # dev loop
npm test             # vitest unit suite (src/main/tests)
npm run typecheck    # node + web configs
npm run build:linux  # AppImage via electron-builder
```

AI features expect a local OpenAI-compatible endpoint (see matrix).

## Honest feature matrix

### Core browser — solid
| Area | Status |
|------|--------|
| Tabs (WebContentsView), sessions, PiP, downloads | ✓ daily-driver |
| AdBlocker (Cliqz engine) | ✓ |
| Privacy: sandbox + contextIsolation, fingerprint spoofer | ✓ |
| Vault (encrypted cards/passwords) | ✓ |
| Reader mode | ✓ wired (BookOpen in the address bar) |
| Real terminal | ✓ node-pty + xterm.js interactive shell |

### AI layer — requires local endpoints
| Area | Status |
|------|--------|
| WEB chat / page summarize / translate | ✓ via llama-swap `:11436` (OpenAI-compatible) |
| Translate tab | ✓ via Anathemetron/LibreTranslate `:5000` fallback |
| Noosphere search | ✓ via SearXNG `:8888` |
| Mens semantic context | ⚠ optional, needs Ollama `:11434` |

AI endpoint (host / model / provider) is configurable in Settings and
persists across restarts. Defaults target a local llama-swap / Ollama;
any OpenAI-compatible endpoint works.

### Tools — 60+ panels, varying depth
| Tier | Tools |
|------|-------|
| Real CLI/socket/PTY backends | Terminal (node-pty), Git, Docker, SSH, SQLite, PortScanner, WakeOnLAN, Archive, Downloader (yt-dlp), Network monitor |
| Real protocol backends | Torrent (WebTorrent), Email (IMAP/SMTP), RSS (main-process fetch, no third-party proxy) |
| Self-contained utilities | Calculator, calendar, regex, diff, JSON/API tester, QR, TOTP, color picker, notes, journal, OCR (tesseract.js), TTS, recorder, music visualizer... |
| BETA / demo grade | Process manager (real list + labeled demo preview), TODO, habits, timetrack (localStorage apps) |

## Architecture

Electron 43 / electron-vite / React 18 / Tailwind. Main process is a set of
focused managers (tab, session, privacy, adblocker, vault, torrent, ...) with
194 typed IPC channels; renderer is a component-per-tool React app. No
`shell: true` with user input anywhere; subprocesses go through `exec-util`
with argument arrays.

```
src/main/       managers + IPC handlers (no monolith hell: 40+ modules)
src/preload/    contextBridge surface (2 preloads: app + browser views)
src/renderer/   React app, one component dir per tool
src/shared/     types + the IPC channel registry (single source of truth)
```

## History

Extracted from the heretic-os monorepo (snapshot `v2.1.0-snapshot`).
Planning docs and checkpoints live in `docs/history/`.
