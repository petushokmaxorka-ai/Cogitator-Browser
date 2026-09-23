// ═══════════════════════════════════════════════════════════
// Tab Manager — Main Process
// Manages WebContentsView instances, their bounds, and lifecycle.
// ═══════════════════════════════════════════════════════════

import { WebContentsView, BrowserWindow, Menu, clipboard, shell } from 'electron';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Tab } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';
import { SIDEBAR_WIDTH, CHROME_HEIGHT } from '../shared/constants';
import { getAdBlockerEngine } from './adblocker-engine';
import { DESKTOP_CHROME_UA } from './mechanicus-skin';
import {
  CANVAS_SPOOF,
  WEBGL_SPOOF,
  AUDIO_SPOOF,
  DEVICE_SPOOF,
  TIMEZONE_SPOOF,
  PLUGIN_SPOOF,
} from './fingerprint-spoofer';
import { isGoogleLoginUrl, openGoogleLogin } from './google-login';
import {
  buildLoadErrorUrl,
  sanitizeNavigationUrl,
  shouldSkipLoadErrorHandler,
} from './navigation-url';
import {
  isDestroyedError,
  isViewLive,
  isWindowLive,
  safeAddBrowserView,
  safeRemoveBrowserView,
} from './electron-guards';

function applyDesktopUserAgent(view: WebContentsView): void {
  try {
    view.webContents.setUserAgent(DESKTOP_CHROME_UA);
  } catch (err) {
    console.warn('[TabManager] setUserAgent failed:', err);
  }
}


// ── Constants ─────────────────────────────────────────────
// CHROME_HEIGHT imported from shared/constants (120px)

// ── TabEntry Interface ────────────────────────────────────
interface TabEntry {
  tab: Tab;
  view: WebContentsView;
  listeners: { event: string; handler: (...args: any[]) => void }[];
  transientRetries: number;
}

/** Chromium net errors that often clear after proxy/VPN settles. */
const TRANSIENT_NET_ERRORS = new Set([-21, -7, -2]);
const MAX_TRANSIENT_RETRIES = 2;

// ═══════════════════════════════════════════════════════════
export class TabManager {
  private tabs = new Map<string, TabEntry>();
  private activeTabId: string | null = null;
  private window: BrowserWindow | null = null;
  private sidebarOpen = false;
  private sidebarWidth = SIDEBAR_WIDTH;
  private htmlFullscreenTabId: string | null = null;

  // ── Window Binding ──────────────────────────────────────

  setWindow(window: BrowserWindow): void {
    this.window = window;

    window.on('resize', () => {
      this.updateBounds();
    });
    window.on('maximize', () => this.updateBounds());
    window.on('unmaximize', () => this.updateBounds());
    window.on('leave-full-screen', () => {
      if (this.htmlFullscreenTabId) {
        this.htmlFullscreenTabId = null;
        this.notifyContentFullscreen(false);
        this.updateBounds();
      }
    });
    window.on('closed', () => {
      this.htmlFullscreenTabId = null;
      this.window = null;
    });
  }

  /** Detach when BrowserWindow is closing — stops late webContents events from crashing. */
  clearWindow(): void {
    this.htmlFullscreenTabId = null;
    this.window = null;
  }

