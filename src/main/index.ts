// ═══════════════════════════════════════════════════════════
// Main Process — COGITATOR BROWSER v2
// ═══════════════════════════════════════════════════════════

import { app, shell, BrowserWindow, ipcMain, session, protocol, dialog } from 'electron';
import { join, resolve, isAbsolute, normalize, sep } from 'path';
import { readdir, stat, unlink, rename, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { IPC_CHANNELS } from '../shared/types';
import { configurePortableMode, isPortableMode } from './portable-mode';
import { TabManager } from './tab-manager';
import { OllamaBridge } from './ollama-bridge';
import { MensBridge } from './mens-bridge';
import { VPNBridge } from './vpn-bridge';
import { getAdBlockerEngine } from './adblocker-engine';
import { registerVaultHandlers } from './vault-handlers';
import { registerSigilHandlers } from './sigil-handlers';
import {
  configurePrivacySession,
  getPrivacyConfig,
  setPrivacyConfig,
} from './privacy-engine';
import { sessionManager } from './session-manager';
import { TorrentManager } from './torrent-manager';
import { initUpdater } from './updater';
import { loadLlmConfig, saveLlmConfig } from './llm-config-store';
import { EmailManager } from './email-manager';
import { PiPManager } from './pip-manager';
import { SysmonManager, runSpeedTest } from './sysmon-manager';
import { GitManager } from './git-manager';
import { DockerManager } from './docker-manager';
import { readMindPulse } from './mind-pulse';
import { SQLiteManager } from './sqlite-manager';
import { SSHManager } from './ssh-manager';
import { scanPortRange, scanLan, sendWakeOnLan } from './network-tools';
import {
  installNetworkMonitor,
  getConnections,
  getInterfaceStats,
  getActivity,
  clearActivity,
} from './network-monitor';
import { analyzeVideo, downloadVideo, extractAudio } from './media-tools';
import { listArchive, extractArchive, extractArchiveEntries, readArchiveEntry, createArchive } from './archive-manager';
import { convertCurrency, fetchDefinition, fetchWeather, getIpInfo, getLocalTimeInZone, lookupWhois } from './omnibox-tools';
import { runCommand } from './exec-util';
import { loadExternalLists } from './adblock-updater';
import { applySessionProxy, startProxyPolling, shouldForceDirectConnection } from './proxy-manager';
import { getEarlyProxyConfig, markEarlyProxyApplied, resolveEarlyProxyConfig } from './early-proxy';
import { installChromeContextMenu } from './chrome-context-menu';
import { installDestroyedErrorGuard } from './electron-guards';
import { isPersistableUrl, sanitizeNavigationUrl } from './navigation-url';
import {
  createSplashWindow,
  setSplashProgress,
  scheduleMainWindowReveal,
} from './splash-window';
import {
  WINDOW_DEFAULT_WIDTH,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_MIN_HEIGHT,
} from '../shared/constants';

// ═══════════════════════════════════════════════════════════
// Portable Mode: Check before app is ready
// ═══════════════════════════════════════════════════════════
installDestroyedErrorGuard();
if (process.env.COGITATOR_DISABLE_GPU === '1') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}
if (app.commandLine.hasSwitch('portable')) {
  configurePortableMode();
}

// Chromium reads proxy from CLI at startup — session.setProxy alone fails YouTube in Electron.
const earlyProxy = resolveEarlyProxyConfig();
if (earlyProxy) {
  app.commandLine.appendSwitch('proxy-server', earlyProxy.proxyServer);
  app.commandLine.appendSwitch('proxy-bypass-list', earlyProxy.bypassList);
  markEarlyProxyApplied(earlyProxy);
  console.log(`[Proxy] CLI early (${earlyProxy.label}): ${earlyProxy.proxyServer}`);
} else if (shouldForceDirectConnection()) {
  app.commandLine.appendSwitch('no-proxy-server');
}

// ═══════════════════════════════════════════════════════════
// Custom Protocol Registration (MUST be before app.whenReady)
// ═══════════════════════════════════════════════════════════

protocol.registerSchemesAsPrivileged([
  { scheme: 'cogitator', privileges: { standard: true, secure: true, corsEnabled: true, supportFetchAPI: true } },
]);

// ═══════════════════════════════════════════════════════════
// Privacy-Critical: Chromium Command-Line Switches
// MUST be set BEFORE app.whenReady() fires.
// ═══════════════════════════════════════════════════════════

// ── WebRTC: prevent real IP leak via UDP ──
// This is THE most critical switch — blocks STUN/ICE from
// discovering the user's real IP address when behind a proxy/VPN.
app.commandLine.appendSwitch(
  'force-webrtc-ip-handling-policy',
  'disable_non_proxied_udp',
);

// ── Disable data-collection / telemetry features ──
app.commandLine.appendSwitch(
  'disable-features',
  [
    'InterestFeedContentSuggestions',
    'MediaRouter',              // Chromecast discovery leaks LAN devices
    'OptimizationHints',        // Google URL hints
    'NetworkPrediction',        // DNS prefetch / preconnect
    'Translate',                // Google translation service
    'OptimizationGuideModelDownloading',
    'DownloadBubble',           // Google download scanning
    'DialMediaRouteProvider',   // DIAL protocol (smart TV discovery)
    'HttpsUpgrades',            // We handle this ourselves
    'MemorySaver',              // Can leak tab state info
    'BatterySaver',             // Exposes battery API indirectly
    'IdleDetection',            // Idle detection API
    'NotificationTriggers',     // Background notification sync
    'WebOTP',                   // SMS OTP API
    'WebSerial',                // Serial port access
    'WebHID',                   // HID device access
    'WebUSB',                   // USB device access
    'WebBluetooth',             // Bluetooth LE scanning
    'FileHandling',             // OS file association API
    'Sensors',                  // Ambient light / motion sensors
    'SpeechRecognition',        // Cloud speech API
    'TabHoverCardImages',       // Previews leak page content
    'TabSearch',                // Closed-tab recovery
    'ReadAnything',             // Google Reader mode
    'SignedExchangePrefetchCache',
    'BackForwardCache',         // Can leak cross-origin state
    'AutofillServerCommunication', // Google autofill server
    'ReportingAPI',               // CSP/report-to leak
    'CertificateTransparencyComponentUpdater',
    'SafeBrowsingEnhanced',
    'PrivacySandboxAdsAPIs',
    'Fledge',
    'TrustTokens',
    'SharedStorageAPI',
    'FirstPartySets',
    'InterestCohortAPI',
    'AdInterestGroupAPI',
  ].join(','),
);

