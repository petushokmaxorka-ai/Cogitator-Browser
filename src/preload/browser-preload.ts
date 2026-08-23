// ═══════════════════════════════════════════════════════════
// Browser Preload — Injected into every tab's WebContentsView
// ═══════════════════════════════════════════════════════════
// NO site skinning anymore: DarkReader + the Mechanicus style overrides
// made heavy sites (Twitch, HLTV...) crawl. External sites now render
// pure Chromium. The Dark Mechanicus look lives only on our own pages
// (start page, noosphere, forge panel, dashboard) where it is built-in.
// What stays here: the userAgentData shim Google sign-in needs.

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

shimUserAgentData();
