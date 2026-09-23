// ═══════════════════════════════════════════════════════════
// COGITATOR BROWSER — Network Monitor (live system + Chromium feed)
// Two data sources aggregated for the NetworkMonitor panel:
//   1. systeminformation — active TCP/UDP sockets + interface traffic
//   2. session.defaultSession.webRequest — in-browser HTTP request log
// Ring buffer keeps last N entries; cleared on demand or by panel.
// ═══════════════════════════════════════════════════════════

import { session } from 'electron';
import * as si from 'systeminformation';

// ── Public types (mirrored in renderer) ─────────────────────

export interface NetConnection {
  protocol: string;
  localAddress: string;
  localPort: number;
  peerAddress: string;
  peerPort: number;
  state: string;
  pid: number;
  process: string;
}

export interface InterfaceStat {
  iface: string;
  operstate: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_sec: number;
  tx_sec: number;
  speed?: number;
}

export interface RequestActivity {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  type: string;
  size: number;
  time: number;
  startTime: number;
  endTime: number;
  fromCache: boolean;
}

// ── Ring buffer for Chromium request activity ───────────────

const MAX_ENTRIES = 500;
const activityBuffer: RequestActivity[] = [];
const startTimes = new Map<number, number>();

let activityCounter = 0;
let installed = false;

function pushActivity(entry: RequestActivity): void {
  activityBuffer.push(entry);
  if (activityBuffer.length > MAX_ENTRIES) {
    activityBuffer.shift();
  }
  activityCounter++;
}

function resourceTypeToString(type: string | undefined): string {
  switch (type) {
    case 'mainFrame':
    case 'subFrame':
      return 'document';
    case 'stylesheet':
      return 'stylesheet';
    case 'script':
      return 'script';
    case 'image':
      return 'image';
    case 'fontResource':
      return 'font';
    case 'xhr':
      return 'xhr';
    case 'fetch':
      return 'fetch';
    case 'media':
      return 'media';
    case 'webSocket':
      return 'websocket';
    default:
      return type ? String(type).toLowerCase() : 'other';
  }
}

/**
 * Attach webRequest listeners to the default session. Idempotent —
 * safe to call multiple times. Collects request start/completion into
 * the ring buffer for the renderer to poll.
 */
export function installNetworkMonitor(): void {
  if (installed) return;
  const sess = session.defaultSession;
  if (!sess) return;

  try {
    sess.webRequest.onBeforeRequest(({ id, webContents }, callback) => {
      // Record start timestamp keyed by request id (per webContents).
      void webContents;
      if (!startTimes.has(id)) startTimes.set(id, Date.now());
      // Blocking listener: the request stalls until the callback runs.
      callback({});
    });

    sess.webRequest.onCompleted(({ id, url, method, statusCode, statusLine, resourceType, fromCache }) => {
      const start = startTimes.get(id) ?? Date.now();
      startTimes.delete(id);
      const now = Date.now();
      pushActivity({
        id: `r${activityCounter}`,
        url,
        method,
        status: statusCode,
        statusText: statusLine || '',
        type: resourceTypeToString(resourceType),
        size: 0,
        time: now - start,
        startTime: start,
        endTime: now,
        fromCache,
      });
    });

    sess.webRequest.onErrorOccurred(({ id, url, method, resourceType, error }) => {
      const start = startTimes.get(id) ?? Date.now();
      startTimes.delete(id);
      const now = Date.now();
      pushActivity({
        id: `r${activityCounter}`,
        url,
        method,
        status: 0,
        statusText: error || 'error',
        type: resourceTypeToString(resourceType),
        size: 0,
        time: now - start,
        startTime: start,
        endTime: now,
        fromCache: false,
      });
    });

    installed = true;
  } catch (err) {
    console.warn('[network-monitor] install failed:', err);
  }
}

// ── Snapshot getters for IPC handlers ───────────────────────

/**
 * Active TCP/UDP connections via systeminformation. Wrapped to never
 * throw — degrades to empty array if the host refuses (permissions).
 */
export async function getConnections(): Promise<NetConnection[]> {
  try {
    const raw = (await si.networkConnections()) as Array<{
      protocol?: string;
      localaddress?: string;
      localport?: string;
      peeraddress?: string;
      peerport?: string;
      state?: string;
      pid?: number;
      process?: string;
    }>;
    return raw.map((c) => ({
      protocol: c.protocol || '?',
      localAddress: c.localaddress || '-',
      localPort: Number(c.localport) || 0,
      peerAddress: c.peeraddress || '-',
      peerPort: Number(c.peerport) || 0,
      state: c.state || 'unknown',
      pid: c.pid || 0,
      process: c.process || '-',
    }));
  } catch (err) {
    console.warn('[network-monitor] getConnections failed:', err);
    return [];
  }
}

/**
 * Interface traffic statistics with rx/tx rates. systeminformation
 * needs two samples to compute *_sec deltas; we return the latest.
 */
export async function getInterfaceStats(): Promise<InterfaceStat[]> {
  try {
    const stats = (await si.networkStats()) as Array<{
      iface: string;
      operstate?: string;
      rx_bytes?: number;
      tx_bytes?: number;
      rx_sec?: number;
      tx_sec?: number;
      speed?: number;
    }>;
    return stats.map((s) => ({
      iface: s.iface,
      operstate: s.operstate || 'unknown',
      rx_bytes: s.rx_bytes || 0,
      tx_bytes: s.tx_bytes || 0,
      rx_sec: s.rx_sec || 0,
      tx_sec: s.tx_sec || 0,
      speed: typeof s.speed === 'number' ? s.speed : undefined,
    }));
  } catch (err) {
    console.warn('[network-monitor] getInterfaceStats failed:', err);
    return [];
  }
}

/**
 * Poll the Chromium request-activity ring buffer. Returns all buffered
 * entries since the given cursor (last seen counter) — caller passes 0
 * for the first poll, then passes back the returned nextCursor.
 */
export function getActivity(sinceCursor: number): {
  entries: RequestActivity[];
  nextCursor: number;
  total: number;
} {
  // Linear scan from the buffer; cheap because MAX_ENTRIES=500.
  const entries = activityBuffer.filter((_, idx) => idx >= sinceCursor);
  return {
    entries,
    nextCursor: activityBuffer.length,
    total: activityBuffer.length,
  };
}

/** Clear the Chromium request-activity buffer (user clicked "clear"). */
export function clearActivity(): void {
  activityBuffer.length = 0;
  startTimes.clear();
}
