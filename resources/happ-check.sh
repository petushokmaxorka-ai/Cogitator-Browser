#!/usr/bin/env bash
# Quick Happ / SOCKS diagnostic for HereticArch
set -euo pipefail

echo "=== Happ / Proxy diagnostic ==="
echo "Public IP (direct): $(curl -sS -m 8 https://api.ipify.org 2>/dev/null || echo 'unreachable')"
echo

if pgrep -x Happ >/dev/null; then
  echo "[OK] Happ GUI running (pid $(pgrep -x Happ))"
else
  echo "[!!] Happ GUI not running — start: happ &"
fi

if pgrep -f happd >/dev/null; then
  echo "[OK] happd daemon running"
else
  echo "[!!] happd not running — restart Happ"
fi

if ss -tln | grep -q ':10808 '; then
  echo "[OK] Happ SOCKS5 on 127.0.0.1:10808"
elif ss -tln | grep -q ':7891 '; then
  echo "[OK] Clash/FiClash SOCKS on 127.0.0.1:7891"
elif ss -tln | grep -q ':7890 '; then
  echo "[OK] Clash/FiClash HTTP on 127.0.0.1:7890"
else
  echo "[!!] No local proxy (10808 / 7890 / 7891) — connect VPN client first"
fi

if ss -tln | grep -qE ':(10808|7891) '; then
  proxy='socks5h://127.0.0.1:10808'
  ss -tln | grep -q ':7891 ' && ! ss -tln | grep -q ':10808 ' && proxy='socks5h://127.0.0.1:7891'
  echo "Proxy IP: $(curl -sS -m 10 --proxy "$proxy" https://api.ipify.org 2>/dev/null || echo 'proxy test failed')"
fi

echo
echo "Happ prefs: tun=$(grep -E '^AdvancedSettings\\\\tun=' ~/.config/Happ.conf 2>/dev/null || echo 'unknown')"
echo "Cogitator: auto SOCKS :10808 when port is up (Settings → Rescan proxy)"
