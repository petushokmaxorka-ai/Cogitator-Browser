// ═══════════════════════════════════════════════════════════
// Torrent Manager — Main Process
// WebTorrent engine running in Electron main process.
// Communicates with renderer via IPC.
// ═══════════════════════════════════════════════════════════

import { app } from 'electron';
import { join } from 'path';
import { mkdir, readFile, writeFile, access } from 'fs/promises';
import type { BrowserWindow } from 'electron';

// Types imported from our declaration file
import type { Torrent, TorrentFile, Instance } from 'webtorrent';

// ── Types ──────────────────────────────────────────────────

export interface TorrentInfo {
  infoHash: string;
  magnetURI: string;
  name: string;
  length: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  numPeers: number;
  done: boolean;
  paused: boolean;
  files: TorrentFileInfo[];
  peers: TorrentPeerInfo[];
}

export interface TorrentFileInfo {
  name: string;
  length: number;
  path: string;
  progress: number;
  downloaded: number;
}

export interface TorrentPeerInfo {
  id: string;
  address: string;
  port: number;
  type: string;
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface TorrentAddOptions {
  magnetURI?: string;
  torrentPath?: string;
  savePath?: string;
}

// ── Manager ────────────────────────────────────────────────

interface PersistedTorrent {
  magnetURI?: string;
  torrentPath?: string;
  savePath: string;
  paused: boolean;
}

export class TorrentManager {
  private client: Instance | null = null;
  private downloadPath: string;
  private window: BrowserWindow | null = null;
  private torrents = new Map<string, Torrent>();
  private updateInterval: NodeJS.Timeout | null = null;
  private persistPath: string;

  constructor() {
    this.downloadPath = join(app.getPath('downloads'), 'CogitatorTorrents');
    this.persistPath = join(app.getPath('userData'), 'torrents.json');
  }

  async init(): Promise<void> {
    if (this.client) return;

    const mod = await import('webtorrent');
    const WebTorrentCtor = (mod as any).default || mod;
    this.client = new WebTorrentCtor();

    this.client.on('error', (err: Error) => {
      console.error('[TorrentManager] Client error:', err.message);
    });

    this.updateInterval = setInterval(() => {
      this.broadcastUpdate();
    }, 1000);

    // Restore persisted torrents
    await this.restoreTorrents();
  }

  // ── Persistence ─────────────────────────────────────────

  private async loadPersisted(): Promise<PersistedTorrent[]> {
    try {
      const raw = await readFile(this.persistPath, 'utf-8');
      return JSON.parse(raw) as PersistedTorrent[];
    } catch {
      return [];
    }
  }

