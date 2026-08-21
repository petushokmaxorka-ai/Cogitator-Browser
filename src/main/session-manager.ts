// ═══════════════════════════════════════════════════════════
// Session Manager — COGITATOR BROWSER v2
// Browsing data clearing, auto-clear on exit, and session
// isolation management.
// ═══════════════════════════════════════════════════════════

import { session, type Session } from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

// ═══════════════════════════════════════════════════════════
// Configuration types
// ═══════════════════════════════════════════════════════════

/** What data types to auto-clear on browser exit */
export interface AutoClearConfig {
  /** Clear all cookies on exit */
  cookies: boolean;
  /** Clear HTTP cache on exit */
  cache: boolean;
  /** Clear browsing history on exit */
  history: boolean;
  /** Clear downloaded files list on exit */
  downloads: boolean;
  /** Clear localStorage / indexedDB on exit */
  storage: boolean;
  /** Clear service workers on exit */
  serviceWorkers: boolean;
  /** Enable auto-clear on exit */
  onExit: boolean;
}

export const DEFAULT_AUTO_CLEAR_CONFIG: AutoClearConfig = {
  cookies: false,
  cache: true,
  history: false,
  downloads: false,
  storage: false,
  serviceWorkers: true,
  onExit: true,
};

// ═══════════════════════════════════════════════════════════
// Session Manager class
// ═══════════════════════════════════════════════════════════

export class SessionManager {
  private config: AutoClearConfig;
  private configPath: string;
  private initialized = false;

  constructor() {
    this.configPath = join(app.getPath('userData'), 'session-config.json');
    this.config = { ...DEFAULT_AUTO_CLEAR_CONFIG };
  }

  // ── Initialization ──────────────────────────────────────

  /** Initialize the session manager: load config, register exit handler */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.loadConfig();
    this.registerExitHandler();
    this.initialized = true;
  }

  // ── Config persistence ──────────────────────────────────

  private async loadConfig(): Promise<void> {
    try {
      const data = await readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<AutoClearConfig>;
      this.config = { ...DEFAULT_AUTO_CLEAR_CONFIG, ...parsed };
    } catch {
      // Config doesn't exist yet — use defaults
      this.config = { ...DEFAULT_AUTO_CLEAR_CONFIG };
      await this.saveConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SessionManager] Failed to save config:', err);
    }
  }

  // ── Auto-clear on exit ──────────────────────────────────

  private registerExitHandler(): void {
    app.on('before-quit', async (event) => {
      if (!this.config.onExit) return;

      // Prevent immediate exit while we clear data
      event.preventDefault();

      try {
        await this.clearBasedOnConfig();
      } catch (err) {
        console.error('[SessionManager] Auto-clear failed:', err);
      }

      // Now actually quit
      app.exit(0);
    });
  }

  private async clearBasedOnConfig(): Promise<void> {
    const s = session.defaultSession;
    const storages: string[] = [];

    if (this.config.cookies) {
      await s.clearStorageData({ storages: ['cookies'] });
    }
    if (this.config.storage) {
      storages.push('localstorage', 'indexdb', 'websql');
    }
    if (this.config.serviceWorkers) {
      storages.push('serviceworkers', 'cachestorage');
    }

    if (storages.length > 0) {
      await s.clearStorageData({
        storages: storages as StorageType[],
      });
    }

    if (this.config.cache) {
      await s.clearCache();
      await s.clearHostResolverCache();
    }

    if (this.config.history) {
      await s.clearHistory?.();
    }

    // Downloads list: clear auth cache as proxy
    if (this.config.downloads) {
      await s.clearAuthCache();
    }
  }

  // ── Public: Get/Set config ──────────────────────────────

  getAutoClearConfig(): AutoClearConfig {
    return { ...this.config };
  }

  async setAutoClearConfig(config: Partial<AutoClearConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfig();
  }

  // ── Public: Clear all browsing data ─────────────────────

  async clearAll(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;

    await s.clearStorageData({
      storages: [
        'appcache',
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
      ] as StorageType[],
    });

    await s.clearCache();
    await s.clearHostResolverCache();
    await s.clearAuthCache();

    // Clear history if API is available
    try {
      await s.clearHistory?.();
    } catch {
      // clearHistory may not be available in all Electron versions
    }
  }

  // ── Public: Clear specific data types ───────────────────

  async clearCookies(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    await s.clearStorageData({
      storages: ['cookies'] as StorageType[],
    });
  }

  async clearCache(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    await s.clearCache();
    await s.clearHostResolverCache();
  }

  async clearStorage(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    await s.clearStorageData({
      storages: ['localstorage', 'indexdb', 'websql'] as StorageType[],
    });
  }

  async clearServiceWorkers(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    await s.clearStorageData({
      storages: ['serviceworkers', 'cachestorage'] as StorageType[],
    });
  }

  async clearHistory(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    try {
      await s.clearHistory?.();
    } catch {
      console.warn('[SessionManager] clearHistory not available in this Electron version');
    }
  }

  async clearAuth(targetSession?: Session): Promise<void> {
    const s = targetSession || session.defaultSession;
    await s.clearAuthCache();
  }

  // ── Public: Session isolation ───────────────────────────

  /** Create an isolated partition session (e.g., for private tabs) */
  createIsolatedSession(partition: string): Session {
    return session.fromPartition(partition, { cache: false });
  }

  /** Purge all data from a specific partition */
  async purgePartition(partition: string): Promise<void> {
    const s = session.fromPartition(partition);
    await this.clearAll(s);
  }
}

// ═══════════════════════════════════════════════════════════
// Storage type helper (Electron's StorageType union)
// ═══════════════════════════════════════════════════════════

type StorageType =
  | 'appcache'
  | 'cookies'
  | 'filesystem'
  | 'indexdb'
  | 'localstorage'
  | 'shadercache'
  | 'websql'
  | 'serviceworkers'
  | 'cachestorage';

// ═══════════════════════════════════════════════════════════
// Singleton export
// ═══════════════════════════════════════════════════════════

export const sessionManager = new SessionManager();
