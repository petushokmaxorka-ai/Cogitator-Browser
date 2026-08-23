// ═══════════════════════════════════════════════════════════
// Browser Preload — Injected into every tab's WebContentsView
// Handles: Dark Reader theme injection + custom Dark Mechanicus CSS
// ═══════════════════════════════════════════════════════════

import { enable } from 'darkreader';

// ── Dark Reader Config ──────────────────────────────────

const DARK_READER_CONFIG = {
  brightness: 100,
  contrast: 90,
  sepia: 10,
};

// ── Blacklist: sites where DarkReader breaks layout ─────

const YOUTUBE_DARK_CSS = `
  html, body { background-color: #000000 !important; }
  ytm-app, #content, ytd-app, #page-manager, #masthead-container {
    background-color: #000000 !important;
  }
`;

const STYLE_BLACKLIST = [
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'ytimg.com',
  'ggpht.com',
  'gstatic.com',
  'proton.me',
  'protonmail.com',
  'localhost',
  '127.0.0.1',
  // DarkReader is a CPU hog on heavy/realtime DOMs — these crawl without it
  'twitch.tv',
  'hltv.org',
  'netflix.com',
  'discord.com',
];

// ── Custom Dark Mechanicus CSS (injected on ALL sites) ──

const CUSTOM_CSS = `
  /* Override font to monospace everywhere */
  html, body, input, textarea, select, button {
    font-family: 'Courier New', Courier, monospace !important;
  }
  /* Gold links */
  a, a:visited {
    color: #C8A84B !important;
  }
  a:hover {
    color: #FF0000 !important;
    text-shadow: 0 0 6px rgba(255, 0, 0, 0.4) !important;
  }
  /* Dark scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #000000; }
  ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #C8A84B; }
  /* Selection color */
  ::selection {
    background: rgba(200, 168, 75, 0.3) !important;
    color: #E8E8E8 !important;
  }
`;

function injectCustomCSS(): void {
  try {
    const style = document.createElement('style');
    style.id = 'cogitator-dark-mechanicus-style';
    style.textContent = CUSTOM_CSS;
    if (document.head) {
      document.head.appendChild(style);
    } else {
      // head not ready yet — wait
      const observer = new MutationObserver(() => {
        if (document.head) {
          document.head.appendChild(style);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  } catch (err) {
    console.warn('[Cogitator Preload] Custom CSS inject failed:', err);
  }
}

function injectYouTubeDark(): void {
  try {
    const style = document.createElement('style');
    style.id = 'cogitator-youtube-dark';
    style.textContent = YOUTUBE_DARK_CSS;
    (document.head || document.documentElement).appendChild(style);
  } catch (err) {
    console.warn('[Cogitator Preload] YouTube dark CSS failed:', err);
  }
}

function initDarkMode(): void {
  const hostname = location.hostname.toLowerCase();
  const blocked = STYLE_BLACKLIST.some((h) => hostname.includes(h));
  const youtube = hostname.includes('youtube.com') || hostname.includes('youtu.be');

  console.log('[Cogitator Preload] Host:', hostname, 'style blocked:', blocked);

  if (youtube) {
    injectYouTubeDark();
    console.log('[Cogitator Preload] YouTube — minimal dark shell only');
    return;
  }

  // Always inject the pure-black base CSS to kill the preload flash on all tabs,
  // including dark local dashboards that do not need DarkReader reprocessing.
  injectCustomCSS();

  if (blocked || location.protocol === 'cogitator:') {
    console.log('[Cogitator Preload] Skipping DarkReader for', hostname || location.protocol);
    return;
  }

  // Delay DarkReader to let the page settle (prevents layout breakage)
  setTimeout(() => {
    try {
      enable(DARK_READER_CONFIG);
      console.log('[Cogitator Preload] DarkReader enabled for', hostname);
    } catch (err) {
      console.warn('[Cogitator Preload] DarkReader init failed:', err);
    }
  }, 1500);
}

interface UADataBrand {
  brand: string;
  version: string;
}

interface UADataLike {
  brands: UADataBrand[];
  mobile: boolean;
  platform: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
}

function shimUserAgentData(): void {
  // Google sign-in reads navigator.userAgentData; Electron reports
  // "Chromium"-only brands while our UA string claims Chrome — claim
  // the Chrome brand consistently or Google blocks the login.
  try {
    const nav = navigator as Navigator & { userAgentData?: UADataLike };
    if (!nav.userAgentData) return;
    const chromeMajor = (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || '137';
    const brands = [
      { brand: 'Chromium', version: chromeMajor },
      { brand: 'Google Chrome', version: chromeMajor },
      { brand: 'Not-A.Brand', version: '99' },
    ];
    const uaData = {
      brands,
      mobile: false,
      platform: 'Linux',
      getHighEntropyValues: (): Promise<Record<string, unknown>> =>
        Promise.resolve({
          brands,
          fullVersionList: brands,
          mobile: false,
          platform: 'Linux',
          platformVersion: '6.0',
          architecture: 'x86',
          bitness: '64',
          wow64: false,
        }),
    };
    Object.defineProperty(nav, 'userAgentData', {
      value: uaData,
      configurable: true,
      enumerable: true,
    });
  } catch (err) {
    console.warn('[Cogitator Preload] userAgentData shim failed:', err);
  }
}

// Run immediately
initDarkMode();
shimUserAgentData();