  private async savePersisted(): Promise<void> {
    const data: PersistedTorrent[] = Array.from(this.torrents.values()).map((t) => ({
      magnetURI: t.magnetURI || undefined,
      torrentPath: (t as Torrent & { torrentPath?: string }).torrentPath,
      savePath: (t as any).path || this.downloadPath,
      paused: (t as any).paused ?? false,
    }));
    try {
      await writeFile(this.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[TorrentManager] Failed to save torrents:', err);
    }
  }

  private async restoreTorrents(): Promise<void> {
    const persisted = await this.loadPersisted();
    if (persisted.length === 0) return;

    console.log(`[TorrentManager] Restoring ${persisted.length} torrent(s)...`);
    for (const entry of persisted) {
      try {
        if (entry.torrentPath) {
          await this.add({ torrentPath: entry.torrentPath, savePath: entry.savePath });
        } else if (entry.magnetURI) {
          await this.add({ magnetURI: entry.magnetURI, savePath: entry.savePath });
        }
        if (entry.paused) {
          const t = Array.from(this.torrents.values()).pop();
          if (t) t.pause();
        }
      } catch (err) {
        console.error('[TorrentManager] Failed to restore torrent:', err);
      }
    }
  }

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  private getClient(): Instance {
    if (!this.client) throw new Error('TorrentManager not initialized. Call init() first.');
    return this.client;
  }

  // ── Add ─────────────────────────────────────────────────

  async add(options: TorrentAddOptions): Promise<string> {
    await this.init();
    await mkdir(this.downloadPath, { recursive: true });

    const { magnetURI, torrentPath, savePath } = options;
    if (!magnetURI && !torrentPath) {
      throw new Error('magnetURI or torrentPath required');
    }
    const path = savePath || this.downloadPath;
    const source = torrentPath ?? magnetURI!;

    return new Promise((resolve, reject) => {
      const client = this.getClient();
      const torrent = client.add(source, { path }, (t: Torrent) => {
        console.log('[TorrentManager] Added:', t.name, t.infoHash);
        if (torrentPath) {
          (t as Torrent & { torrentPath?: string }).torrentPath = torrentPath;
        }
        this.torrents.set(t.infoHash, t);
        this.savePersisted();
        this.broadcastUpdate();
        resolve(t.infoHash);
      });

      torrent.on('error', (err: Error) => {
        console.error('[TorrentManager] Torrent error:', err.message);
        reject(err);
      });
    });
  }

  // ── Remove ──────────────────────────────────────────────

  remove(infoHash: string): void {
    const torrent = this.torrents.get(infoHash);
    if (torrent) {
      this.getClient().remove(infoHash, { destroyStore: false }, (err?: Error) => {
        if (err) console.error('[TorrentManager] Remove error:', err);
      });
      this.torrents.delete(infoHash);
      this.savePersisted();
      this.broadcastUpdate();
    }
  }

  // ── Pause / Resume ──────────────────────────────────────

  pause(infoHash: string): void {
    const torrent = this.torrents.get(infoHash);
    if (torrent) {
      torrent.pause();
      this.savePersisted();
      this.broadcastUpdate();
    }
  }

  resume(infoHash: string): void {
    const torrent = this.torrents.get(infoHash);
    if (torrent) {
      torrent.resume();
      this.savePersisted();
      this.broadcastUpdate();
    }
  }

  // ── Get list ────────────────────────────────────────────

  getTorrents(): TorrentInfo[] {
    return Array.from(this.torrents.values()).map((t) => this.serializeTorrent(t));
  }

  // ── Get file stream URL (blob via IPC) ──────────────────

  async getFileStreamURL(infoHash: string, fileIndex: number): Promise<string | null> {
    const torrent = this.torrents.get(infoHash);
    if (!torrent || !torrent.files[fileIndex]) return null;

    return new Promise((resolve, reject) => {
      const file = torrent.files[fileIndex];
      file.getBlobURL((err: Error | null, url: string) => {
        if (err) reject(err);
        else resolve(url);
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────

  private extractPeers(t: Torrent): TorrentPeerInfo[] {
    const wires = (t as Torrent & { wires?: unknown[] }).wires ?? [];
    return wires.map((raw, i) => {
      const w = raw as {
        peerId?: Buffer;
        type?: string;
        remoteAddress?: string;
        remotePort?: number;
        downloadSpeed?: () => number;
        uploadSpeed?: () => number;
      };
      const id = w.peerId ? w.peerId.toString('hex').slice(0, 12) : `wire-${i}`;
      return {
        id,
        address: w.remoteAddress ?? (w.type === 'webrtc' ? 'webrtc' : '—'),
        port: w.remotePort ?? 0,
        type: w.type ?? 'unknown',
        downloadSpeed: typeof w.downloadSpeed === 'function' ? w.downloadSpeed() : 0,
        uploadSpeed: typeof w.uploadSpeed === 'function' ? w.uploadSpeed() : 0,
      };
    });
  }

  private serializeTorrent(t: Torrent): TorrentInfo {
    return {
      infoHash: t.infoHash,
      magnetURI: t.magnetURI,
      name: t.name,
      length: t.length,
      downloaded: t.downloaded,
      uploaded: t.uploaded,
      downloadSpeed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed,
      progress: t.progress,
      numPeers: t.numPeers,
      done: t.done,
      paused: (t as any).paused ?? false,
      files: t.files.map((f: TorrentFile) => ({
        name: f.name,
        length: f.length,
        path: f.path,
        progress: f.progress,
        downloaded: f.downloaded,
      })),
      peers: this.extractPeers(t),
    };
  }

  private broadcastUpdate(): void {
    if (!this.window || this.window.isDestroyed()) return;
    const data = this.getTorrents();
    this.window.webContents.send('torrent:on-update', data);
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.client) {
      this.client.destroy((err?: Error) => {
        if (err) console.error('[TorrentManager] Destroy error:', err);
      });
      this.client = null;
    }
  }
}
