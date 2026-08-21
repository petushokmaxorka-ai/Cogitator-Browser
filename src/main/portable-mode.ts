// ═══ PORTABLE MODE ═══
// USB-flash drive launch mode — all user data (vault, bookmarks,
// history, settings) stored in the application directory instead
// of system directories. Invoke with --portable flag or place a
// .portable file next to the executable.
//
// "The Machine God's litanies travel with you, untethered."

import { app } from 'electron';
import { join, dirname } from 'path';
import { existsSync, writeFileSync } from 'fs';

const PORTABLE_MARKER = 'PORTABLE';
const portableFlagFile = join(process.resourcesPath, '..', '.portable');

// ── Check if running in portable mode ─────────────────────

export function isPortableMode(): boolean {
  // Check for --portable flag or .portable file
  return app.commandLine.hasSwitch('portable') || existsSync(portableFlagFile);
}

// ── Configure portable paths ──────────────────────────────

export function configurePortableMode(): void {
  if (!isPortableMode()) return;

  // Set all user data paths to app directory
  const appDir = dirname(process.resourcesPath);
  const dataDir = join(appDir, 'data');

  app.setPath('userData', dataDir);
  app.setPath('cache', join(dataDir, 'cache'));
  app.setPath('logs', join(dataDir, 'logs'));
  app.setPath('temp', join(dataDir, 'temp'));
  app.setPath('downloads', join(dataDir, 'downloads'));

  console.log('[PORTABLE] Running in portable mode');
  console.log('[PORTABLE] Data directory:', dataDir);
}

// ── Create portable marker file ───────────────────────────

export function createPortableMarker(): void {
  try {
    writeFileSync(portableFlagFile, PORTABLE_MARKER, 'utf-8');
    console.log('[PORTABLE] Marker file created:', portableFlagFile);
  } catch (err) {
    console.error('[PORTABLE] Failed to create marker:', err);
  }
}
