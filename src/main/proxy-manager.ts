// ═══ Proxy Manager — auto FlClash by default; optional PAC / system / direct ═══
// Default (auto): use local FlClash :7890 when reachable — no GNOME PAC.
// direct: TUN-only, no browser proxy. system/pac: opt-in.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { request as httpRequest } from 'http';
import { createConnection } from 'net';
import { homedir } from 'os';
import { join } from 'path';
import type { Session } from 'electron';
import type { VPNStatus } from '../shared/types';
import { getEarlyProxyConfig } from './early-proxy';

const PAC_DIR = join(homedir(), '.config/cogitator-browser');
const PAC_PATH = join(PAC_DIR, 'selective-proxy.pac');
const PAC_GLOBAL_BACKUP = join(PAC_DIR, 'selective-proxy.global-backup.pac');

const BYPASS =
  'localhost,127.*,192.168.*,10.*,172.16.*,172.17.*,172.18.*,172.19.*,172.20.*,*.local,<local>';

const CANDIDATES: Array<{ label: string; rules: string; ports: number[] }> = [
  { label: 'env', rules: '', ports: [] },
  { label: 'clash-mixed', rules: 'http=127.0.0.1:7890;socks5://127.0.0.1:7891', ports: [7890, 7891] },
  { label: 'clash-socks', rules: 'socks5://127.0.0.1:7891', ports: [7891] },
  { label: 'happ-socks', rules: 'socks5://127.0.0.1:10808', ports: [10808] },
  { label: 'happ-http', rules: 'http=127.0.0.1:10809;socks5://127.0.0.1:10808', ports: [10808, 10809] },
  { label: 'socks1080', rules: 'socks5://127.0.0.1:1080', ports: [1080] },
];

let activeRules = '';
let activeLabel = '';
let lastProxyChangeAt = 0;
const PROXY_SETTLE_MS = 800;

function proxyConfigKey(rules: string, label: string): string {
  return `${label}\0${rules}`;
}

function markProxyChanged(): void {
  lastProxyChangeAt = Date.now();
}

/** Wait until proxy stack stops changing (avoids ERR_NETWORK_CHANGED on first navigation). */
export async function waitForProxySettled(): Promise<void> {
  if (lastProxyChangeAt === 0) return;
  const remaining = PROXY_SETTLE_MS - (Date.now() - lastProxyChangeAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

async function applyRulesProxy(sess: Session, rules: string, label: string): Promise<boolean> {
  const key = proxyConfigKey(rules, label);
  const current = proxyConfigKey(activeRules, activeLabel);
  if (key === current) return true;
  await sess.setProxy({ proxyRules: rules, proxyBypassRules: BYPASS });
  activeRules = rules;
  activeLabel = label;
  markProxyChanged();
  return true;
}

function getProxyMode(): string {
  return (process.env.COGITATOR_PROXY_MODE || 'auto').trim().toLowerCase();
}

/** Only for explicit direct mode — bypass all proxy (TUN-only setups). */
export function shouldForceDirectConnection(): boolean {
  if (process.env.COGITATOR_PROXY?.trim()) return false;
  return getProxyMode() === 'direct';
}

/** Force Chromium to ignore OS/GNOME PAC (broken selective-proxy.pac → -131 on YouTube). */
async function applyDirectProxy(sess: Session): Promise<void> {
  await sess.setProxy({ mode: 'direct' });
}

function portOpen(host: string, port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(port, host);
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    setTimeout(() => done(false), timeoutMs);
  });
}

/** Probe every candidate port once, concurrently. This runs on the startup
 *  path before the main window opens, and on Windows a refused loopback
 *  connect only ends via the timeout (SYN retries), so sequential probes of
 *  the 7 candidate ports would add seconds to every launch. */
async function probeCandidatePorts(): Promise<Set<number>> {
  const ports = [...new Set(CANDIDATES.flatMap((c) => c.ports))];
  const open = new Set<number>();
  await Promise.all(
    ports.map(async (port) => {
      if (await portOpen('127.0.0.1', port)) open.add(port);
    }),
  );
  return open;
}

function rulesReachable(candidate: { ports: number[] }, openPorts: Set<number>): boolean {
  return candidate.ports.some((port) => openPorts.has(port));
}

/** A listening port is not a working tunnel: a dead xray/clash egress kills
 *  EVERY site while the port stays open. Probe real egress through the
 *  candidate's http-mixed port (generate_204) before trusting it. */