// ── Enable hardening features ──
app.commandLine.appendSwitch(
  'enable-features',
  [
    'StrictOriginIsolation',           // Site-per-process enforcement
    'PlzDedicatedWorker',              // Dedicated workers in separate processes
    'BlockInsecurePrivateNetworkRequests', // Protect IoT devices on LAN
    'SecurePaymentConfirmation',
    'MemoryTagging',
    'SplitCacheByNetworkIsolationKey',
    'SameSiteDefaultChecksMethodRigorously',
  ].join(','),
);

// ── Disable plugin discovery / bundled Flash ──
app.commandLine.appendSwitch('disable-bundled-ppapi-flash');
app.commandLine.appendSwitch('disable-plugins-discovery');
app.commandLine.appendSwitch('disable-component-extensions-with-background-pages');

// ── Additional privacy switches ──
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-breakpad');           // Crash reporter
app.commandLine.appendSwitch('disable-crash-reporter')

// ── Managers ──────────────────────────────────────────────
function renderLoadErrorHtml(target: string, code: string, desc: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeUrl = esc(target);
  const safeDesc = esc(desc);
  const safeCode = esc(code);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Load failed</title>
<style>
  body { margin:0; min-height:100vh; background:#000000; color:#e8e8e8;
    font-family:'Courier New',monospace; display:flex; align-items:center; justify-content:center; }
  .panel { max-width:640px; padding:32px; border:1px solid #3a3028; background:#121212; }
  h1 { color:#c8a84b; font-size:18px; margin:0 0 12px; }
  p { color:#a0a0a0; line-height:1.5; }
  code { color:#ff4444; }
  a { color:#c8a84b; }
</style></head><body><div class="panel">
  <h1>◆ CONNECTION FAILED</h1>
  <p>Could not load <a href="${safeUrl}">${safeUrl}</a></p>
  <p><code>${safeDesc} (${safeCode})</code></p>
  <p>Check network / VPN (FlClash TUN or system proxy). Try reload (Ctrl+R).</p>
</div></body></html>`;
}

let mainWindow: BrowserWindow | null = null;
const tabManager = new TabManager();
const ollamaBridge = new OllamaBridge();
// Restore the persisted AI endpoint (host/model/provider) — without this
// the Settings panel config was memory-only and lost on every relaunch.
const savedLlmConfig = loadLlmConfig();
if (savedLlmConfig) {
  ollamaBridge.setConfig(savedLlmConfig);
  console.log(`[LLM] restored endpoint: ${savedLlmConfig.provider ?? 'llama-server'} @ ${savedLlmConfig.host}`);
}
const mensBridge = new MensBridge();
const vpnBridge = new VPNBridge();
const adBlocker = getAdBlockerEngine();
const torrentManager = new TorrentManager();
const emailManager = new EmailManager();
const pipManager = new PiPManager();
const sysmonManager = new SysmonManager();
const gitManager = new GitManager();
const dockerManager = new DockerManager();
const sqliteManager = new SQLiteManager();
const sshManager = new SSHManager();

// Zoom level map: tabId -> zoomLevel
const zoomLevels = new Map<string, number>();

// ── Window Creation ───────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#000000',
    trafficLightPosition: { x: 15, y: 12 },
    ...(process.platform === 'linux'
      ? { icon: join(__dirname, '../../resources/icons/icon.png') }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Bind tab manager to window (CRITICAL for BrowserView bounds)
  if (mainWindow) {
    tabManager.setWindow(mainWindow);
    torrentManager.setWindow(mainWindow);
    emailManager.setWindow(mainWindow);
    pipManager.setWindow(mainWindow);
    pipManager.setTabManager(tabManager);
    sysmonManager.setWindow(mainWindow);
    scheduleMainWindowReveal(mainWindow);

    try {
      pipManager.init();
      sysmonManager.start();
      emailManager.init().catch((err) => {
        console.error('[Main] EmailManager init failed:', err);
      });
      tabManager.createTab('cogitator://start');
    } catch (err) {
      console.error('[Main] createWindow init failed:', err);
    }
  }

  installChromeContextMenu(mainWindow, mainWindow.webContents);

  mainWindow.on('closed', () => {
    sysmonManager.stop();
    pipManager.destroy();
    tabManager.clearWindow();
    mainWindow = null;
  });

  // Window control handlers
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_ON_MAXIMIZE);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_ON_UNMAXIMIZE);
  });

  // PiP: Auto pop-out video when window is minimized
  mainWindow.on('minimize', () => {
    pipManager.onMainWindowMinimize();
  });

  mainWindow.on('restore', () => {
    pipManager.onMainWindowRestore();
  });

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ── App Lifecycle ─────────────────────────────────────────
app.whenReady().then(async () => {
  createSplashWindow();
  setSplashProgress(8);

  // ═══ Portable Mode: Double-check after ready ══════════
  configurePortableMode();

  // ═══ Initialize FS security roots ═════════════════════
  initAllowedRoots();

  electronApp.setAppUserModelId('dev.heretic-os.cogitator');

  // ═══ Privacy Engine: Configure session ════════════════
  configurePrivacySession();

  // ═══ Network Monitor: hook webRequest feed (idempotent) ═══
  installNetworkMonitor();

  // ═══ Proxy: PAC file (01:46 baseline) or auto-detect local SOCKS ═══
  setSplashProgress(15);
  try {
    await applySessionProxy(session.defaultSession);
    startProxyPolling(session.defaultSession);
  } catch (err) {
    console.error('[Proxy] Auto-proxy error:', err);
  }

  // ═══ CORS fix for local SearXNG (Noosphere cogitator:// → localhost:8888) ═══
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isSearx = details.url.startsWith('http://localhost:8888/') ||
                    details.url.startsWith('http://127.0.0.1:8888/') ||
                    details.url.startsWith('http://localhost:8080/') ||
                    details.url.startsWith('http://127.0.0.1:8080/');
    if (isSearx && details.responseHeaders) {
      details.responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      details.responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
      details.responseHeaders['Access-Control-Allow-Headers'] = ['Content-Type, Accept'];
    }
    callback({ responseHeaders: details.responseHeaders });
  });

  // ═══ Session Manager: Initialize with auto-clear ══════
  await sessionManager.init();
  setSplashProgress(35);

  // DevTools shortcut
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // ═══ Handle cogitator:// protocol ══════════════════════
  // MUST be registered BEFORE creating tabs that use it
  protocol.handle('cogitator', async (request) => {
    const url = request.url;
    if (url === 'cogitator://start' || url.startsWith('cogitator://start')) {
      const data = await readFile(join(__dirname, '../../resources/start.html'));
      return new Response(data, {
        headers: { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*' },
      });
    } else if (url === 'cogitator://noosphere' || url.startsWith('cogitator://noosphere')) {
      const data = await readFile(join(__dirname, '../../resources/noosphere.html'));
      return new Response(data, {
        headers: { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*' },
      });
    } else if (url.startsWith('cogitator://error')) {
      const parsed = new URL(url);
      const html = renderLoadErrorHtml(
        parsed.searchParams.get('target') || '',
        parsed.searchParams.get('code') || '',
        parsed.searchParams.get('desc') || '',
      );
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } else if (url === 'cogitator://pip' || url.startsWith('cogitator://pip')) {
      const data = await readFile(join(__dirname, '../../resources/pip.html'));
      return new Response(data, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('Not Found', { status: 404 });
  });

  setSplashProgress(55);
  createWindow();
  setSplashProgress(92);

  // ═══ Auto-update: GitHub Releases feed, startup + 6h ═══
  initUpdater();

  // Session restore — proxy CLI is set before any navigation
  setTimeout(() => {
    void restoreSession().catch((err) => {
      console.error('[Session] Restore failed:', err);
    });
  }, 300);

  // ═══ AdBlocker Engine: Enable on default session ═══════
  adBlocker.enable(session.defaultSession);

  // Load external filter lists after a delay to avoid network storm on startup
  setTimeout(async () => {
    try {
      const external = await loadExternalLists();
      if (external.network.length > 0 || external.cosmetic.length > 0) {
        adBlocker.addExternalRules(external.network, external.cosmetic);
      }
    } catch (err) {
      console.error('[Main] Failed to load external adblock lists:', err);
    }
  }, 30000);

  // Register Cryptkeeper Vault handlers
  registerVaultHandlers();

  // ═══ Sigil Engine: Register digital signature handlers ═
  registerSigilHandlers();

  // ═══ Handle downloads ═════════════════════════════════
  session.defaultSession.on('will-download', (_event, item, _webContents) => {
    const fileName = item.getFilename();
    const totalBytes = item.getTotalBytes();
    const startTime = Date.now();

    // Send download started event to renderer
    mainWindow?.webContents.send('download-started', {
      id: `${startTime}-${fileName}`,
      filename: fileName,
      url: item.getURL(),
      totalBytes,
      status: 'downloading',
      startTime,
    });

    item.on('updated', (_event, state) => {
      mainWindow?.webContents.send('download-progress', {
        id: `${startTime}-${fileName}`,
        receivedBytes: item.getReceivedBytes(),
        totalBytes,
        state,
      });
    });

    item.once('done', (_event, state) => {
      const savePath = item.getSavePath();
      mainWindow?.webContents.send('download-completed', {
        id: `${startTime}-${fileName}`,
        filename: fileName,
        savePath,
        status: state === 'completed' ? 'completed' : 'failed',
        endTime: Date.now(),
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ═══════════════════════════════════════════════════════════
// Session Restore
// ═══════════════════════════════════════════════════════════

const SESSION_FILE = () => join(app.getPath('userData'), 'session.json');

async function saveSession(): Promise<void> {
  try {
    const tabs = tabManager.getTabs();
    const urls = tabs.map((t) => t.url).filter(isPersistableUrl);
    await writeFile(SESSION_FILE(), JSON.stringify({ urls, timestamp: Date.now() }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Session] Save failed:', err);
  }
}

async function restoreSession(): Promise<void> {
  try {
    const data = await readFile(SESSION_FILE(), 'utf-8');
    const sess = JSON.parse(data) as { urls: string[] };
    if (!sess.urls?.length) return;

    const urls = sess.urls.map((u) => sanitizeNavigationUrl(u));
    const persistable = urls.filter(isPersistableUrl);
    if (persistable.length === 0) {
      await writeFile(SESSION_FILE(), JSON.stringify({ urls: [], timestamp: Date.now() }, null, 2), 'utf-8');
      console.warn('[Session] Discarded poisoned session URLs');
      return;
    }

    if (JSON.stringify(persistable) !== JSON.stringify(sess.urls)) {
      await writeFile(
        SESSION_FILE(),
        JSON.stringify({ urls: persistable, timestamp: Date.now() }, null, 2),
        'utf-8',
      );
      console.warn('[Session] Sanitized poisoned tab URLs on restore');
    }

    const activeId = tabManager.getActiveTabId();
    if (activeId) {
      tabManager.navigateTo(activeId, persistable[0]);
    }
    const MAX_RESTORE_TABS = 5;
    for (let i = 1; i < Math.min(persistable.length, MAX_RESTORE_TABS); i++) {
      tabManager.createTab(persistable[i]);
    }
    console.log('[Session] Restored', persistable.length, 'tab(s)');
  } catch {
    // No session file — fresh start
  }
}

app.on('window-all-closed', () => {
  saveSession().finally(() => {
    if (process.platform !== 'darwin') app.quit();
  });
});

// ── IPC Handlers: Window ──────────────────────────────────
ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize();
});

ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
  mainWindow?.close();
});

ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle(IPC_CHANNELS.WINDOW_IS_PORTABLE, () => {
  return isPortableMode();
});

ipcMain.handle(IPC_CHANNELS.WINDOW_GET_BOUNDS, () => {
  if (!mainWindow) return { width: 0, height: 0 };
  return mainWindow.getContentBounds();
});

ipcMain.handle(IPC_CHANNELS.WINDOW_RESIZE, () => {
  tabManager.updateBounds();
});

// ── IPC Handlers: Tabs ────────────────────────────────────
ipcMain.handle(IPC_CHANNELS.TABS_CREATE, (_, url?: string) => {
  return tabManager.createTab(url);
});

ipcMain.handle(IPC_CHANNELS.TABS_CLOSE, (_, id: string) => {
  tabManager.closeTab(id);
});

ipcMain.handle(IPC_CHANNELS.TABS_SWITCH, (_, id: string) => {
  tabManager.switchTab(id);
});

ipcMain.handle(IPC_CHANNELS.TABS_NAVIGATE, (_, id: string, url: string) => {
  tabManager.navigateTo(id, url);
});

ipcMain.handle(IPC_CHANNELS.TABS_GO_BACK, (_, id: string) => {
  tabManager.goBack(id);
});

ipcMain.handle(IPC_CHANNELS.TABS_GO_FORWARD, (_, id: string) => {
  tabManager.goForward(id);
});

ipcMain.handle(IPC_CHANNELS.TABS_RELOAD, (_, id: string) => {
  tabManager.reload(id);
});

ipcMain.handle(IPC_CHANNELS.TABS_GET_ALL, () => {
  return tabManager.getTabs();
});

ipcMain.handle(IPC_CHANNELS.TABS_GET_ACTIVE, () => {
  return tabManager.getActiveTab();
});

ipcMain.handle(IPC_CHANNELS.TABS_GET_SELECTED_TEXT, async () => {
  const tabId = tabManager.getActiveTabId();
  if (!tabId) return '';
  const wc = tabManager.getTabWebContents(tabId);
  if (!wc) return '';
  try {
    return await wc.executeJavaScript(`window.getSelection()?.toString() || ''`);
  } catch {
    return '';
  }
});

ipcMain.handle(IPC_CHANNELS.TABS_GET_PAGE_TEXT, async () => {
  const tabId = tabManager.getActiveTabId();
  if (!tabId) return '';
  const wc = tabManager.getTabWebContents(tabId);
  if (!wc) return '';
  try {
    return await wc.executeJavaScript(`document.body?.innerText?.substring(0, 50000) || ''`);
  } catch {
    return '';
  }
});

ipcMain.handle(IPC_CHANNELS.TABS_GET_PAGE_INFO, async () => {
  const tabId = tabManager.getActiveTabId();
  if (!tabId) return { title: '', url: '' };
  const wc = tabManager.getTabWebContents(tabId);
  if (!wc) return { title: '', url: '' };
  try {
    return await wc.executeJavaScript(`({ title: document.title || '', url: location?.href || '' })`);
  } catch {
    return { title: '', url: '' };
  }
});

// ── IPC Handlers: Sidebar ─────────────────────────────────
ipcMain.handle(IPC_CHANNELS.SIDEBAR_TOGGLE, (_, open: boolean) => {
  tabManager.setSidebarOpen(open);
});

ipcMain.handle(IPC_CHANNELS.SIDEBAR_RESIZE, (_, width: number) => {
  tabManager.setSidebarWidth(width);
});

// ── IPC Handlers: DevTools ────────────────────────────────
ipcMain.handle(IPC_CHANNELS.DEVTOOLS_OPEN, () => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    tabManager.openDevTools(activeId);
  }
});

ipcMain.handle(IPC_CHANNELS.DEVTOOLS_CLOSE, () => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    tabManager.closeDevTools(activeId);
  }
});

// ── IPC Handlers: Find in Page ────────────────────────────
ipcMain.handle(IPC_CHANNELS.FIND_IN_PAGE, (_, text: string) => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    tabManager.findInPage(activeId, text);
  }
});

ipcMain.handle(IPC_CHANNELS.STOP_FIND_IN_PAGE, () => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    tabManager.stopFindInPage(activeId);
  }
});

// ── IPC Handlers: Zoom ────────────────────────────────────
ipcMain.handle(IPC_CHANNELS.ZOOM_SET, (_, level: number) => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    zoomLevels.set(activeId, level);
    tabManager.setZoom(activeId, level);
  }
});

// ── IPC Handlers: Ollama ──────────────────────────────────
ipcMain.handle(IPC_CHANNELS.OLLAMA_LIST_MODELS, () => {
  return ollamaBridge.listModels();
});

ipcMain.handle(IPC_CHANNELS.OLLAMA_CHAT, async (_, messages, model: string) => {
  const enriched = await mensBridge.enrichMessages(messages);
  return ollamaBridge.chat(enriched, model, mainWindow!);
});

ipcMain.handle(IPC_CHANNELS.OLLAMA_CHECK_STATUS, () => {
  return ollamaBridge.checkStatus();
});

ipcMain.handle(IPC_CHANNELS.OLLAMA_GET_CONFIG, () => {
  return ollamaBridge.getConfig();
});

ipcMain.handle(IPC_CHANNELS.OLLAMA_SET_CONFIG, (_, config) => {
  ollamaBridge.setConfig(config);
  saveLlmConfig(ollamaBridge.getConfig());
});

ipcMain.handle(IPC_CHANNELS.OLLAMA_ABORT, () => {
  ollamaBridge.abort();
});

ipcMain.handle(IPC_CHANNELS.MENS_CHECK_STATUS, () => mensBridge.checkStatus());

ipcMain.handle(IPC_CHANNELS.MENS_GET_CONTEXT, (_, query: string) =>
  mensBridge.buildContextBlock(query ?? ''),
);

ipcMain.handle(IPC_CHANNELS.MENS_SEMANTIC_SEARCH, (_, query: string, limit?: number) =>
  mensBridge.semanticSearch(query ?? '', limit ?? 8),
);

// ── IPC Handlers: Embedding (standalone nomic-embed on :11501) ─────
const EMBED_URL = process.env.EMBEDDING_URL || 'http://127.0.0.1:11501';

ipcMain.handle(IPC_CHANNELS.EMBED_CREATE, async (_, input: string | string[]) => {
  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new Error('input must be non-empty string or array');
  }
  try {
    const resp = await fetch(`${EMBED_URL}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, model: 'nomic-embed-text' }),
    });
    if (!resp.ok) {
      throw new Error(`embed server returned ${resp.status}: ${await resp.text()}`);
    }
    const data = (await resp.json()) as {
      data: Array<{ embedding: number[]; index: number; object: string }>;
    };
    return {
      object: 'list',
      model: 'nomic-embed-text',
      data: data.data,
    };
  } catch (err) {
    console.error('[Embed] request failed:', err);
    throw new Error(`Embed request failed: ${(err as Error).message}`);
  }
});

