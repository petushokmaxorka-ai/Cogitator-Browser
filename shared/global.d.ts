// ═══════════════════════════════════════════════════════════
// Global Type Declarations — COGITATOR BROWSER v2
// ═══════════════════════════════════════════════════════════

import type { ElectronAPI } from '../preload';

declare global {
  // eslint-disable-next-line no-var
  var electronAPI: ElectronAPI;

  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