function httpEgressAlive(port: number, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: 'http://www.gstatic.com/generate_204',
        method: 'GET',
        headers: { Host: 'www.gstatic.com' },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve(!!res.statusCode && res.statusCode > 0 && res.statusCode < 500);
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function egressAlive(candidate: { label: string; rules: string }): Promise<boolean> {
  const httpMatch = candidate.rules.match(/http=127\.0\.0\.1:(\d+)/);
  if (!httpMatch) return true; // socks-only profile — no cheap probe, trust it
  const ok = await httpEgressAlive(Number(httpMatch[1]));
  if (!ok) {
    console.warn(
      `[Proxy] ${candidate.label} listens but egress is DEAD — skipping (direct fallback)`,
    );
  }
  return ok;
}

function isGlobalPac(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const hasLocalBypass =
    /isPlainHostName\s*\(/i.test(trimmed) ||
    (/DIRECT/i.test(trimmed) && /127\.\*|localhost|\.local/i.test(trimmed));
  if (hasLocalBypass) return false;
  return /PROXY|SOCKS/i.test(trimmed);
}

/** Chromium PAC supports PROXY / SOCKS / DIRECT — not SOCKS5. Each proxyRules
 *  entry maps by its own scheme, so a socks-only port is never tried as an
 *  HTTP proxy and COGITATOR_PROXY rules carry over into PAC mode. */
export function buildProxyChain(picked: { rules: string } | null): string {
  if (!picked) return 'DIRECT';
  const parts: string[] = [];
  for (const raw of picked.rules.split(';')) {
    // "http=host:port" → the proxy after the url-scheme selector
    const entry = raw.trim().replace(/^[a-z]+=/i, '');
    const m = entry.match(/^(?:([a-z0-9]+):\/\/)?([^\s/]+)$/i);
    if (!m) continue;
    const kind = (m[1] ?? 'http').toLowerCase().startsWith('socks') ? 'SOCKS' : 'PROXY';
    const directive = `${kind} ${m[2]}`;
    if (!parts.includes(directive)) parts.push(directive);
  }
  parts.push('DIRECT');
  return parts.join('; ');
}

async function buildSelectivePac(): Promise<string> {
  const picked = await pickProxyRules();
  const proxyChain = buildProxyChain(picked);
  return `function FindProxyForURL(url, host) {
  if (isPlainHostName(host) || host === "localhost" ||
      shExpMatch(host, "127.*") || shExpMatch(host, "192.168.*") ||
      shExpMatch(host, "10.*") || shExpMatch(host, "172.16.*") ||
      shExpMatch(host, "172.17.*") || shExpMatch(host, "172.18.*") ||
      shExpMatch(host, "172.19.*") || shExpMatch(host, "172.20.*") ||
      dnsDomainIs(host, ".local"))
    return "DIRECT";
  if (      dnsDomainIs(host, ".youtube.com") || host === "youtube.com" ||
      dnsDomainIs(host, ".googlevideo.com") || dnsDomainIs(host, ".ytimg.com") ||
      host === "youtu.be" || dnsDomainIs(host, ".ggpht.com") ||
      dnsDomainIs(host, ".gstatic.com") || dnsDomainIs(host, ".google.com") ||
      dnsDomainIs(host, ".googleapis.com") || dnsDomainIs(host, ".gvt1.com") ||
      dnsDomainIs(host, ".discord.com") || dnsDomainIs(host, ".discordapp.com") ||
      dnsDomainIs(host, ".discord.gg") || dnsDomainIs(host, ".twitter.com") ||
      host === "x.com" || dnsDomainIs(host, ".twimg.com") ||
      dnsDomainIs(host, ".reddit.com") || dnsDomainIs(host, ".twitch.tv") ||
      dnsDomainIs(host, ".steamcommunity.com") || dnsDomainIs(host, ".facebook.com") ||
      dnsDomainIs(host, ".instagram.com"))
    return "${proxyChain}";
  return "DIRECT";
}
`;
}

async function ensureSelectivePac(): Promise<string> {
  mkdirSync(PAC_DIR, { recursive: true });

  let existing = '';
  if (existsSync(PAC_PATH)) {
    existing = readFileSync(PAC_PATH, 'utf8');
  }

  if (existing && !isGlobalPac(existing) && !/SOCKS5/i.test(existing)) {
    return existing;
  }

  if (existing && isGlobalPac(existing) && !existsSync(PAC_GLOBAL_BACKUP)) {
    writeFileSync(PAC_GLOBAL_BACKUP, existing);
    console.warn('[Proxy] Backed up global PAC to selective-proxy.global-backup.pac');
  }

  const pac = await buildSelectivePac();
  writeFileSync(PAC_PATH, pac);
  return pac;
}

async function applyPacIfPresent(sess: Session): Promise<boolean> {
  await ensureSelectivePac();
  if (!existsSync(PAC_PATH)) return false;

  const pac = await buildSelectivePac();
  writeFileSync(PAC_PATH, pac);

  const pacUrl = `file://${PAC_PATH}`;
  await sess.setProxy({ pacScript: pacUrl });
  activeRules = pacUrl;
  activeLabel = 'pac-selective';
  console.log(`[Proxy] PAC active: ${PAC_PATH}`);
  return true;
}

async function pickProxyRules(): Promise<{ rules: string; label: string } | null> {
  const envProxy = process.env.COGITATOR_PROXY?.trim();
  if (envProxy) {
    return { rules: envProxy, label: 'env' };
  }

  const openPorts = await probeCandidatePorts();
  for (const c of CANDIDATES) {
    if (c.label === 'env') continue;
    if (!rulesReachable(c, openPorts)) continue;
    if (!(await egressAlive(c))) continue;
    return { rules: c.rules, label: c.label };
  }
  return null;
}

export async function applySessionProxy(sess: Session): Promise<boolean> {
  const mode = getProxyMode();

  // Legacy selective PAC — opt-in only (COGITATOR_PROXY_MODE=pac)
  if (mode === 'pac' || mode === 'selective') {
    return applyPacIfPresent(sess);
  }

  const envProxy = process.env.COGITATOR_PROXY?.trim();
  if (envProxy) {
    if (proxyConfigKey(envProxy, 'env') !== proxyConfigKey(activeRules, activeLabel)) {
      await sess.setProxy({
        proxyRules: envProxy,
        proxyBypassRules: BYPASS,
      });
      activeRules = envProxy;
      activeLabel = 'env';
      markProxyChanged();
      console.log(`[Proxy] COGITATOR_PROXY active: ${envProxy}`);
    }
    return true;
  }

  if (mode === 'direct') {
    if (proxyConfigKey('', 'direct') !== proxyConfigKey(activeRules, activeLabel)) {
      await applyDirectProxy(sess);
      activeRules = '';
      activeLabel = 'direct';
      markProxyChanged();
      console.log('[Proxy] Direct — TUN/VPN routes at OS level (no browser proxy)');
    }
    return false;
  }

  if (mode === 'auto') {
    const early = getEarlyProxyConfig();
    if (early) {
      if (activeLabel !== early.label || activeRules !== early.proxyServer) {
        activeRules = early.proxyServer;
        activeLabel = early.label;
        console.log(`[Proxy] Auto — CLI proxy active (${early.label})`);
      }
      return true;
    }
    const picked = await pickProxyRules();
    if (picked) {
      const changed =
        proxyConfigKey(picked.rules, picked.label) !== proxyConfigKey(activeRules, activeLabel);
      await applyRulesProxy(sess, picked.rules, picked.label);
      if (changed) {
        console.log(`[Proxy] Auto — local proxy (${picked.label}): ${picked.rules}`);
      }
      return true;
    }
    if (proxyConfigKey('', 'direct') !== proxyConfigKey(activeRules, activeLabel)) {
      await applyDirectProxy(sess);
      activeRules = '';
      activeLabel = 'direct';
      markProxyChanged();
      console.log('[Proxy] Auto — no local proxy port open; direct (TUN only)');
    }
    return false;
  }

  if (mode === 'system') {
    if (activeLabel !== 'system') {
      await sess.setProxy({ mode: 'system' });
      activeRules = 'system';
      activeLabel = 'system';
      markProxyChanged();
      console.log('[Proxy] System proxy (OS/FlClash — like a normal browser)');
    }
    return true;
  }

  return false;
}

export function clearProxyState(): void {
  activeRules = '';
  activeLabel = '';
}

export function getProxyStatus(): VPNStatus {
  return {
    connected:
      activeLabel === 'system' ||
      activeLabel === 'env' ||
      (activeRules.length > 0 && activeLabel !== 'direct'),
    ip: undefined,
    proxyRules: activeRules || undefined,
    proxySource: activeLabel || undefined,
  };
}

export async function refreshSessionProxy(sess: Session): Promise<VPNStatus> {
  await applySessionProxy(sess);
  return getProxyStatus();
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startProxyPolling(sess: Session, intervalMs = 60000): void {
  if (pollTimer) clearInterval(pollTimer);
  const mode = getProxyMode();
  if (mode !== 'pac' && mode !== 'selective' && mode !== 'auto') {
    return;
  }
  pollTimer = setInterval(() => {
    void applySessionProxy(sess);
  }, intervalMs);
}

export function stopProxyPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
