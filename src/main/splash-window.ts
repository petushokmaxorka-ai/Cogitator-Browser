// ═══ Startup Splash — shown before main BrowserWindow ═══

import { BrowserWindow } from 'electron';
import { join } from 'path';

/** Boot splash — half panel (600×200), Noosphere cog style */
const SPLASH_WIDTH = 600;
const SPLASH_HEIGHT = 200;

/** Minimum splash visibility before main window appears (user: 5–8 s) */
export const SPLASH_MIN_DISPLAY_MS = 6500;

/** Never block boot longer than this — force main window if renderer stalls */
export const SPLASH_ABSOLUTE_MAX_MS = 12000;

let splashWindow: BrowserWindow | null = null;
let splashShownAt = 0;

function splashHtmlPath(): string {
  return join(__dirname, '../../resources/splash.html');
}

export function createSplashWindow(): BrowserWindow {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  splashWindow = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    frame: false,
    resizable: false,
    movable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#000000',
    ...(process.platform === 'linux'
      ? { icon: join(__dirname, '../../resources/icons/icon.png') }
      : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  splashWindow.loadFile(splashHtmlPath());
  splashWindow.once('ready-to-show', () => {
    splashShownAt = Date.now();
    splashWindow?.show();
  });

  return splashWindow;
}

export function setSplashProgress(percent: number): void {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  splashWindow.webContents
    .executeJavaScript(`window.__setProgress && window.__setProgress(${value})`)
    .catch(() => {});
}

export async function closeSplashWindow(minTotalMs = SPLASH_MIN_DISPLAY_MS): Promise<void> {
  if (!splashWindow || splashWindow.isDestroyed()) return;

  setSplashProgress(100);
  const elapsed = splashShownAt > 0 ? Date.now() - splashShownAt : 0;
  const remaining = Math.max(0, minTotalMs - elapsed);
  await new Promise((resolve) => setTimeout(resolve, remaining));

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
  splashShownAt = 0;
}

export function isSplashOpen(): boolean {
  return splashWindow !== null && !splashWindow.isDestroyed();
}

/** Close splash and show main window — once, after ready-to-show or max wait */
export function scheduleMainWindowReveal(
  mainWindow: BrowserWindow,
  minDisplayMs = SPLASH_MIN_DISPLAY_MS,
  maxWaitMs = SPLASH_ABSOLUTE_MAX_MS,
): void {
  let revealed = false;

  const reveal = async (): Promise<void> => {
    if (revealed || mainWindow.isDestroyed()) return;
    revealed = true;
    await closeSplashWindow(minDisplayMs);
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  };

  mainWindow.once('ready-to-show', () => {
    void reveal();
  });

  // Renderer failed or hung — do not trap user on splash forever
  mainWindow.webContents.once('did-fail-load', () => {
    console.warn('[Splash] Main renderer did-fail-load — revealing window');
    void reveal();
  });

  setTimeout(() => {
    if (!revealed && isSplashOpen()) {
      console.warn(`[Splash] ${maxWaitMs}ms timeout — forcing main window`);
      void reveal();
    }
  }, maxWaitMs);
}
