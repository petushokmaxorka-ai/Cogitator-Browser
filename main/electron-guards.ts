import type { WebContentsView, BrowserWindow } from 'electron';

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

export function isViewLive(view: WebContentsView): boolean {
  try {
    return !view.webContents.isDestroyed();
  } catch {
    return false;
  }
}

// NOTE: names kept for the launcher's stale-build check (greps the compiled
// output for this symbol). BrowserView attach/detach APIs are deprecated
// since Electron 30 — these wrap the WebContentsView contentView API.
export function safeRemoveBrowserView(win: BrowserWindow, view: WebContentsView): void {
  if (!isWindowLive(win) || !isViewLive(view)) return;
  try {
    if (win.contentView.children.includes(view)) {
      win.contentView.removeChildView(view);
    }
  } catch (err) {
    if (!isDestroyedError(err)) {
      console.warn('[Electron] safeRemoveBrowserView:', err);
    }
  }
}

export function safeAddBrowserView(win: BrowserWindow, view: WebContentsView): void {
  if (!isWindowLive(win) || !isViewLive(view)) return;
  try {
    if (!win.contentView.children.includes(view)) {
      win.contentView.addChildView(view);
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
