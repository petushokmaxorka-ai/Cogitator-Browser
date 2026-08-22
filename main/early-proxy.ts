// Sync local-proxy detection — MUST run before app.whenReady() for Chromium CLI switches.

import { execSync } from 'child_process';

/** Loopback must bypass Clash — proxied 127.0.0.1 returns HTTP 502 (SearXNG, dashboard). */
const BYPASS_CLI = 'localhost,127.0.0.1,<local>,<loopback>';

export interface EarlyProxyConfig {
  proxyServer: string;
  bypassList: string;
  label: string;
}

let applied: EarlyProxyConfig | null = null;

function tcpPortOpen(port: number): boolean {
  try {
    execSync(`bash -c 'echo >/dev/tcp/127.0.0.1/${port}'`, { stdio: 'ignore', timeout: 400 });
    return true;
  } catch {
    return false;
  }
}

function getProxyMode(): string {
  return (process.env.COGITATOR_PROXY_MODE || 'auto').trim().toLowerCase();
}

/** Resolve FlClash / local proxy for Chromium --proxy-server (setProxy alone times out on YouTube). */
export function resolveEarlyProxyConfig(): EarlyProxyConfig | null {
  const mode = getProxyMode();
  if (mode === 'direct' || mode === 'pac' || mode === 'selective' || mode === 'system') {
    return null;
  }

  const envProxy = process.env.COGITATOR_PROXY?.trim();
  if (envProxy) {
    const http = envProxy.match(/http=127\.0\.0\.1:(\d+)/);
    if (http) {
      return {
        proxyServer: `http://127.0.0.1:${http[1]}`,
        bypassList: BYPASS_CLI,
        label: 'env',
      };
    }
    const socks = envProxy.match(/socks5:\/\/127\.0\.0\.1:(\d+)/i);
    if (socks) {
      return {
        proxyServer: `socks5://127.0.0.1:${socks[1]}`,
        bypassList: BYPASS_CLI,
        label: 'env-socks',
      };
    }
  }

  if (mode === 'auto') {
    if (tcpPortOpen(7890)) {
      return {
        proxyServer: 'http://127.0.0.1:7890',
        bypassList: BYPASS_CLI,
        label: 'clash-mixed',
      };
    }
    if (tcpPortOpen(7891)) {
      return {
        proxyServer: 'socks5://127.0.0.1:7891',
        bypassList: BYPASS_CLI,
        label: 'clash-socks',
      };
    }
    if (tcpPortOpen(10808)) {
      return {
        proxyServer: 'socks5://127.0.0.1:10808',
        bypassList: BYPASS_CLI,
        label: 'happ-socks',
      };
    }
  }

  return null;
}

export function markEarlyProxyApplied(cfg: EarlyProxyConfig): void {
  applied = cfg;
}

export function getEarlyProxyConfig(): EarlyProxyConfig | null {
  return applied;
}
