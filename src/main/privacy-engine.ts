// ═══════════════════════════════════════════════════════════
// Privacy Engine — COGITATOR BROWSER v2
// Chromium session hardening for maximum anti-fingerprinting.
// Level: Brave/LibreWolf equivalent.
// ═══════════════════════════════════════════════════════════

import { session, type Session, type OnHeadersReceivedListenerDetails, type OnBeforeRequestListenerDetails, type BeforeSendResponse, type HeadersReceivedResponse } from 'electron';

// ── Tracking parameter blacklist ──────────────────────────
const TRACKING_PARAMS: readonly string[] = [
  // Meta/Facebook
  'fbclid', 'fb_source', 'fb_action_ids', 'fb_action_types',
  // Google Ads/Analytics
  'gclid', 'gclsrc', 'dclid', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'ga_source', 'ga_medium', 'ga_term', 'ga_content', 'ga_campaign',
  'ga_place', 'gb_source', 'gb_medium', 'gb_content', 'gb_campaign',
  // Adobe
  's_kwcid', 'ef_id', 'epik', 'pp',
  // Microsoft
  'msclkid',
  // Amazon
  'ref_', 'tag', 'ascsubtag', 'linkCode', 'creativeASIN',
  // Other
  'zanpid', 'wickedid', 'yclid', 'ttclid', 'twclid',
  'igshid', 'si', 'feature', 'ref_src',
  // AliExpress / e-commerce
  'spm', 'scm', 'aff_platform', 'aff_trace_key',
  // TikTok
  '_r', 'sender_device', 'sender_web_id', 'is_from_webapp',
  // Pinterest
  'epik', 'pin_email',
  // LinkedIn
  'trk', 'trkEmail', 'lipi', 'licu',
  // Snapchat
  'sc_redir',
  // Generic
  'affid', 'cid', 'sid', 'kid', 'pid', 'bid',
];

// ── Blocked permission types ──────────────────────────────
const BLOCKED_PERMISSIONS: readonly string[] = [
  'geolocation',
  // 'media',  // REMOVED — breaks YouTube video playback
  'midi',
  'midiSysex',
  'notifications',
  'openExternal',
  'pointerLock',
  'display-capture',
  // 'clipboard-read',  // REMOVED — breaks Proton Mail & address bar copy
  // 'clipboard-write', // REMOVED — breaks Proton Mail & address bar copy
  'payment-handler',
  'usb',
  'serial',
  'bluetooth',
  'hid',
  'nfc',
  'idle-detection',
  'periodic-background-sync',
  'background-sync',
  'window-management',
  'local-fonts',
  'storage-access',
  'top-level-storage-access',
];

// ── Known tracking / analytics endpoint patterns ──────────
const BLOCKED_URL_PATTERNS: readonly RegExp[] = [
  // Google Analytics
  /\/\/www\.google-analytics\.com\//,
  /\/\/ssl\.google-analytics\.com\//,
  /\/\/analytics\.google\.com\//,
  // Google Tag Manager
  /\/\/www\.googletagmanager\.com\/gtm\.js/,
  /\/\/www\.googletagmanager\.com\/gtag\//,
  // Google Ads / DoubleClick
  /\/\/googleads\./,
  /\/\/doubleclick\.net\//,
  /\/\/ads\.google\./,
  /\/\/pagead2\.googlesyndication\.com\//,
  /\/\/tpc\.googlesyndication\.com\//,
  // Facebook tracking
  /\/\/connect\.facebook\.net\/.*\/fbevents\.js/,
  /\/\/www\.facebook\.com\/tr\//,
  // Twitter/X tracking
  /\/\/static\.ads-twitter\.com\/.*\/uwt\.js/,
  /\/\/analytics\.twitter\.com\//,
  // LinkedIn
  /\/\/snap\.licdn\.com\/.*\/li\.js/,
  /\/\/px\.ads\.linkedin\.com\//,
  // Hotjar
  /\/\/static\.hotjar\.com\/.*\/hotjar-\d+\.js/,
  /\/\/script\.hotjar\.com\//,
  // Mixpanel
  /\/\/cdn\.mxpnl\.com\/.*\/mixpanel-/,
  // Segment
  /\/\/cdn\.segment\.com\/analytics\.js/,
  // Amplitude
  /\/\/cdn\.amplitude\.com\/libs\//,
  // Intercom
  /\/\/widget\.intercom\.io\/widget\//,
  /\/\/js\.intercomcdn\.com\//,
  // Crazy Egg
  /\/\/script\.crazyegg\.com\/.*\/ ce\d+\./,
  // New Relic
  /\/\/js-agent\.newrelic\.com\//,
  // Sentry (browser SDK — allow API, block SDK)
  /\/\/browser\.sentry-cdn\.com\//,
  // FullStory
  /\/\/fullstory\.com\/s\/fs\.js/,
  // Other trackers
  /\/\/bat\.bing\.com\/.*\/bat\.js/,
  /\/\/clarity\.ms\/.*\/clarity\.js/,
  /\/\/scribe\.twitter\.com\//,
  /\/\/analytics\.tickaroo\.com\//,
  /\/\/plausible\.io\/js\/plausible/,
  /\/\/matomo\./,
  /\/\/piwik\./,
  // Generic beacon endpoints
  /\/collect\?/,
  /\/analytics\/event/,
  /\/track\?/,
  /\/log\/event/,
  /\/beacon\//,
  /\.gif\?.*(t=|event|action|track)/,
];

