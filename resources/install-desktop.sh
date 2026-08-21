#!/usr/bin/env bash
# Install Cogitator Browser launcher + desktop entry for HereticArch
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="${REPO_ROOT}/resources/launch-cogitator.sh"
BIN_DIR="${HOME}/.local/bin"
APPS_DIR="${HOME}/.local/share/applications"
ICON_THEME="${HOME}/.local/share/icons/hicolor"
DESKTOP_SRC="${REPO_ROOT}/resources/cogitator.desktop"
DESKTOP_DST="${APPS_DIR}/cogitator-browser.desktop"
SVG_ICON="${REPO_ROOT}/resources/cogitator-icon.svg"
PNG_ICON="${REPO_ROOT}/resources/icons/icon.png"

mkdir -p "${BIN_DIR}" "${APPS_DIR}" "${REPO_ROOT}/resources/icons"
chmod +x "${LAUNCHER}"

# Regenerate PNG from SVG (desktop shells cache PNG more reliably than loose SVG paths)
if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 256 -h 256 "${SVG_ICON}" -o "${PNG_ICON}"
  rsvg-convert -w 128 -h 128 "${SVG_ICON}" -o "${REPO_ROOT}/resources/icons/icon-128.png"
  rsvg-convert -w 48 -h 48 "${SVG_ICON}" -o "${REPO_ROOT}/resources/icons/icon-48.png"
fi

# Freedesktop icon theme (fixes stale menu icons after updates)
if [[ -f "${PNG_ICON}" ]]; then
  for size in 48 128 256; do
  mkdir -p "${ICON_THEME}/${size}x${size}/apps"
  rsvg-convert -w "${size}" -h "${size}" "${SVG_ICON}" -o "${ICON_THEME}/${size}x${size}/apps/cogitator-browser.png" 2>/dev/null \
    || cp "${PNG_ICON}" "${ICON_THEME}/${size}x${size}/apps/cogitator-browser.png"
  done
fi
mkdir -p "${ICON_THEME}/scalable/apps"
cp "${SVG_ICON}" "${ICON_THEME}/scalable/apps/cogitator-browser.svg"

# CLI shortcut: cogitator
ln -sf "${LAUNCHER}" "${BIN_DIR}/cogitator"

# Desktop menu — Icon=name resolves via hicolor theme
sed "s|^Exec=.*|Exec=${LAUNCHER}|; s|^Icon=.*|Icon=cogitator-browser|" "${DESKTOP_SRC}" > "${DESKTOP_DST}"
chmod 644 "${DESKTOP_DST}"

# Desktop shortcut (remove stale xdg-open shebang / old icon paths)
DESKTOP_SHORTCUT="${HOME}/Desktop/cogitator-browser.desktop"
cp "${DESKTOP_DST}" "${DESKTOP_SHORTCUT}"
chmod 755 "${DESKTOP_SHORTCUT}"

# systemd user unit — single canonical launcher path
SYSTEMD_UNIT="${HOME}/.config/systemd/user/cogitator-browser.service"
mkdir -p "$(dirname "${SYSTEMD_UNIT}")"
cat > "${SYSTEMD_UNIT}" <<UNIT
[Unit]
Description=Cogitator Browser — HereticArch
After=graphical-session.target

[Service]
Type=simple
ExecStart=${LAUNCHER}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
UNIT

# Legacy ~/bin symlink (some scripts still use it)
mkdir -p "${HOME}/bin"
ln -sf "${BIN_DIR}/cogitator" "${HOME}/bin/cogitator"

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "${ICON_THEME}" 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

# Never leave desktop integration owned by root after a sudo run
if [[ "$(id -u)" -eq 0 && -n "${SUDO_USER:-}" ]]; then
  chown -R "${SUDO_USER}:${SUDO_USER}" "${BIN_DIR}/cogitator" "${DESKTOP_DST}" "${DESKTOP_SHORTCUT}" "${SYSTEMD_UNIT}" "${HOME}/bin/cogitator" 2>/dev/null || true
fi

cat <<EOF
Cogitator installed.

  Terminal : cogitator
  Script   : ${LAUNCHER}
  Menu     : ${DESKTOP_DST}
  Icon     : cogitator-browser (hicolor theme)

Restart the app menu / log out if the icon still looks cached.
EOF
