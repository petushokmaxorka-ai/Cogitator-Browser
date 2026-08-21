import type { BrowserView, BrowserWindow } from 'electron';

export function isDestroyedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('destroyed') || msg.includes('Object has been destroyed');
}

export function isWindowLive(win: BrowserWindow | null): win is BrowserWindow {
  if (win === null) return false;
  try {
    return !win.isDestroyed();
  } catch {
    return false;
  }
}

export function isViewLive(view: BrowserView): boolean {
  try {
    return !view.webContents.isDestroyed();
  } catch {
    return false;
  }
}

export function safeRemoveBrowserView(win: BrowserWindow, view: BrowserView): void {
  if (!isWindowLive(win) || !isViewLive(view)) return;
  try {
    if (win.getBrowserViews().includes(view)) {
      win.removeBrowserView(view);
    }
  } catch (err) {
    if (!isDestroyedError(err)) {
      console.warn('[Electron] safeRemoveBrowserView:', err);
    }
  }
}

export function safeAddBrowserView(win: BrowserWindow, view: BrowserView): void {
  if (!isWindowLive(win) || !isViewLive(view)) return;
  try {
    const attached = win.getBrowserViews();
    if (!attached.includes(view)) {
      win.addBrowserView(view);
    }
    if (typeof win.setTopBrowserView === 'function') {
      win.setTopBrowserView(view);
    }
  } catch (err) {
    if (!isDestroyedError(err)) {
      console.warn('[Electron] safeAddBrowserView:', err);
    }
  }
}

/** Prevent Electron crash dialog on tab/window teardown races. */
export function installDestroyedErrorGuard(): void {
  process.on('uncaughtException', (err) => {
    if (isDestroyedError(err)) {
      console.warn('[Main] Suppressed teardown race:', err.message);
      return;
    }
    console.error('[Main] Uncaught exception:', err);
  });
}