  private notifyContentFullscreen(active: boolean): void {
    const win = this.window;
    if (!isWindowLive(win)) return;
    try {
      if (!win.webContents.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.CONTENT_FULLSCREEN_ON_CHANGE, active);
      }
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] notifyContentFullscreen:', err);
      }
    }
  }

  private enterHtmlFullscreen(tabId: string): void {
    const win = this.window;
    if (!isWindowLive(win)) return;
    this.htmlFullscreenTabId = tabId;
    if (this.sidebarOpen) {
      this.sidebarOpen = false;
    }
    this.notifyContentFullscreen(true);
    try {
      if (!win.isFullScreen()) {
        win.setFullScreen(true);
      }
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] setFullScreen(true):', err);
      }
    }
    this.updateBounds();
  }

  private exitHtmlFullscreen(): void {
    const win = this.window;
    this.htmlFullscreenTabId = null;
    this.notifyContentFullscreen(false);
    if (!isWindowLive(win)) return;
    try {
      if (win.isFullScreen()) {
        win.setFullScreen(false);
      }
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] setFullScreen(false):', err);
      }
    }
    this.updateBounds();
  }

  // ── Bounds Management ───────────────────────────────────

  updateBounds(): void {
    try {
      if (!isWindowLive(this.window) || !this.activeTabId) return;
      const entry = this.tabs.get(this.activeTabId);
      if (entry && isViewLive(entry.view)) {
        this.attachView(entry);
      }
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] updateBounds:', err);
      }
    }
  }

  setSidebarOpen(open: boolean): void {
    this.sidebarOpen = open;
    this.updateBounds();
  }

  setSidebarWidth(width: number): void {
    if (!Number.isFinite(width) || width < 0) return;
    this.sidebarWidth = Math.round(width);
    this.updateBounds();
  }

  private attachView(entry: TabEntry): void {
    const win = this.window;
    if (!isWindowLive(win) || !isViewLive(entry.view)) return;

    try {
      const bounds = win.getContentBounds();
      const sidebarOffset = this.sidebarOpen ? this.sidebarWidth : 0;

      if (entry.tab.url.includes('cogitator://start')) {
        safeRemoveBrowserView(win, entry.view);
        try {
          entry.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        } catch {
          /* view torn down */
        }
        return;
      }

      safeAddBrowserView(win, entry.view);
      try {
        const isContentFullscreen =
          this.htmlFullscreenTabId === entry.tab.id && this.activeTabId === entry.tab.id;
        entry.view.setBounds(
          isContentFullscreen
            ? { x: 0, y: 0, width: bounds.width, height: bounds.height }
            : {
                x: 0,
                y: CHROME_HEIGHT,
                width: bounds.width - sidebarOffset,
                height: bounds.height - CHROME_HEIGHT,
              },
        );
      } catch (err) {
        if (!isDestroyedError(err)) {
          console.warn('[TabManager] setBounds failed:', err);
        }
      }
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] attachView failed:', err);
      }
    }
  }

  // ── Tab Lifecycle ───────────────────────────────────────

  createTab(url = 'cogitator://start'): Tab {
    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        // Dark Reader + Mechanicus accents on external sites (see browser-preload.ts)
        preload: join(__dirname, '../preload/browser.js'),
      },
    });

    applyDesktopUserAgent(view);
    view.setBackgroundColor('#000000');

    const tab: Tab = {
      id: randomUUID(),
      url,
      title: 'New Tab',
      favicon: '',
      isLoading: true,
      loadProgress: 0,
      canGoBack: false,
      canGoForward: false,
    };

    const entry: TabEntry = { tab, view, listeners: [], transientRetries: 0 };
    this.tabs.set(tab.id, entry);

    // Helper to track listeners for cleanup
    const on = (event: string, handler: (...args: any[]) => void) => {
      const wrapped = (...args: any[]) => {
        if (!this.tabs.has(tab.id) || !isViewLive(view)) return;
        handler(...args);
      };
      view.webContents.on(event, wrapped);
      entry.listeners.push({ event, handler: wrapped });
    };

    // Open target="_blank" / popup links in the same tab
    view.webContents.setWindowOpenHandler(({ url }) => {
      if (url && /^https?:/i.test(url)) {
        this.navigateTo(tab.id, url);
      }
      return { action: 'deny' };
    });

    // NOTE: no style injection here. The old FALLBACK_CSS (gold links,
    // scrollbars, monospace) re-skinned every external site from the main
    // process and survived the preload cleanups — removed per Principal's
    // call: external sites render pure Chromium.

    on('did-finish-load', () => {
      console.log(`[Tab] Loaded: ${view.webContents.getURL()}`);
    });

    on('context-menu', (event, params) => {
      event.preventDefault();
      if (!this.window) return;

      const menuTemplate: Electron.MenuItemConstructorOptions[] = [];

      menuTemplate.push(
        {
          label: 'Назад',
          enabled: view.webContents.canGoBack(),
          click: () => view.webContents.goBack(),
        },
        {
          label: 'Вперёд',
          enabled: view.webContents.canGoForward(),
          click: () => view.webContents.goForward(),
        },
        { label: 'Обновить', click: () => view.webContents.reload() },
        { type: 'separator' },
      );

      if (params.editFlags.canCut) {
        menuTemplate.push({ label: 'Вырезать', role: 'cut' });
      }
      if (params.editFlags.canCopy) {
        menuTemplate.push({ label: 'Копировать', role: 'copy' });
      }
      if (params.editFlags.canPaste) {
        menuTemplate.push({ label: 'Вставить', role: 'paste' });
      }
      if (params.editFlags.canSelectAll) {
        menuTemplate.push({ label: 'Выделить всё', role: 'selectAll' });
      }
      if (
        params.editFlags.canCut ||
        params.editFlags.canCopy ||
        params.editFlags.canPaste ||
        params.editFlags.canSelectAll
      ) {
        menuTemplate.push({ type: 'separator' });
      }

      if (params.linkURL) {
        menuTemplate.push(
          {
            label: 'Открыть ссылку в новой вкладке',
            click: () => this.createTab(params.linkURL!),
          },
          {
            label: 'Скопировать ссылку',
            click: () => clipboard.writeText(params.linkURL!),
          },
          { type: 'separator' },
        );
      }

      if (params.hasImageContents) {
        menuTemplate.push(
          {
            label: 'Сохранить картинку',
            click: () => view.webContents.downloadURL(params.srcURL),
          },
          {
            label: 'Копировать картинку',
            enabled: params.srcURL.startsWith('data:') || params.srcURL.length > 0,
            click: () => view.webContents.copyImageAt(params.x, params.y),
          },
          { type: 'separator' },
        );
      }

      if (params.selectionText) {
        menuTemplate.push(
          {
            label: `Искать с Anathemetron: "${params.selectionText.substring(0, 30)}"`,
            click: () => {
              this.window?.webContents.send('anathemetron:search', params.selectionText);
            },
          },
          { type: 'separator' },
        );
      }

      menuTemplate.push({
        label: 'Открыть DevTools',
        click: () => view.webContents.openDevTools({ mode: 'detach' }),
      });

      const bounds = entry.view.getBounds();
      Menu.buildFromTemplate(menuTemplate).popup({
        window: this.window,
        x: Math.round(bounds.x + params.x),
        y: Math.round(bounds.y + params.y),
      });
    });

    // Always switch to the new tab so it becomes visible
    this.activeTabId = tab.id;

    const loadUrl = sanitizeNavigationUrl(url);
    tab.url = loadUrl;

    // Setup initial view bounds (url must be set before attach — start page detaches BrowserView)
    if (this.window) {
      this.attachView(entry);
    }

    this.switchTab(tab.id);

    view.webContents.loadURL(loadUrl).catch((err) => {
      console.error('[TabManager] loadURL failed:', loadUrl, err);
    });

    // ═══ Inject AdBlocker cosmetic filters ═════════════════
    const adBlocker = getAdBlockerEngine();
    adBlocker.injectCosmeticFilters(view.webContents);

    // ═══ Anti-Fingerprinting: Inject spoof scripts ═════════
    // These run in the renderer before any page scripts execute,
    // randomizing Canvas, WebGL, AudioContext, and device APIs.
    on('dom-ready', () => {
      view.webContents.executeJavaScript(DEVICE_SPOOF, true).catch(() => {});
      view.webContents.executeJavaScript(CANVAS_SPOOF, true).catch(() => {});
      view.webContents.executeJavaScript(WEBGL_SPOOF, true).catch(() => {});
      view.webContents.executeJavaScript(AUDIO_SPOOF, true).catch(() => {});
      view.webContents.executeJavaScript(TIMEZONE_SPOOF, true).catch(() => {});
      view.webContents.executeJavaScript(PLUGIN_SPOOF, true).catch(() => {});
    });

    // ── WebContents Event Listeners ───────────────────────

    on('did-start-loading', () => {
      tab.isLoading = true;
      tab.loadProgress = 0;
      this.notifyUpdate();
    });

    on('did-change-loading-progress', (_, progress) => {
      tab.loadProgress = Math.round(progress * 100);
      this.notifyUpdate();
    });

    on('did-stop-loading', () => {
      tab.isLoading = false;
      tab.loadProgress = 100;
      entry.transientRetries = 0;
      try {
        tab.canGoBack = view.webContents.canGoBack();
        tab.canGoForward = view.webContents.canGoForward();
      } catch {
        return;
      }
      this.updateBounds();
      this.notifyUpdate();
    });

    on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error(`[Tab] Failed: ${validatedURL} — ${errorDescription} (${errorCode})`);
      if (!isMainFrame) return;
      tab.isLoading = false;
      tab.loadProgress = 0;
      // ERR_ABORTED (-3) — navigation superseded; ignore
      if (errorCode === -3) {
        this.notifyUpdate();
        return;
      }
      if (
        TRANSIENT_NET_ERRORS.has(errorCode) &&
        entry.transientRetries < MAX_TRANSIENT_RETRIES
      ) {
        entry.transientRetries += 1;
        const retryUrl = validatedURL;
        const delayMs = 700 * entry.transientRetries;
        console.warn(
          `[Tab] Transient error ${errorCode} on ${retryUrl} — retry ${entry.transientRetries}/${MAX_TRANSIENT_RETRIES} in ${delayMs}ms`,
        );
        tab.isLoading = true;
        setTimeout(() => {
          view.webContents.loadURL(retryUrl).catch(() => {});
        }, delayMs);
        this.notifyUpdate();
        return;
      }
      entry.transientRetries = 0;
      if (shouldSkipLoadErrorHandler(validatedURL)) {
        this.notifyUpdate();
        return;
      }
      tab.title = 'Load failed';
      const errPage = buildLoadErrorUrl(validatedURL, errorCode, errorDescription);
      view.webContents.loadURL(errPage).catch(() => {});
      this.attachView(entry);
      this.notifyUpdate();
    });

    on('did-navigate', (_, navUrl) => {
      // Google sign-in never runs in a tab: the clean-room window takes it
      // (vanilla partition + cookie sync back into the main session).
      if (isGoogleLoginUrl(navUrl)) {
        openGoogleLogin(navUrl);
        view.webContents
          .loadURL(
            'data:text/html;charset=utf-8,' +
              encodeURIComponent(
                '<html><body style="background:#000;color:#C8A84B;font-family:monospace;' +
                  'display:flex;align-items:center;justify-content:center;height:100vh;' +
                  'margin:0"><div style="text-align:center;font-size:14px;letter-spacing:0.1em">' +
                  '◆ GOOGLE SIGN-IN OPENED IN A CLEAN WINDOW<br><br>' +
                  '<span style="color:#8B7D6B;font-size:11px">finish there, then reload this page' +
                  ' — cookies sync automatically</span></div></body></html>',
              ),
          )
          .catch(() => {});
      }
      if (!navUrl.startsWith('cogitator://error')) {
        tab.url = navUrl;
      }
      try {
        tab.canGoBack = view.webContents.canGoBack();
        tab.canGoForward = view.webContents.canGoForward();
      } catch {
        return;
      }
      this.updateBounds();
      this.notifyUpdate();
    });

    on('did-navigate-in-page', (_, navUrl) => {
      if (!navUrl.startsWith('cogitator://error')) {
        tab.url = navUrl;
      }
      this.notifyUpdate();
    });

    on('page-title-updated', (_, title) => {
      tab.title = title;
      this.notifyUpdate();
    });

    on('page-favicon-updated', (_, favicons) => {
      if (favicons.length > 0) {
        tab.favicon = favicons[0];
      }
      this.notifyUpdate();
    });

    on('enter-html-full-screen', () => {
      if (this.activeTabId === tab.id) {
        this.enterHtmlFullscreen(tab.id);
      }
    });

    on('leave-html-full-screen', () => {
      if (this.htmlFullscreenTabId === tab.id) {
        this.exitHtmlFullscreen();
      }
    });

    // ── Find in Page Results ──────────────────────────────

    on('found-in-page', (_, result) => {
      this.window?.webContents.send(IPC_CHANNELS.FIND_IN_PAGE_RESULT, {
        tabId: tab.id,
        requestId: result.requestId,
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    });

    // Notify renderer of new tab state
    this.notifyUpdate();

    return tab;
  }

  closeTab(id: string): void {
    const entry = this.tabs.get(id);
    if (!entry) return;

    if (this.htmlFullscreenTabId === id) {
      this.exitHtmlFullscreen();
    }

    for (const { event, handler } of entry.listeners) {
      try {
        if (!entry.view.webContents.isDestroyed()) {
          entry.view.webContents.removeListener(event, handler);
        }
      } catch {
        /* view already gone */
      }
    }
    entry.listeners = [];

    if (isWindowLive(this.window)) {
      safeRemoveBrowserView(this.window, entry.view);
    }

    const adBlocker = getAdBlockerEngine();
    try {
      if (!entry.view.webContents.isDestroyed()) {
        adBlocker.removeCosmeticFilters(entry.view.webContents);
        entry.view.webContents.close();
      }
    } catch {
      /* ignore */
    }

    this.tabs.delete(id);

    if (this.activeTabId === id) {
      const remaining = Array.from(this.tabs.keys());
      this.activeTabId = remaining.length > 0 ? remaining[0] : null;
      if (this.activeTabId) {
        this.switchTab(this.activeTabId);
      }
    }

    this.notifyUpdate();
  }

  switchTab(id: string): void {
    if (this.htmlFullscreenTabId && this.htmlFullscreenTabId !== id) {
      this.exitHtmlFullscreen();
    }

    if (isWindowLive(this.window)) {
      for (const [, { view }] of this.tabs) {
        safeRemoveBrowserView(this.window, view);
      }
    }

    const entry = this.tabs.get(id);
    if (entry && isWindowLive(this.window)) {
      this.attachView(entry);
      this.activeTabId = id;
    }

    this.notifyUpdate();
  }

  // ── Navigation ──────────────────────────────────────────

  navigateTo(id: string, url: string): void {
    const entry = this.tabs.get(id);
    if (!entry) return;

    const normalized = sanitizeNavigationUrl(url);
    applyDesktopUserAgent(entry.view);
    entry.tab.url = normalized;
    entry.tab.isLoading = true;
    entry.tab.loadProgress = 0;

    if (this.activeTabId === id) {
      this.attachView(entry);
    }

    entry.view.webContents.loadURL(normalized).catch((err) => {
      console.error('[TabManager] navigate loadURL failed:', normalized, err);
    });
    this.notifyUpdate();
  }

  goBack(id: string): void {
    const entry = this.tabs.get(id);
    if (entry && entry.view.webContents.canGoBack()) {
      entry.view.webContents.goBack();
    }
  }

  goForward(id: string): void {
    const entry = this.tabs.get(id);
    if (entry && entry.view.webContents.canGoForward()) {
      entry.view.webContents.goForward();
    }
  }

  reload(id: string): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.reload();
    }
  }

  // ── Find in Page ────────────────────────────────────────

  findInPage(id: string, text: string): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.findInPage(text, {
        findNext: true,
      });
    }
  }

  stopFindInPage(id: string): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.stopFindInPage('clearSelection');
    }
  }

  // ── Zoom ────────────────────────────────────────────────

  setZoom(id: string, level: number): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.setZoomLevel(level);
    }
  }

  // ── DevTools ────────────────────────────────────────────

  openDevTools(id: string): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.openDevTools({ mode: 'detach' });
    }
  }

  closeDevTools(id: string): void {
    const entry = this.tabs.get(id);
    if (entry) {
      entry.view.webContents.closeDevTools();
    }
  }

  // ── Queries ─────────────────────────────────────────────

  getTabs(): Tab[] {
    return Array.from(this.tabs.values()).map((e) => e.tab);
  }

  getActiveTab(): Tab | null {
    if (!this.activeTabId) return null;
    return this.tabs.get(this.activeTabId)?.tab ?? null;
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  getTabWebContents(tabId: string): Electron.WebContents | null {
    const entry = this.tabs.get(tabId);
    return entry?.view.webContents ?? null;
  }

  // ── Page HTML ───────────────────────────────────────────

  async getPageHTML(tabId: string): Promise<string> {
    const entry = this.tabs.get(tabId);
    if (!entry) return '';
    return entry.view.webContents.executeJavaScript(`
      document.documentElement.outerHTML
    `);
  }

  // ── IPC Helpers ─────────────────────────────────────────

  private notifyUpdate(): void {
    if (!isWindowLive(this.window)) return;
    try {
      const tabs = this.getTabs();
      const activeId = this.activeTabId ?? '';
      this.window.webContents.send(IPC_CHANNELS.TABS_ON_UPDATE, tabs, activeId);
    } catch (err) {
      if (!isDestroyedError(err)) {
        console.warn('[TabManager] notifyUpdate:', err);
      }
    }
  }
}