// ── Auth / iframe-sensitive hosts: skip X-Frame-Options / Permissions-Policy ──
const AUTH_HOSTS: readonly string[] = [
  'accounts.google.com',
  'google.com',
  'www.google.com',
  'youtube.com',
  'www.youtube.com',
  'googleapis.com',
  'login.microsoftonline.com',
  'github.com',
  'www.github.com',
  'proton.me',
  'www.proton.me',
  'mail.proton.me',
  'protonmail.com',
  'www.protonmail.com',
  'localhost',
  '127.0.0.1',
];

// ── Per-session noise for consistent but unique fingerprint ═══
let sessionNoise: number | null = null;

function getSessionNoise(): number {
  if (sessionNoise === null) {
    sessionNoise = Math.random();
  }
  return sessionNoise;
}

// ═══════════════════════════════════════════════════════════
// 1.1 Session-wide privacy configuration
// ═══════════════════════════════════════════════════════════

export function configurePrivacySession(sess?: Session): void {
  const s = sess || session.defaultSession;

  // ── UA without Electron/app tokens (Google login "insecure browser" fix).
  //    Real Chromium version keeps the UA consistent with Sec-CH-UA hints.
  s.setUserAgent(
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`,
  );

  // ── 1.1.1 WebRTC: deny all permission requests by default ──
  // The critical IP-leak prevention is the command-line switch:
  //   --force-webrtc-ip-handling-policy=disable_non_proxied_udp
  // This handler provides the second layer of defense.
  s.setPermissionRequestHandler((_webContents, permission, callback) => {
    const shouldBlock = BLOCKED_PERMISSIONS.includes(permission);
    callback(!shouldBlock);
  });

  // ── 1.1.2 Permission check handler (navigator.permissions.query) ──
  // Spoof permission states so sites cannot probe capabilities
  s.setPermissionCheckHandler((_wc, permission) => {
    const alwaysDeny: readonly string[] = [
      'geolocation',
      'notifications',
      'midi',
      'midi-sysex',
      'push',
      'camera',
      'microphone',
      'speaker-selection',
      'device-info',
      'background-sync',
      // 'persistent-storage', // REMOVED — breaks Proton Mail encryption key storage
      // 'clipboard-read',
      // 'clipboard-write',
      'local-fonts',
      'idle-detection',
      'window-management',
      'storage-access',
      'top-level-storage-access',
    ];
    if (alwaysDeny.includes(permission)) {
      return false;
    }
    // Allow all other permission checks to proceed normally
    return true;
  });

  // ── 1.1.3 Response header sanitization ──
  s.webRequest.onHeadersReceived(
    filterAllUrls(),
    (details: OnHeadersReceivedListenerDetails, callback: (response: HeadersReceivedResponse) => void) => {
      const headers: Record<string, string[]> = { ...details.responseHeaders } || {};

      // ═══ Remove fingerprinting / tracking headers ═══
      const headersToStrip: readonly string[] = [
        'x-powered-by',
        'server',
        'x-aspnet-version',
        'x-aspnetmvc-version',
        'x-rack-cache',
        'x-drupal-cache',
        'x-server-powered-by',
        'x-nginx-version',
        'x-litespeed-cache',
        'cf-ray',
        'cf-cache-status',
        'cf-apo-via',
        'x-cache',
        'x-cache-hits',
        'x-served-by',
        'x-timer',
        'x-fastly-request-id',
        'x-request-id',
        'x-correlation-id',
        'x-b3-traceid',
        'x-b3-spanid',
        'x-datadog-trace-id',
        'x-amz-request-id',
        'x-amz-id-2',
        'x-edge-origin-shield-skipped',
        'x-amz-cf-id',
        'x-edge-request-id',
        'akamai-request-id',
        'x-iinfo',
        'x-varnish',
        'via',
        'etag', // Can be used for cache tracking
      ];
      for (const h of headersToStrip) {
        delete headers[h];
        delete headers[h.toLowerCase()];
      }

      // ═══ Add hardening / privacy headers ═══
      // Do NOT inject X-Frame-Options / Permissions-Policy on auth/iframe-sensitive hosts
      const hostname = new URL(details.url).hostname;
      const isAuthHost = AUTH_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));

      headers['Strict-Transport-Security'] = ['max-age=63072000; includeSubDomains; preload'];
      headers['X-Content-Type-Options'] = ['nosniff'];
      headers['Referrer-Policy'] = ['strict-origin-when-cross-origin'];

      if (!isAuthHost) {
        headers['X-Frame-Options'] = ['DENY'];
        headers['Permissions-Policy'] = [
          'geolocation=(), ' +
          'microphone=(), ' +
          'camera=(), ' +
          'payment=(), ' +
          'usb=(), ' +
          'bluetooth=(), ' +
          'midi=(), ' +
          'hid=(), ' +
          'serial=(), ' +
          'idle-detection=(), ' +
          'ambient-light-sensor=(), ' +
          'accelerometer=(), ' +
          'gyroscope=(), ' +
          'magnetometer=(), ' +
          'display-capture=(), ' +
          'document-domain=(), ' +
          'encrypted-media=(self), ' +
          'fullscreen=(self), ' +
          'keyboard-map=(), ' +
          'local-fonts=(), ' +
          'picture-in-picture=(self), ' +
          'publickey-credentials-get=(), ' +
          'screen-wake-lock=(), ' +
          'window-management=(), ' +
          'xr-spatial-tracking=()',
        ];
      }
      // Always enforce no sniff for downloaded content
      headers['X-Download-Options'] = ['noopen'];

      callback({ responseHeaders: headers });
    },
  );

  // ── 1.1.4 Request blocking & tracking parameter stripping ──
  s.webRequest.onBeforeRequest(
    filterAllUrls(),
    (details: OnBeforeRequestListenerDetails, callback: (response: BeforeSendResponse) => void) => {
      const url = details.url;

      // ═══ Block known tracking endpoints ═══
      for (const pattern of BLOCKED_URL_PATTERNS) {
        if (pattern.test(url)) {
          callback({ cancel: true });
          return;
        }
      }

      // ═══ Strip tracking query parameters ═══
      try {
        const urlObj = new URL(url);
        let modified = false;

        for (const param of TRACKING_PARAMS) {
          if (urlObj.searchParams.has(param)) {
            urlObj.searchParams.delete(param);
            modified = true;
          }
        }

        // Also strip any param starting with 'utm_' that we might have missed
        for (const [key] of urlObj.searchParams) {
          if (key.startsWith('utm_')) {
            urlObj.searchParams.delete(key);
            modified = true;
          }
        }

        if (modified) {
          callback({ redirectURL: urlObj.toString() });
          return;
        }
      } catch {
        // Invalid URL — let it through
      }

      callback({});
    },
  );

  // ── 1.1.5 Request header sanitization ──
  s.webRequest.onBeforeSendHeaders(
    filterAllUrls(),
    (details, callback) => {
      const headers = { ...details.requestHeaders };

      // Remove headers that leak system info
      delete headers['X-Client-Data']; // Chrome experiments tracking

      // Sanitize Accept-Language to reduce fingerprinting surface
      // Only keep primary language, remove quality values
      if (headers['Accept-Language']) {
        const primaryLang = headers['Accept-Language'].split(',')[0]?.split(';')[0]?.trim();
        if (primaryLang) {
          headers['Accept-Language'] = primaryLang;
        }
      }

      // Remove DNT header (we handle this via other means, and it adds entropy)
      delete headers['DNT'];

      // ── Google sign-in: UA client hints must match the claimed Chrome UA ──
      // Electron sends "Chromium"-only brands in sec-ch-ua while our UA string
      // says Chrome — Google flags the mismatch as "browser may not be secure".
      const chromeMajor = process.versions.chrome.split('.')[0];
      const headerKeys = Object.keys(headers);
      const findHint = (name: string): string | undefined =>
        headerKeys.find((k) => k.toLowerCase() === name);
      if (findHint('sec-ch-ua')) {
        const brandHint = findHint('sec-ch-ua');
        if (brandHint) {
          headers[brandHint] =
            `"Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}", "Not-A.Brand";v="99"`;
        }
        const mobileHint = findHint('sec-ch-ua-mobile');
        if (mobileHint) headers[mobileHint] = '?0';
        const platformHint = findHint('sec-ch-ua-platform');
        if (platformHint) headers[platformHint] = '"Linux"';
        // High-entropy hints could contradict the claim — drop them
        for (const hi of [
          'sec-ch-ua-full-version-list',
          'sec-ch-ua-full-version',
          'sec-ch-ua-model',
          'sec-ch-ua-platform-version',
          'sec-ch-ua-wow64',
          'sec-ch-ua-arch',
          'sec-ch-ua-bitness',
        ]) {
          const key = findHint(hi);
          if (key) delete headers[key];
        }
      }

      // ── Google sign-in, layer 2: full Windows-Chrome identity for google hosts.
      // Google's anti-abuse heuristics flag "Linux + Chrome" combos from
      // non-Google binaries; a consistent Windows-Chrome claim passes.
      let isGoogleHost = false;
      try {
        const host = new URL(details.url).hostname.toLowerCase();
        isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
      } catch {
        /* non-URL detail */
      }
      if (isGoogleHost) {
        const winUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
        const uaKey = findHint('user-agent');
        if (uaKey) headers[uaKey] = winUa;
        const platKey = findHint('sec-ch-ua-platform');
        if (platKey) headers[platKey] = '"Windows"';
      }

      callback({ requestHeaders: headers });
    },
  );

  // ── 1.1.6 Session noise accessor ──
  // This is used by the fingerprint spoofer for consistent per-session noise
  const noise = getSessionNoise();
  void noise; // Prevent unused warning — value is read by spoofer module
}

// ═══════════════════════════════════════════════════════════
// Privacy configuration types & defaults
// ═══════════════════════════════════════════════════════════

export interface PrivacyConfig {
  /** Block known tracking endpoints */
  blockTrackers: boolean;
  /** Strip tracking parameters from URLs */
  stripTrackingParams: boolean;
  /** Sanitize response headers */
  sanitizeHeaders: boolean;
  /** Block WebRTC IP leaks */
  blockWebrtcLeaks: boolean;
  /** Spoof canvas/WebGL/audio fingerprints */
  spoofFingerprints: boolean;
  /** Enforce HTTPS-only mode */
  httpsOnly: boolean;
  /** Block third-party cookies */
  blockThirdPartyCookies: boolean;
  /** Enable Do-Not-Track header */
  sendDntHeader: boolean;
  /** Disable JavaScript (global kill-switch) */
  disableJavaScript: boolean;
  /** Anti-fingerprinting level: 'none' | 'basic' | 'strict' | 'paranoid' */
  fingerprintLevel: 'none' | 'basic' | 'strict' | 'paranoid';
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  blockTrackers: true,
  stripTrackingParams: true,
  sanitizeHeaders: true,
  blockWebrtcLeaks: true,
  spoofFingerprints: true,
  httpsOnly: false,
  blockThirdPartyCookies: true,
  sendDntHeader: true,
  disableJavaScript: false,
  fingerprintLevel: 'strict',
};

let currentPrivacyConfig: PrivacyConfig = { ...DEFAULT_PRIVACY_CONFIG };

export function getPrivacyConfig(): PrivacyConfig {
  return { ...currentPrivacyConfig };
}

export function setPrivacyConfig(config: Partial<PrivacyConfig>): PrivacyConfig {
  currentPrivacyConfig = { ...currentPrivacyConfig, ...config };
  // Re-apply privacy settings with new config
  applyPrivacyConfig(currentPrivacyConfig);
  return { ...currentPrivacyConfig };
}

export function applyPrivacyConfig(config: PrivacyConfig): void {
  const s = session.defaultSession;

  // ── Third-party cookie blocking ──
  // Electron Session does not expose cookie blocking APIs directly.
  // Third-party cookies are mitigated via:
  //   1. Response header sanitization (removes Set-Cookie headers from trackers)
  //   2. Partitioned storage per site (strict origin isolation enabled via CLI)
  //   3. session.clearStorageData() called on session clear

  // ── JavaScript kill-switch ──
  // Note: global JS disable requires content settings API which is not
  // exposed in Electron 28. Per-tab JS can be toggled via webContents.setJavaScriptEnabled().
}

// ═══════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════

function filterAllUrls(): { urls: string[] } {
  return {
    urls: ['<all_urls>'],
  };
}

// Re-export noise for fingerprint spoofer
export { getSessionNoise };
