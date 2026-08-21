#!/usr/bin/env bash
# Export COGITATOR BROWSER as a clean standalone git repo (no heretic-os monorepo noise).
# Usage:
#   bash scripts/export-standalone-repo.sh [/path/to/cogitator-browser]
# Then:
#   cd /path/to/cogitator-browser && git init -b main && git add -A \
#     && git commit -m "feat: cogitator-browser — snapshot from heretic-os"
#   gh repo create <owner>/Cogitator-Browser --private --source=. --remote=origin --push
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DST="${1:-$HOME/cogitator-browser}"

mkdir -p "$DST"
rsync -a --delete \
  --exclude node_modules \
  --exclude release \
  --exclude out \
  --exclude dist \
  --exclude .git \
  --exclude .anathemetron \
  --exclude '.anathemetron*' \
  --exclude '*.tsbuildinfo' \
  --exclude '.cache' \
  "$SRC/" "$DST/"

# Planning docs → docs/history: clean repo root, nothing lost.
mkdir -p "$DST/docs/history"
cd "$DST"
for f in DEVPLAN*.md CHECKPOINT*.md IPC_AUDIT.md; do
  [ -f "$f" ] && mv "$f" docs/history/
done

echo "Exported to $DST"
echo "Next: git init -b main && git add -A && git commit -m 'feat: snapshot 2.1.0'"
