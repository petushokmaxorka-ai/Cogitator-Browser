#!/usr/bin/env bash
# COGITATOR BROWSER — canonical launcher (Electron v2.0, repo root)
set -euo pipefail

# Repo root = parent of this script's real location (install-desktop.sh
# symlinks it into ~/.local/bin, so resolve links first).
ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
cd "${ROOT}"

needs_build() {
  [[ ! -f out/main/index.js ]] && return 0
  find src package.json electron.vite.config.ts -type f -newer out/main/index.js 2>/dev/null | grep -q .
}

if needs_build; then
  echo "Cogitator: building latest…" >&2
  npm run build
fi

# Stale out/ without rebuild → old JS errors (e.g. Object has been destroyed).
if [[ -f out/main/index.js ]] && ! grep -q 'safeRemoveBrowserView' out/main/index.js 2>/dev/null; then
  echo "Cogitator: stale build detected — rebuilding…" >&2
  npm run build
fi

# Close every stale Cogitator Electron (multiple zombies break which build you see).
if pgrep -f "${ROOT}/node_modules/.bin/electron" >/dev/null 2>&1 \
   || pgrep -f "${ROOT}/node_modules/electron/dist/electron" >/dev/null 2>&1; then
  echo "Cogitator: closing previous window(s)…" >&2
  pkill -f "${ROOT}/node_modules/.bin/electron" 2>/dev/null || true
  pkill -f "${ROOT}/node_modules/electron/dist/electron" 2>/dev/null || true
  sleep 1
fi

# Cursor/agents set ELECTRON_RUN_AS_NODE=1 — breaks Electron main (app is undefined).
unset ELECTRON_RUN_AS_NODE

# auto: FlClash :7890 when up (no GNOME PAC). direct = TUN-only. system/pac = opt-in.
export COGITATOR_PROXY_MODE="${COGITATOR_PROXY_MODE:-auto}"

# Set COGITATOR_DISABLE_GPU=1 if Vulkan/GPU process crashes (FATAL: GPU process isn't usable).
# export COGITATOR_DISABLE_GPU=1

# electron-vite preview rebuilds on every start; run the built bundle directly.
exec "${ROOT}/node_modules/.bin/electron" .
