// ═══════════════════════════════════════════════════════════
// System Monitor Manager — Real-time hardware metrics
// Uses systeminformation library for cross-platform data.
// ═══════════════════════════════════════════════════════════

import si from 'systeminformation';
import { createConnection } from 'net';
import { request } from 'https';
import type { BrowserWindow } from 'electron';
import { isDestroyedError, isWindowLive } from './electron-guards';

// ── Types ─────────────────────────────────────────────────

export interface SysmonStats {
  cpuUsage: number;
  ramUsed: number; // MB
  ramTotal: number; // MB
  diskUsed: number; // GB
  diskTotal: number; // GB
  netDown: number; // KB/s
  netUp: number; // KB/s
  uptime: number; // seconds
  processes: number;
  platform: string;
  distro: string;
  release: string;
  arch: string;
  hostname: string;
}

export interface SpeedTestResult {
  ping: number; // ms
  download: number; // Mbps
  upload: number; // Mbps
}

// ═══════════════════════════════════════════════════════════
// SysmonManager
// ═══════════════════════════════════════════════════════════

export class SysmonManager {
  private window: BrowserWindow | null = null;
  private interval: NodeJS.Timeout | null = null;

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.pushStats(), 2000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async getStats(): Promise<SysmonStats> {
    const [cpu, mem, fsSize, network, osInfo, processes, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.osInfo(),
      si.processes(),
      si.time(),
    ]);

    return {
      cpuUsage: Math.round(cpu.currentLoad ?? 0),
      ramUsed: Math.round((mem.used ?? 0) / 1024 / 1024),
      ramTotal: Math.round((mem.total ?? 0) / 1024 / 1024),
      diskUsed: fsSize[0] ? Math.round((fsSize[0].used / 1024 / 1024 / 1024) * 10) / 10 : 0,
      diskTotal: fsSize[0] ? Math.round((fsSize[0].size / 1024 / 1024 / 1024) * 10) / 10 : 0,
      netDown: network[0] ? Math.round((network[0].rx_sec ?? 0) / 1024) : 0,
      netUp: network[0] ? Math.round((network[0].tx_sec ?? 0) / 1024) : 0,
      uptime: Math.round(time.uptime ?? 0),
      processes: processes.all ?? 0,
      platform: osInfo.platform ?? 'unknown',
      distro: osInfo.distro ?? '',
      release: osInfo.release ?? '',
      arch: osInfo.arch ?? '',
      hostname: osInfo.hostname ?? 'unknown',
    };
  }

  private async pushStats(): Promise<void> {
    const win = this.window;
    if (!isWindowLive(win)) {
      this.stop();
      return;
    }
    try {
      const stats = await this.getStats();
      if (!isWindowLive(this.window)) return;
      if (this.window.webContents.isDestroyed()) return;
      this.window.webContents.send('sysmon:update', stats);
    } catch (err) {
      if (isDestroyedError(err)) {
        this.stop();
        return;
      }
      console.error('[SysmonManager] Failed to push stats:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Speed Test
// ═══════════════════════════════════════════════════════════

function measurePing(host: string, port: number): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = createConnection(port, host);
    socket.setTimeout(5000);
    socket.once('connect', () => {
      resolve(Date.now() - start);
      socket.destroy();
    });
    socket.once('error', () => {
      resolve(-1);
      socket.destroy();
    });
    socket.once('timeout', () => {
      resolve(-1);
      socket.destroy();
    });
  });
}

function cloudflareDownload(bytes: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = request(
      `https://speed.cloudflare.com/__down?bytes=${bytes}`,
      { method: 'GET', timeout: 30000 },
      (res) => {
        let received = 0;
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
        });
        res.on('end', () => resolve());
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
    req.end();
  });
}

function cloudflareUpload(bytes: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(bytes, 0x00);
    const req = request(
      'https://speed.cloudflare.com/__up',
      {
        method: 'POST',
        headers: { 'Content-Length': bytes },
        timeout: 30000,
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve());
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Upload timeout'));
    });
    req.write(buffer);
    req.end();
  });
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  // Ping: TCP connect to Cloudflare DNS
  const ping = await measurePing('1.1.1.1', 53);

  // Download: 10MB from Cloudflare
  const dlBytes = 10_000_000;
  const dlStart = Date.now();
  try {
    await cloudflareDownload(dlBytes);
  } catch {
    // If Cloudflare fails, return -1 for download
    return { ping, download: -1, upload: -1 };
  }
  const dlMs = Date.now() - dlStart;
  const downloadMbps = dlMs > 0 ? (dlBytes * 8) / (dlMs / 1000) / 1_000_000 : 0;

  // Upload: 5MB to Cloudflare
  const ulBytes = 5_000_000;
  const ulStart = Date.now();
  try {
    await cloudflareUpload(ulBytes);
  } catch {
    return { ping, download: downloadMbps, upload: -1 };
  }
  const ulMs = Date.now() - ulStart;
  const uploadMbps = ulMs > 0 ? (ulBytes * 8) / (ulMs / 1000) / 1_000_000 : 0;

  return {
    ping,
    download: Math.round(downloadMbps * 10) / 10,
    upload: Math.round(uploadMbps * 10) / 10,
  };
}
