// ═══════════════════════════════════════════════════════════
// Picture-in-Picture Manager — Cogitator Browser
// Floating video window that persists when browser is minimized.
// Inspired by Yandex Browser's "Video Pop-out" feature.
// ═══════════════════════════════════════════════════════════

import { BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { isDestroyedError, isWindowLive } from './electron-guards';
import { buildYoutubeEmbedUrl } from '../shared/youtube-embed';

// ── Types ─────────────────────────────────────────────────

interface VideoState {
  tabId: string;
  url: string;
  title: string;
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  videoWidth: number;
  videoHeight: number;
  youtubeId?: string;
}

const YT_ID_PATTERNS = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /\/shorts\/([a-zA-Z0-9_-]{11})/,
  /\/embed\/([a-zA-Z0-9_-]{11})/,
  /\/live\/([a-zA-Z0-9_-]{11})/,
];

function extractYoutubeId(url: string): string | null {
  if (!url || !/youtube\.com|youtu\.be/i.test(url)) return null;
  for (const pattern of YT_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface PiPBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

// ── Constants ─────────────────────────────────────────────

const DEFAULT_PIP_WIDTH = 420;
const DEFAULT_PIP_HEIGHT = 236; // 16:9 ratio
const POLL_INTERVAL_MS = 600;

// Script to detect video state in a tab (injected via executeJavaScript)
const VIDEO_DETECTOR_SCRIPT = `
(() => {
  const videos = Array.from(document.querySelectorAll('video'));
  const playing = videos.find(v => !v.paused && v.readyState >= 2);
  const any = videos[0];
  const video = playing || any;
  if (!video) return null;

  let youtubeId = null;
  try {
    const href = location.href;
    if (/youtube\\.com|youtu\\.be/i.test(href)) {
      const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\\.be\\/([a-zA-Z0-9_-]{11})/,
        /\\/shorts\\/([a-zA-Z0-9_-]{11})/,
        /\\/embed\\/([a-zA-Z0-9_-]{11})/,
        /\\/live\\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const p of patterns) {
        const m = href.match(p);
        if (m) { youtubeId = m[1]; break; }
      }
      if (!youtubeId && window.ytInitialPlayerResponse?.videoDetails?.videoId) {
        youtubeId = window.ytInitialPlayerResponse.videoDetails.videoId;
      }
      if (!youtubeId) {
        const canon = document.querySelector('link[rel="canonical"]');
        const canonHref = canon && canon.getAttribute('href');
        if (canonHref) {
          const cm = canonHref.match(/(?:[?&]v=|\\/shorts\\/|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);
          if (cm) youtubeId = cm[1];
        }
      }
      if (!youtubeId) {
        const og = document.querySelector('meta[property="og:url"]');
        const ogUrl = og && og.getAttribute('content');
        if (ogUrl) {
          const om = ogUrl.match(/(?:[?&]v=|\\/shorts\\/|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);
          if (om) youtubeId = om[1];
        }
      }
    }
  } catch {}

  return {
    src: video.currentSrc || video.src || '',
    currentTime: video.currentTime || 0,
    duration: video.duration || 0,
    paused: video.paused,
    volume: video.volume || 1,
    videoWidth: video.videoWidth || 0,
    videoHeight: video.videoHeight || 0,
    readyState: video.readyState,
    youtubeId,
  };
})()
`;

// Script to pause/resume video in tab
const PAUSE_VIDEO_SCRIPT = `(() => { const v = document.querySelector('video'); if (v) v.pause(); })()`;
const PLAY_VIDEO_SCRIPT = `(() => { const v = document.querySelector('video'); if (v) v.play(); })()`;
const SEEK_VIDEO_SCRIPT = (time: number) =>
  `(() => { const v = document.querySelector('video'); if (v) v.currentTime = ${time}; })()`;

// ═══════════════════════════════════════════════════════════
// PiPManager
// ═══════════════════════════════════════════════════════════

export class PiPManager {
  private mainWindow: BrowserWindow | null = null;
  private pipWindow: BrowserWindow | null = null;
  private tabManager: any = null;
  private activeVideo: VideoState | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private autoPiP = false;
  private bounds: PiPBounds = {
    width: DEFAULT_PIP_WIDTH,
    height: DEFAULT_PIP_HEIGHT,
    x: 0,
    y: 0,
  };

  // ── Setup ───────────────────────────────────────────────

  setWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setTabManager(tabManager: any): void {
    this.tabManager = tabManager;
  }

  init(): void {
    // Poll active tab for video
    this.pollInterval = setInterval(() => this.pollVideoState(), POLL_INTERVAL_MS);

    // IPC handlers
    ipcMain.handle('pip:toggle', () => this.togglePiP());
    ipcMain.handle('pip:get-state', () => this.getState());
    ipcMain.handle('pip:close', () => this.closePiP());
    ipcMain.on('pip:control', (_event, action: string, data?: any) => {
      this.handlePiPControl(action, data);
    });
  }

  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.closePiP();
  }

  // ── Video Detection (polling) ───────────────────────────

  private async pollVideoState(): Promise<void> {
    if (!this.tabManager || !isWindowLive(this.mainWindow)) return;

    const activeTabId = this.tabManager.getActiveTabId?.();
    if (!activeTabId) {
      if (this.activeVideo) {
        this.activeVideo = null;
        this.notifyStateChange();
      }
      return;
    }

    const view = this.tabManager.getTabWebContents?.(activeTabId);
    if (!view || view.isDestroyed()) {
      if (this.activeVideo) {
        this.activeVideo = null;
        this.notifyStateChange();
      }
      return;
    }

    try {
      const result = await view.executeJavaScript(VIDEO_DETECTOR_SCRIPT);

      if (!result) {
        if (this.activeVideo) {
          this.activeVideo = null;
          this.notifyStateChange();
          // If PiP is open and video disappeared, close it
          if (this.pipWindow) {
            this.closePiP();
          }
        }
        return;
      }

      const tab = this.tabManager.getActiveTab?.();
      const hadVideo = !!this.activeVideo;
      let pageUrl = tab?.url || '';
      try {
        if (!view.isDestroyed()) {
          pageUrl = view.getURL() || pageUrl;
        }
      } catch {
        /* tab navigating */
      }

      const youtubeId =
        (typeof result.youtubeId === 'string' && result.youtubeId) ||
        extractYoutubeId(pageUrl) ||
        undefined;

      this.activeVideo = {
        tabId: activeTabId,
        url: pageUrl,
        title: tab?.title || 'Video',
        src: result.src,
        currentTime: result.currentTime,
        duration: result.duration,
        paused: result.paused,
        volume: result.volume,
        videoWidth: result.videoWidth,
        videoHeight: result.videoHeight,
        youtubeId,
      };

      // Sync state to PiP window if open
      if (this.pipWindow && !this.pipWindow.isDestroyed()) {
        this.pipWindow.webContents.send('pip:sync', {
          currentTime: result.currentTime,
          paused: result.paused,
          duration: result.duration,
        });
      }

      if (!hadVideo || this.activeVideo.paused !== result.paused) {
        this.notifyStateChange();
      }

      // Auto-PiP: browser minimized + video playing + no PiP yet
      if (
        this.mainWindow.isMinimized() &&
        !result.paused &&
        !this.pipWindow &&
        !this.autoPiP
      ) {
        this.autoPiP = true;
        this.openPiP();
      }
    } catch (err) {
      if (isDestroyedError(err)) return;
      // Tab may be navigating or script execution blocked
    }
  }

  // ── PiP Window Lifecycle ────────────────────────────────

  togglePiP(): boolean {
    if (this.pipWindow) {
      this.closePiP();
      return false;
    }
    if (!this.activeVideo) return false;
    this.openPiP();
    return true;
  }

  private openPiP(): void {
    if (!this.activeVideo || !this.mainWindow) return;
    if (this.pipWindow) return;

    const video = this.withLiveTabUrl(this.activeVideo);
    const payload = this.buildPayload(video);

    if (payload.type === 'youtube' && payload.videoId) {
      this.openYoutubeDirectPiP(
        payload.videoId as string,
        (payload.startTime as number) ?? 0,
        (payload.title as string) ?? 'Video',
      );
      return;
    }

    this.openShellPiP();
  }

  /** YouTube: load embed in PiP window directly (iframe on cogitator:// stays black). */
  private openYoutubeDirectPiP(videoId: string, startTime: number, title: string): void {
    const { x, y, width, height } = this.defaultPiPBounds();
    const embedUrl = buildYoutubeEmbedUrl(videoId, startTime);

    this.pipWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 280,
      minHeight: 158,
      maxWidth: 900,
      maxHeight: 600,
      alwaysOnTop: true,
      frame: true,
      transparent: false,
      backgroundColor: '#000000',
      hasShadow: true,
      skipTaskbar: false,
      resizable: true,
      show: false,
      title: `◉ ${title}`,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        // PiP must keep full frame-rate even when occluded (players)
        backgroundThrottling: false,
      },
    });

    this.attachPiPWindowLifecycle(false);

    this.pipWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        this.closePiP();
      }
    });

    this.pipWindow.loadURL(embedUrl);

    this.pipWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => this.pauseTabVideo(), 900);
    });

    this.notifyStateChange();
  }

  /** Direct / fallback video — styled cogitator://pip shell. */
  private openShellPiP(): void {
    const { x, y, width, height } = this.defaultPiPBounds();

    this.pipWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 280,
      minHeight: 158,
      maxWidth: 900,
      maxHeight: 600,
      alwaysOnTop: true,
      frame: false,
      transparent: false,
      backgroundColor: '#000000',
      hasShadow: true,
      skipTaskbar: false,
      resizable: true,
      show: false,
      title: '◉ COGITATOR PiP',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.attachPiPWindowLifecycle(true);
    this.pipWindow.loadURL('cogitator://pip');
    this.notifyStateChange();
  }

  private defaultPiPBounds(): PiPBounds {
    const display = screen.getPrimaryDisplay();
    const workArea = display.workArea;
    return {
      width: this.bounds.width || DEFAULT_PIP_WIDTH,
      height: this.bounds.height || DEFAULT_PIP_HEIGHT,
      x: this.bounds.x || workArea.x + workArea.width - DEFAULT_PIP_WIDTH - 24,
      y: this.bounds.y || workArea.y + workArea.height - DEFAULT_PIP_HEIGHT - 24,
    };
  }

  private attachPiPWindowLifecycle(shellMode: boolean): void {
    if (!this.pipWindow) return;

    this.pipWindow.once('ready-to-show', () => {
      this.pipWindow?.show();
      this.pipWindow?.setAlwaysOnTop(true, 'floating');
      this.pipWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    });

    const saveBounds = () => {
      if (!this.pipWindow || this.pipWindow.isDestroyed()) return;
      const b = this.pipWindow.getNormalBounds();
      this.bounds = { width: b.width, height: b.height, x: b.x, y: b.y };
    };
    this.pipWindow.on('resize', saveBounds);
    this.pipWindow.on('move', saveBounds);

    this.pipWindow.on('closed', () => {
      this.pipWindow = null;
      this.autoPiP = false;
      this.resumeTabVideo();
      this.notifyStateChange();
    });

    if (shellMode) {
      this.pipWindow.webContents.once('dom-ready', () => {
        this.sendVideoPayload();
      });
      this.pauseTabVideo();
    }
  }

  private sendVideoPayload(): void {
    if (!this.pipWindow || !this.activeVideo) return;

    const video = this.withLiveTabUrl(this.activeVideo);
    const payload = this.buildPayload(video);
    this.pipWindow.webContents.send('pip:load', payload);
  }

  private withLiveTabUrl(video: VideoState): VideoState {
    const view = this.tabManager?.getTabWebContents?.(video.tabId);
    if (!view || view.isDestroyed()) return video;
    try {
      const liveUrl = view.getURL();
      if (liveUrl && !liveUrl.startsWith('cogitator://')) {
        const youtubeId = video.youtubeId || extractYoutubeId(liveUrl) || undefined;
        return { ...video, url: liveUrl, youtubeId };
      }
    } catch {
      /* ignore */
    }
    return video;
  }

  private buildPayload(video: VideoState): Record<string, any> {
    const ytId = video.youtubeId ?? extractYoutubeId(video.url);
    if (ytId) {
      return {
        type: 'youtube',
        videoId: ytId,
        startTime: Math.floor(video.currentTime),
        title: video.title,
        url: video.url,
      };
    }

    // Direct video URL
    if (
      video.src &&
      !video.src.startsWith('blob:') &&
      !video.src.startsWith('mediasource:') &&
      !video.src.startsWith('data:')
    ) {
      return {
        type: 'direct',
        src: video.src,
        currentTime: video.currentTime,
        paused: video.paused,
        title: video.title,
        url: video.url,
      };
    }

    // Fallback: return page URL + instructions
    return {
      type: 'fallback',
      url: video.url,
      currentTime: video.currentTime,
      paused: video.paused,
      title: video.title,
    };
  }

  closePiP(): void {
    if (this.pipWindow) {
      this.pipWindow.close();
      this.pipWindow = null;
    }
    this.autoPiP = false;
    this.resumeTabVideo();
    this.notifyStateChange();
  }

  // ── Tab Video Control ───────────────────────────────────

  private pauseTabVideo(): void {
    if (!this.activeVideo) return;
    const view = this.tabManager?.getTabWebContents?.(this.activeVideo.tabId);
    if (!view) return;
    view.executeJavaScript(PAUSE_VIDEO_SCRIPT).catch(() => {});
  }

  private resumeTabVideo(): void {
    if (!this.activeVideo) return;
    const view = this.tabManager?.getTabWebContents?.(this.activeVideo.tabId);
    if (!view) return;
    view.executeJavaScript(PLAY_VIDEO_SCRIPT).catch(() => {});
  }

  private seekTabVideo(time: number): void {
    if (!this.activeVideo) return;
    const view = this.tabManager?.getTabWebContents?.(this.activeVideo.tabId);
    if (!view) return;
    view.executeJavaScript(SEEK_VIDEO_SCRIPT(time)).catch(() => {});
  }

  // ── PiP Window Controls ─────────────────────────────────

  private handlePiPControl(action: string, data?: any): void {
    switch (action) {
      case 'seek':
        this.seekTabVideo(data?.time ?? 0);
        break;
      case 'close':
        this.closePiP();
        break;
      case 'return-to-tab':
        this.returnToTab();
        break;
      case 'play':
        this.resumeTabVideo();
        break;
      case 'pause':
        this.pauseTabVideo();
        break;
    }
  }

  private returnToTab(): void {
    if (!this.activeVideo) return;
    const tabId = this.activeVideo.tabId;
    this.closePiP();
    this.tabManager?.switchTab?.(tabId);
    if (this.mainWindow?.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow?.focus();
  }

  // ── Auto-PiP on Minimize/Restore ────────────────────────

  onMainWindowMinimize(): void {
    if (this.activeVideo && !this.activeVideo.paused && !this.pipWindow) {
      this.autoPiP = true;
      this.openPiP();
    }
  }

  onMainWindowRestore(): void {
    if (this.autoPiP && this.pipWindow) {
      this.closePiP();
      this.autoPiP = false;
    }
  }

  // ── State & Notifications ───────────────────────────────

  private getState(): Record<string, any> {
    return {
      active: !!this.pipWindow,
      hasVideo: !!this.activeVideo,
      autoPiP: this.autoPiP,
      video: this.activeVideo
        ? {
            title: this.activeVideo.title,
            paused: this.activeVideo.paused,
            currentTime: this.activeVideo.currentTime,
            duration: this.activeVideo.duration,
            url: this.activeVideo.url,
          }
        : null,
    };
  }

  private notifyStateChange(): void {
    if (!isWindowLive(this.mainWindow)) return;
    try {
      if (this.mainWindow.webContents.isDestroyed()) return;
      this.mainWindow.webContents.send('pip:state-change', this.getState());
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[PiPManager] notifyStateChange:', err);
      }
    }
  }
}
