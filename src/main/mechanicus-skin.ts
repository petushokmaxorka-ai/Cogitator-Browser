// ═══ Mechanicus site skin — main-process injection (bypasses CSP) ═══

import type { WebContents } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { NOOSPHERE_PAGE_BACKGROUND } from '../shared/mechanicus-background';

export { NOOSPHERE_PAGE_BACKGROUND };

/** Desktop Chrome UA — avoids YouTube mobile / Electron “small window” layout */
export const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const DARK_READER_CONFIG = {
  brightness: 100,
  contrast: 100,
  sepia: 18,
  grayscale: 0,
};

const SKIN_SKIP_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com',
  'proton.me',
  'www.proton.me',
  'mail.proton.me',
  'pass.proton.me',
  'account.proton.me',
  'protonmail.com',
  'www.protonmail.com',
];

export const MECHANICUS_SKIN_CSS = `
  :root { color-scheme: dark; }

  html {
    background-color: #000000 !important;
    background-image: radial-gradient(ellipse at 50% 20%, rgba(30,30,30,0.75) 0%, transparent 70%) !important;
  }

  html::before {
    content: '' !important;
    position: fixed !important;
    inset: 0 !important;
    pointer-events: none !important;
    z-index: 2147483645 !important;
    opacity: 0.35 !important;
    background-image:
      linear-gradient(rgba(42,42,42,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(42,42,42,0.12) 1px, transparent 1px) !important;
    background-size: 50px 50px !important;
  }

  html, body {
    font-family: 'Courier New', Courier, monospace !important;
  }

  ::selection {
    background: rgba(200, 168, 75, 0.3) !important;
    color: #E8E8E8 !important;
  }

  a, a:visited { color: #c8a86e !important; }
  a:hover {
    color: #e8c87e !important;
    text-shadow: 0 0 6px rgba(200, 168, 110, 0.35) !important;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #e8c87e !important;
    letter-spacing: 0.04em;
  }

  hr { border-color: #8B0000 !important; opacity: 0.45; }

  ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
  ::-webkit-scrollbar-track { background: #000000 !important; }
  ::-webkit-scrollbar-thumb { background: #3A3A3A !important; border-radius: 4px !important; }
  ::-webkit-scrollbar-thumb:hover { background: #c8a86e !important; }

  pre, code, kbd, samp {
    font-family: 'Courier New', Courier, monospace !important;
    background-color: rgba(30, 30, 30, 0.85) !important;
    color: #E8E8E8 !important;
    border: 1px solid #2A2A2A !important;
  }

  input, textarea, select {
    background-color: #1E1E1E !important;
    color: #E8E8E8 !important;
    border: 1px solid #3A3A3A !important;
  }

  input:focus, textarea:focus, select:focus {
    border-color: #00BFBF !important;
    box-shadow: 0 0 0 1px rgba(0, 191, 191, 0.25) !important;
  }

  :focus-visible {
    outline: 1px solid #00BFBF !important;
    outline-offset: 2px;
  }

  table { border-color: #3A3A3A !important; }
  th {
    background: #1E1E1E !important;
    color: #c8a86e !important;
    border-color: #3A3028 !important;
  }
  td { border-color: #2A2A2A !important; }

  blockquote {
    border-left: 3px solid #8B0000 !important;
    color: #D4C5A0 !important;
    background: rgba(30, 30, 30, 0.5) !important;
  }
`;

let darkReaderBundle: string | null = null;
let cssKeyByWebContents = new WeakMap<WebContents, string>();

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function shouldSkipMechanicusSkin(url: string): boolean {
  if (!url || url.startsWith('cogitator:')) return true;
  const host = hostnameFromUrl(url);
  if (!host) return true;
  return SKIN_SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function loadDarkReaderBundle(): string | null {
  if (darkReaderBundle) return darkReaderBundle;
  const candidates = [
    join(__dirname, '../../resources/vendor/darkreader.js'),
    join(__dirname, '../../../node_modules/darkreader/darkreader.js'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      darkReaderBundle = readFileSync(path, 'utf-8');
      return darkReaderBundle;
    }
  }
  console.warn('[MechanicusSkin] darkreader.js not found — accent CSS only');
  return null;
}

async function injectDarkReader(webContents: WebContents): Promise<void> {
  const bundle = loadDarkReaderBundle();
  if (!bundle) return;

  const configJson = JSON.stringify(DARK_READER_CONFIG);
  const bundleB64 = Buffer.from(bundle, 'utf-8').toString('base64');

  await webContents.executeJavaScript(`
    (function() {
      if (window.__cogMechanicusDark) return;
      try {
        if (typeof DarkReader === 'undefined') {
          const raw = atob(${JSON.stringify(bundleB64)});
          const script = document.createElement('script');
          script.textContent = raw;
          (document.head || document.documentElement).appendChild(script);
        }
        if (typeof DarkReader !== 'undefined') {
          DarkReader.enable(${configJson});
          window.__cogMechanicusDark = true;
        }
      } catch (err) {
        console.warn('[Cogitator] DarkReader failed', err);
      }
    })();
  `);
}

export async function applyMechanicusSkin(
  webContents: WebContents,
  url: string,
): Promise<void> {
  if (shouldSkipMechanicusSkin(url)) return;

  try {
    const prevKey = cssKeyByWebContents.get(webContents);
    if (prevKey) {
      await webContents.removeInsertedCSS(prevKey).catch(() => {});
    }
    const key = await webContents.insertCSS(MECHANICUS_SKIN_CSS);
    cssKeyByWebContents.set(webContents, key);
  } catch (err) {
    console.warn('[MechanicusSkin] insertCSS failed:', err);
  }

  try {
    await injectDarkReader(webContents);
  } catch (err) {
    console.warn('[MechanicusSkin] DarkReader inject failed:', err);
  }
}
