#!/usr/bin/env bash
# Install FlClashX for Prometheus VPN subscription (Linux)
set -euo pipefail

INSTALL_DIR="${HOME}/.local/share/FlClashX"
BIN_LINK="${HOME}/.local/bin/ficlashx"
APPS_DIR="${HOME}/.local/share/applications"
DESKTOP_DST="${APPS_DIR}/ficlashx.desktop"
SUB_URL="${PROMETHEUS_SUB_URL:-}"  # personal subscription link: pass via env, never commit it
APP_IMAGE_URL="https://github.com/pluralplay/FlClashX/releases/latest/download/FlClashX-linux-amd64.AppImage"
APP_IMAGE="${INSTALL_DIR}/FlClashX.AppImage"
MANUAL_CANDIDATES=(
  "${HOME}/Downloads/FlClashX-linux-amd64.AppImage"
  "${HOME}/Downloads/FlClashX.AppImage"
)

mkdir -p "${INSTALL_DIR}" "${APPS_DIR}" "$(dirname "${BIN_LINK}")"

if [[ ! -x "${APP_IMAGE}" ]]; then
  for candidate in "${MANUAL_CANDIDATES[@]}"; do
    if [[ -f "${candidate}" ]]; then
      cp "${candidate}" "${APP_IMAGE}"
      chmod +x "${APP_IMAGE}"
      echo "Using AppImage from ${candidate}"
      break
    fi
  done
fi

if [[ ! -x "${APP_IMAGE}" ]]; then
  echo "Downloading FlClashX AppImage…"
  if ! curl -fL --connect-timeout 20 --max-time 900 -o "${APP_IMAGE}.part" "${APP_IMAGE_URL}"; then
    rm -f "${APP_IMAGE}.part"
    cat >&2 <<'ERR'
Download failed (GitHub may be blocked without VPN).

Manual install:
  1. Open Prometheus panel → Linux → FiClashX → amd64 (AppImage)
  2. Save to ~/Downloads/FlClashX-linux-amd64.AppImage
  3. Re-run: bash resources/install-ficlashx.sh
ERR
    exit 1
  fi
  mv "${APP_IMAGE}.part" "${APP_IMAGE}"
  chmod +x "${APP_IMAGE}"
fi

ln -sf "${APP_IMAGE}" "${BIN_LINK}"

cat > "${DESKTOP_DST}" <<DESKTOP
[Desktop Entry]
Version=1.0
Name=FlClashX (Prometheus VPN)
Comment=Clash proxy client for Prometheus subscription
Exec=${APP_IMAGE}
Icon=network-vpn
Type=Application
Categories=Network;
Terminal=false
DESKTOP
chmod 644 "${DESKTOP_DST}"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

cat <<EOF
FlClashX installed.

  Binary : ${APP_IMAGE}
  CLI    : ficlashx
  Menu   : FlClashX (Prometheus VPN)

Subscription URL (add in app → Profiles → +):
  ${SUB_URL:-(set PROMETHEUS_SUB_URL, or copy the link from your provider panel)}

After Connect, SOCKS should listen on 127.0.0.1:7891
Check: bash /home/heretic/heretic-os/cogitator-browser/resources/happ-check.sh
EOF