ipcMain.handle(IPC_CHANNELS.EMBED_HEALTH, async () => {
  try {
    const resp = await fetch(`${EMBED_URL}/health`, { method: 'GET' });
    return {
      embedding_url: EMBED_URL,
      model: 'nomic-embed-text',
      healthy: resp.ok,
      status: resp.status,
    };
  } catch (err) {
    return {
      embedding_url: EMBED_URL,
      model: 'nomic-embed-text',
      healthy: false,
      error: (err as Error).message,
    };
  }
});

// ── IPC Handlers: VPN ─────────────────────────────────────
ipcMain.handle(IPC_CHANNELS.VPN_STATUS, () => {
  return vpnBridge.getStatus();
});

ipcMain.handle(IPC_CHANNELS.VPN_START, () => {
  return vpnBridge.start();
});

ipcMain.handle(IPC_CHANNELS.VPN_STOP, () => {
  return vpnBridge.stop();
});

// ── IPC Handlers: Page ────────────────────────────────────
ipcMain.handle(IPC_CHANNELS.PAGE_GET_INFO, async () => {
  const tabId = tabManager.getActiveTabId();
  if (!tabId) return { title: '', url: '', content: '' };
  const wc = tabManager.getTabWebContents(tabId);
  if (!wc) return { title: '', url: '', content: '' };
  try {
    return await wc.executeJavaScript(`({
      title: document.title || '',
      url: location?.href || '',
      content: document.body?.innerText?.substring(0, 50000) || ''
    })`);
  } catch {
    return { title: '', url: '', content: '' };
  }
});

