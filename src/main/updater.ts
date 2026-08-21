// ═══════════════════════════════════════════════════════════
// COGITATOR BROWSER — Auto-Update (electron-updater)
// ═══════════════════════════════════════════════════════════
// GitHub Releases feed (publish config in package.json).
// Delayed startup check + 6h cycle; silent download;
// applies on quit (autoInstallOnAppQuit default).
// Dev builds skip — no feed, no APPIMAGE env.
// Renderer status: every event is broadcast on APP_UPDATE_STATUS
// (payload: { event, version?, percent?, message? }); the UI may
// subscribe via preload — optional, the updater works headless.

import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../shared/types';

const CHECK_DELAY_MS = 20_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PROGRESS_STEP_PCT = 25;

interface UpdateStatus {
  event: string;
  version?: string;
  percent?: number;
  message?: string;
}

function broadcast(status: UpdateStatus): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC_CHANNELS.APP_UPDATE_STATUS, status)
    }
  }
}

export function initUpdater(): void {
  if (!app.isPackaged) {
    console.log('[Update] dev build — auto-update disabled')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () =>
    broadcast({ event: 'checking', message: 'Checking for updates...' })
  )
  autoUpdater.on('update-available', (i) =>
    broadcast({ event: 'available', version: i.version, message: `Update v${i.version} available — downloading...` })
  )
  autoUpdater.on('update-not-available', () =>
    broadcast({ event: 'uptodate', message: 'Cogitator is up to date' })
  )
  autoUpdater.on('update-downloaded', (i) =>
    broadcast({
      event: 'downloaded',
      version: i.version,
      message: `Update v${i.version} ready — restart to apply (auto-installs on quit)`
    })
  )
  autoUpdater.on('error', (e) =>
    broadcast({ event: 'error', message: `Update error: ${e.message}` })
  )

  // Throttle: one broadcast per PROGRESS_STEP_PCT.
  let lastReported = 0
  autoUpdater.on('download-progress', (p) => {
    const pct = Math.floor(p.percent)
    if (pct - lastReported >= PROGRESS_STEP_PCT || pct >= 100) {
      lastReported = pct
      broadcast({
        event: 'progress',
        percent: pct,
        message: `Downloading update ${pct}% (${(p.transferred / 1048576).toFixed(1)}/${(p.total / 1048576).toFixed(1)} MB)`
      })
    }
  })

  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_RESTART, () => {
    autoUpdater.quitAndInstall()
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => {
      // network/feed failures already surface via 'error'
    })
  }
  setTimeout(check, CHECK_DELAY_MS).unref()
  setInterval(check, CHECK_INTERVAL_MS).unref()
}
