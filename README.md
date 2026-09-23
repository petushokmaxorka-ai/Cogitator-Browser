# ◆ COGITATOR BROWSER

**Dark Mechanicus AI browser** — an Electron browser with a local-AI chat layer,
60+ built-in tools, and a hard privacy posture (sandboxed, context-isolated,
adblock, fingerprint spoofing). Born inside the HereticArch swarm; extracted
as a standalone product.

> Status: **2.2.x (stable line)** — public release. The core browser is
> daily-driver solid; the long tail of tools varies (see matrix). Auto-update
> is wired since 2.2.0.

*«Veritas in Crypta. Ordo ab Chao.»*

---

## Download

Prebuilt x64 builds are attached to every
[GitHub Release](https://github.com/petushokmaxorka-ai/Cogitator-Browser/releases/latest):

| Platform | Asset | Auto-update |
|----------|-------|-------------|
| Linux | `CogitatorBrowser-<version>.AppImage` | ✓ |
| Linux | `cogitator-browser-<version>.tar.gz` | — (manual) |
| Windows | `CogitatorBrowser-Setup-<version>.exe` (installer) | ✓ |
| Windows | `CogitatorBrowser-<version>-win.zip` (portable) | — (manual) |

Releases up to 2.2.6 name the installer `CogitatorBrowser.Setup.<version>.exe`.
Builds are not code-signed (expect a SmartScreen prompt on Windows).
macOS is not built by CI; `npm run build:mac` on a Mac produces a dmg.

## Install / Run (from source)

Requirements: Node.js 24+ (CI uses 26; the lockfile needs npm 11+ for
`npm ci`) and a C/C++ toolchain (python3, make, g++) — `npm install`
rebuilds the native `node-pty` module for Electron.

```bash
npm install
npm run dev          # dev loop
npm test             # vitest unit suite (src/main/tests)
npm run typecheck    # node (main process) + web (renderer/preload) configs
npm run build:linux  # AppImage + tar.gz via electron-builder (release/)
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

> Local automation: the Chromium DevTools Protocol listens on
> `127.0.0.1:9222` by default (for local agents), which lets any local
> process drive the browser. Launch with `COGITATOR_DISABLE_CDP=1` to turn
> it off.

### Tools — 60+ panels, varying depth
| Tier | Tools |
|------|-------|
| Real CLI/socket/PTY backends | Terminal (node-pty), Git, Docker, SSH, SQLite, PortScanner, WakeOnLAN, Archive, Downloader (yt-dlp), Network monitor |
| Real protocol backends | Torrent (WebTorrent), Email (IMAP/SMTP), RSS (main-process fetch, no third-party proxy) |
| Self-contained utilities | Calculator, calendar, regex, diff, JSON/API tester, QR, TOTP, color picker, OCR (tesseract.js), TTS, recorder, music visualizer... |
| File-backed tool store | Notes, journal, TODO, habits, timetrack — persisted in userData/toolstore (survive localStorage wipes; auto-migrated) |
| Real process manager | 3 s live process list + kill (demo mode removed) |

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