// ── IPC Handlers: Reader Mode ─────────────────────────────
ipcMain.handle(IPC_CHANNELS.READER_GET_HTML, () => {
  const activeId = tabManager.getActiveTabId();
  if (activeId) {
    return tabManager.getPageHTML(activeId);
  }
  return '';
});

ipcMain.handle(IPC_CHANNELS.READER_DETECT, async () => {
  const activeId = tabManager.getActiveTabId();
  if (!activeId) return { readable: false };
  const view = tabManager.getTabWebContents(activeId);
  if (!view || view.isDestroyed()) return { readable: false };
  try {
    return await view.executeJavaScript(`(() => {
      const p = document.querySelectorAll('p').length;
      const article = document.querySelector('article');
      const textLen = (document.body?.innerText || '').length;
      return { readable: !!(article || p >= 5) && textLen > 400 };
    })()`);
  } catch {
    return { readable: false };
  }
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: AdBlocker Engine
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.ADBLOCK_GET_STATS, () => {
  return adBlocker.getStats();
});

ipcMain.handle(IPC_CHANNELS.ADBLOCK_TOGGLE, () => {
  return adBlocker.toggle();
});

ipcMain.handle(IPC_CHANNELS.ADBLOCK_GET_ENABLED, () => {
  return adBlocker.isEnabled();
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: Privacy Engine
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.PRIVACY_GET_CONFIG, () => {
  return getPrivacyConfig();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_SET_CONFIG, (_, config) => {
  return setPrivacyConfig(config);
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_ALL, async () => {
  await sessionManager.clearAll();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_COOKIES, async () => {
  await sessionManager.clearCookies();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_CACHE, async () => {
  await sessionManager.clearCache();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_HISTORY, async () => {
  await sessionManager.clearHistory();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_STORAGE, async () => {
  await sessionManager.clearStorage();
});

ipcMain.handle(IPC_CHANNELS.PRIVACY_CLEAR_SERVICE_WORKERS, async () => {
  await sessionManager.clearServiceWorkers();
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: Session Manager
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.SESSION_GET_CONFIG, () => {
  return sessionManager.getAutoClearConfig();
});

ipcMain.handle(IPC_CHANNELS.SESSION_SET_CONFIG, async (_, config) => {
  await sessionManager.setAutoClearConfig(config);
});

ipcMain.handle(IPC_CHANNELS.SESSION_CLEAR_ALL, async () => {
  await sessionManager.clearAll();
});

// ═══════════════════════════════════════════════════════════
// Security: Path Validation for File System Access
// ═══════════════════════════════════════════════════════════

let ALLOWED_ROOTS: string[] = [];

function initAllowedRoots(): void {
  ALLOWED_ROOTS = [
    homedir(),
    app.getPath('downloads'),
    app.getPath('documents'),
    app.getPath('desktop'),
    app.getPath('pictures'),
    app.getPath('temp'),
    app.getPath('userData'),
  ].map((r) => resolve(r));
}

function resolveSafePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path');
  }
  const resolved = resolve(normalize(inputPath));
  if (!isAbsolute(resolved)) {
    throw new Error('Path must be absolute');
  }
  const allowed = ALLOWED_ROOTS.some(
    (root) => resolved === root || resolved.startsWith(root + sep)
  );
  if (!allowed) {
    throw new Error('Path outside allowed directories: ' + resolved);
  }
  return resolved;
}

// ═══════════════════════════════════════════════════════════
// IPC Handlers: File System — Archive of Mars
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.FS_LIST_DIR, async (_, dirPath: string) => {
  const safePath = resolveSafePath(dirPath);
  const entries = await readdir(safePath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(safePath, entry.name);
      const stats = await stat(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modifiedAt: stats.mtime.getTime(),
      };
    })
  );
  return files.sort((a, b) =>
    a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1
  );
});

ipcMain.handle(IPC_CHANNELS.FS_GET_HOME, () => homedir());

ipcMain.handle(IPC_CHANNELS.FS_GET_DOWNLOADS, () => {
  return app.getPath('downloads');
});

ipcMain.handle(IPC_CHANNELS.FS_GET_DESKTOP, () => {
  return app.getPath('desktop');
});

ipcMain.handle(IPC_CHANNELS.FS_GET_DOCUMENTS, () => {
  return app.getPath('documents');
});

ipcMain.handle(IPC_CHANNELS.FS_GET_PICTURES, () => {
  return app.getPath('pictures');
});

ipcMain.handle(IPC_CHANNELS.FS_DELETE, async (_, filePath: string) => {
  const safePath = resolveSafePath(filePath);
  await unlink(safePath);
});

ipcMain.handle(IPC_CHANNELS.FS_RENAME, async (_, oldPath: string, newPath: string) => {
  const safeOld = resolveSafePath(oldPath);
  const safeNew = resolveSafePath(newPath);
  await rename(safeOld, safeNew);
});

ipcMain.handle(IPC_CHANNELS.FS_MKDIR, async (_, dirPath: string) => {
  const safePath = resolveSafePath(dirPath);
  await mkdir(safePath, { recursive: true });
});

ipcMain.handle(IPC_CHANNELS.FS_OPEN_PATH, async (_, filePath: string) => {
  const safePath = resolveSafePath(filePath);
  await shell.openPath(safePath);
});

ipcMain.handle(IPC_CHANNELS.FS_READ, async (_, filePath: string) => {
  const safePath = resolveSafePath(filePath);
  return readFile(safePath, 'utf-8');
});

ipcMain.handle(IPC_CHANNELS.FS_WRITE, async (_, filePath: string, content: string) => {
  const safePath = resolveSafePath(filePath);
  await writeFile(safePath, content, 'utf-8');
  return true;
});

ipcMain.handle(IPC_CHANNELS.FS_SELECT_DIR, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Project Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return '';
  return result.filePaths[0];
});

ipcMain.handle(IPC_CHANNELS.FS_REVEAL, async (_, filePath: string) => {
  const safePath = resolveSafePath(filePath);
  await shell.showItemInFolder(safePath);
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: Torrent Engine (lazy init to avoid startup DDoS)
// ═══════════════════════════════════════════════════════════

async function ensureTorrentManager(): Promise<void> {
  await torrentManager.init();
}

ipcMain.handle(IPC_CHANNELS.TORRENT_ADD, async (_, magnetURI: string, savePath?: string) => {
  await ensureTorrentManager();
  return torrentManager.add({ magnetURI, savePath });
});

ipcMain.handle(IPC_CHANNELS.TORRENT_ADD_FILE, async (_, torrentPath: string, savePath?: string) => {
  await ensureTorrentManager();
  const safe = resolveSafePath(torrentPath);
  return torrentManager.add({ torrentPath: safe, savePath });
});

ipcMain.handle(IPC_CHANNELS.TORRENT_REMOVE, async (_, infoHash: string) => {
  await ensureTorrentManager();
  torrentManager.remove(infoHash);
});

ipcMain.handle(IPC_CHANNELS.TORRENT_PAUSE, async (_, infoHash: string) => {
  await ensureTorrentManager();
  torrentManager.pause(infoHash);
});

ipcMain.handle(IPC_CHANNELS.TORRENT_RESUME, async (_, infoHash: string) => {
  await ensureTorrentManager();
  torrentManager.resume(infoHash);
});

ipcMain.handle(IPC_CHANNELS.TORRENT_GET_LIST, async () => {
  await ensureTorrentManager();
  return torrentManager.getTorrents();
});

ipcMain.handle(IPC_CHANNELS.TORRENT_GET_FILE_URL, async (_, infoHash: string, fileIndex: number) => {
  await ensureTorrentManager();
  return torrentManager.getFileStreamURL(infoHash, fileIndex);
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: Email Client
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.EMAIL_ADD_ACCOUNT, async (_, account) => {
  return emailManager.addAccount(account);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_REMOVE_ACCOUNT, async (_, id: string) => {
  await emailManager.removeAccount(id);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_GET_ACCOUNTS, () => {
  return emailManager.getAccounts();
});

ipcMain.handle(IPC_CHANNELS.EMAIL_CONNECT, async (_, accountId: string) => {
  return emailManager.connectIMAP(accountId);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_DISCONNECT, async (_, accountId: string) => {
  return emailManager.disconnectIMAP(accountId);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_LIST_FOLDERS, async (_, accountId: string) => {
  return emailManager.listFolders(accountId);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_FETCH_MESSAGES, async (_, accountId: string, folderPath: string, limit?: number) => {
  return emailManager.fetchMessages(accountId, folderPath, limit);
});

ipcMain.handle(IPC_CHANNELS.EMAIL_SEND_MESSAGE, async (_, accountId: string, to: string, subject: string, body: string) => {
  return emailManager.sendMessage(accountId, to, subject, body);
});

// ═══════════════════════════════════════════════════════════
// System Monitor & Speed Test
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.SYSMON_GET_STATS, async () => {
  return sysmonManager.getStats();
});

ipcMain.handle(IPC_CHANNELS.SPEEDTEST_RUN, async () => {
  return runSpeedTest();
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers: Git Client
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.GIT_SELECT_REPO, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Git Repository',
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, path: '' };
  const path = result.filePaths[0];
  const success = await gitManager.setRepoPath(path);
  return { success, path };
});

ipcMain.handle(IPC_CHANNELS.GIT_SET_REPO, async (_, repoPath: string) => {
  const success = await gitManager.setRepoPath(repoPath);
  return { success, path: repoPath };
});

ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async () => {
  return gitManager.getStatus();
});

ipcMain.handle(IPC_CHANNELS.GIT_ADD, async (_, files: string[]) => {
  await gitManager.add(files);
});

ipcMain.handle(IPC_CHANNELS.GIT_RESET, async (_, files: string[]) => {
  await gitManager.reset(files);
});

ipcMain.handle(IPC_CHANNELS.GIT_DISCARD, async (_, file: string) => {
  await gitManager.discard(file);
});

ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_, message: string) => {
  return gitManager.commit(message);
});

ipcMain.handle(IPC_CHANNELS.GIT_LOG, async (_, maxCount?: number) => {
  return gitManager.getLog(maxCount);
});

ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async () => {
  return gitManager.getBranches();
});

ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT, async (_, branch: string) => {
  await gitManager.checkout(branch);
});

ipcMain.handle(IPC_CHANNELS.GIT_CREATE_BRANCH, async (_, branch: string) => {
  await gitManager.createBranch(branch);
});

ipcMain.handle(IPC_CHANNELS.GIT_PULL, async () => {
  await gitManager.pull();
});

ipcMain.handle(IPC_CHANNELS.GIT_PUSH, async () => {
  await gitManager.push();
});

ipcMain.handle(IPC_CHANNELS.GIT_CLONE, async (_, url: string, targetPath: string) => {
  await gitManager.clone(url, targetPath);
});

ipcMain.handle(IPC_CHANNELS.GIT_INIT, async (_, dirPath: string) => {
  await gitManager.init(dirPath);
});

ipcMain.handle(IPC_CHANNELS.GIT_DIFF, async (_, file?: string) => {
  return gitManager.getDiff(file);
});

// ═══════════════════════════════════════════════════════════
// Docker, Network, SQLite, Media, SSH, Archive, Process
// ═══════════════════════════════════════════════════════════

ipcMain.handle(IPC_CHANNELS.DOCKER_LIST_CONTAINERS, () => dockerManager.listContainers());
ipcMain.handle(IPC_CHANNELS.DOCKER_LIST_IMAGES, () => dockerManager.listImages());
ipcMain.handle(IPC_CHANNELS.DOCKER_LIST_VOLUMES, () => dockerManager.listVolumes());
ipcMain.handle(IPC_CHANNELS.DOCKER_LIST_NETWORKS, () => dockerManager.listNetworks());
ipcMain.handle(IPC_CHANNELS.DOCKER_START, (_, id: string) => dockerManager.startContainer(id));
ipcMain.handle(IPC_CHANNELS.DOCKER_STOP, (_, id: string) => dockerManager.stopContainer(id));
ipcMain.handle(IPC_CHANNELS.DOCKER_RESTART, (_, id: string) => dockerManager.restartContainer(id));
ipcMain.handle(IPC_CHANNELS.DOCKER_LOGS, (_, id: string) => dockerManager.containerLogs(id));
ipcMain.handle(IPC_CHANNELS.DOCKER_REMOVE, (_, id: string) => dockerManager.removeContainer(id, true));

ipcMain.handle(IPC_CHANNELS.MIND_GET_PULSE, () => readMindPulse());

ipcMain.handle(IPC_CHANNELS.NETWORK_SCAN_PORTS, (_, host: string, from: number, to: number) =>
  scanPortRange(host, from, to),
);
ipcMain.handle(IPC_CHANNELS.NETWORK_SCAN_LAN, (_, cidr?: string) => scanLan(cidr));
ipcMain.handle(IPC_CHANNELS.NETWORK_WOL, (_, mac: string, broadcast?: string, port?: number) =>
  sendWakeOnLan(mac, broadcast, port),
);

// Live network monitor — system connections + interface stats + Chromium feed
ipcMain.handle(IPC_CHANNELS.NETWORK_CONNECTIONS, () => getConnections());
ipcMain.handle(IPC_CHANNELS.NETWORK_INTERFACE_STATS, () => getInterfaceStats());
ipcMain.handle(IPC_CHANNELS.NETWORK_REQUEST_ACTIVITY, (_, sinceCursor = 0) =>
  getActivity(sinceCursor),
);
ipcMain.handle(IPC_CHANNELS.NETWORK_CLEAR_ACTIVITY, () => {
  clearActivity();
  return { ok: true };
});

ipcMain.handle(IPC_CHANNELS.SQLITE_OPEN, async (_, dbPath: string) => {
  const safe = resolveSafePath(dbPath);
  await sqliteManager.open(safe);
  return { path: safe };
});
ipcMain.handle(IPC_CHANNELS.SQLITE_QUERY, (_, sql: string) => sqliteManager.query(sql));
ipcMain.handle(IPC_CHANNELS.SQLITE_LIST_TABLES, () => sqliteManager.listTables());
ipcMain.handle(IPC_CHANNELS.SQLITE_SCHEMA, (_, table: string) => sqliteManager.tableSchema(table));

ipcMain.handle(IPC_CHANNELS.MEDIA_ANALYZE, (_, url: string) => analyzeVideo(url));
ipcMain.handle(IPC_CHANNELS.MEDIA_DOWNLOAD, (_, url: string, formatId: string) =>
  downloadVideo(url, formatId),
);
ipcMain.handle(IPC_CHANNELS.MEDIA_EXTRACT_AUDIO, (_, inputPath: string, format: string, bitrate: string) => {
  const safe = resolveSafePath(inputPath);
  return extractAudio(safe, format, bitrate);
});

ipcMain.handle(IPC_CHANNELS.SSH_CONNECT, async (_, config) => {
  const ok = await sshManager.testConnection(config);
  if (ok) sshManager.setConfig(config);
  return { success: ok };
});
ipcMain.handle(IPC_CHANNELS.SSH_EXEC, (_, command: string) => sshManager.exec(command));
ipcMain.handle(IPC_CHANNELS.SSH_DISCONNECT, () => {
  sshManager.disconnect();
});

ipcMain.handle(IPC_CHANNELS.ARCHIVE_LIST, (_, archivePath: string) =>
  listArchive(resolveSafePath(archivePath)),
);
ipcMain.handle(IPC_CHANNELS.ARCHIVE_EXTRACT, (_, archivePath: string, destDir: string) =>
  extractArchive(resolveSafePath(archivePath), resolveSafePath(destDir)),
);
ipcMain.handle(IPC_CHANNELS.ARCHIVE_READ_ENTRY, (_, archivePath: string, entryName: string) =>
  readArchiveEntry(resolveSafePath(archivePath), entryName),
);
ipcMain.handle(
  IPC_CHANNELS.ARCHIVE_CREATE,
  (_, outputPath: string, sourcePaths: string[], format: 'zip' | 'tar.gz' | '7z') =>
    createArchive(resolveSafePath(outputPath), sourcePaths.map(resolveSafePath), format),
);
ipcMain.handle(
  IPC_CHANNELS.ARCHIVE_EXTRACT_ENTRIES,
  (_, archivePath: string, destDir: string, entryNames: string[]) =>
    extractArchiveEntries(resolveSafePath(archivePath), resolveSafePath(destDir), entryNames),
);

ipcMain.handle(IPC_CHANNELS.PROCESS_LIST, async () => {
  const si = await import('systeminformation');
  const data = await si.processes();
  return (data.list ?? [])
    .slice(0, 300)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: Math.round((p.cpu ?? 0) * 10) / 10,
      mem: Math.round((p.mem ?? 0) * 10) / 10,
      user: p.user ?? '',
      command: p.command ?? p.name,
    }));
});
ipcMain.handle(IPC_CHANNELS.PROCESS_KILL, async (_, pid: number) => {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid PID');
  await runCommand('kill', ['-TERM', String(pid)]);
});

ipcMain.handle(IPC_CHANNELS.OMNIBOX_IP, () => getIpInfo());
ipcMain.handle(IPC_CHANNELS.OMNIBOX_WEATHER, (_, city: string) => fetchWeather(city));
ipcMain.handle(IPC_CHANNELS.OMNIBOX_CURRENCY, (_, amount: number, from: string, to: string) =>
  convertCurrency(amount, from, to),
);
ipcMain.handle(IPC_CHANNELS.OMNIBOX_WHOIS, (_, domain: string) => lookupWhois(domain));
ipcMain.handle(IPC_CHANNELS.OMNIBOX_TIME, (_, query: string) => getLocalTimeInZone(query));
ipcMain.handle(IPC_CHANNELS.OMNIBOX_DEFINE, (_, word: string) => fetchDefinition(word));

// ═══════════════════════════════════════════════════════════
// Session Management — Named session save/restore
// ═══════════════════════════════════════════════════════════

const SESSIONS_DIR = () => join(app.getPath('userData'), 'sessions');

ipcMain.handle(IPC_CHANNELS.SESSION_SAVE, async (_, name: string) => {
  try {
    await mkdir(SESSIONS_DIR(), { recursive: true });
    const tabs = tabManager.getTabs();
    const urls = tabs.map((t) => t.url).filter(isPersistableUrl);
    const id = `${Date.now()}`;
    const session = { id, name: name || `Session ${id}`, urls, created: Date.now() };
    await writeFile(join(SESSIONS_DIR(), `${id}.json`), JSON.stringify(session, null, 2), 'utf-8');
    return { success: true, id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle(IPC_CHANNELS.SESSION_RESTORE, async (_, id: string) => {
  try {
    const data = await readFile(join(SESSIONS_DIR(), `${id}.json`), 'utf-8');
    const sess = JSON.parse(data) as { urls: string[] };
    if (!sess.urls?.length) return { success: false, error: 'empty session' };
    const activeId = tabManager.getActiveTabId();
    if (activeId) {
      tabManager.navigateTo(activeId, sess.urls[0]);
    }
    for (let i = 1; i < Math.min(sess.urls.length, 5); i++) {
      tabManager.createTab(sess.urls[i]);
    }
    return { success: true, count: sess.urls.length };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle(IPC_CHANNELS.SESSION_GET_ALL, async () => {
  try {
    const files = await readdir(SESSIONS_DIR());
    const sessions: Array<{ id: string; name: string; created: number; tabCount: number }> = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(await readFile(join(SESSIONS_DIR(), file), 'utf-8'));
      sessions.push({
        id: data.id || file.replace('.json', ''),
        name: data.name || 'Unnamed',
        created: data.created || 0,
        tabCount: data.urls?.length || 0
      });
    }
    return { sessions: sessions.sort((a, b) => b.created - a.created) };
  } catch {
    return { sessions: [] };
  }
});

ipcMain.handle(IPC_CHANNELS.SESSION_DELETE, async (_, id: string) => {
  try {
    await unlink(join(SESSIONS_DIR(), `${id}.json`));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// ═══════════════════════════════════════════════════════════
// Security: Block external navigation
// ═══════════════════════════════════════════════════════════
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Main renderer only — tab BrowserViews handle their own navigation
    if (mainWindow && contents === mainWindow.webContents) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation away from the app — only for the main renderer window,
  // not for BrowserView tabs which need to load external sites.
  contents.on('will-navigate', (e, url) => {
    if (mainWindow && contents === mainWindow.webContents) {
      if (url !== contents.getURL()) {
        e.preventDefault();
      }
    }
  });
});
