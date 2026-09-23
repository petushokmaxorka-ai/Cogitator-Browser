// ═══════════════════════════════════════════════════════════
// COGITATOR BROWSER — Clean-room Google Sign-In
// ═══════════════════════════════════════════════════════════
// Google's anti-abuse keeps flagging our privacy layer (hint stripping,
// permission spoofing, brand rewrites) no matter how consistent the
// claims are. The robust answer: sign in through a dedicated window on
// a VIRGIN session partition ('persist:google-login') — no preload, no
// header rewrites, no fingerprint spoofer; plain Linux-Chromium UA,
// exactly what a stock Chromium sends and Google accepts. After login,
// google/youtube cookies are synced into the main session so regular
// tabs are signed in.

import { BrowserWindow, session } from 'electron';

const PARTITION = 'persist:google-login';
let loginWindow: BrowserWindow | null = null;

/** Interactive Google sign-in URLs (not every accounts.google.com page). */
export function isGoogleLoginUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === 'accounts.google.com' &&
      /ServiceLogin|\/signin|Identifier|Challenge|Capcha/.test(u.pathname + u.search)
    );
  } catch {
    return false;
  }
}

/** Copy google-family cookies from the clean partition into the main session. */
export async function syncGoogleCookies(): Promise<void> {
  const part = session.fromPartition(PARTITION);
  const main = session.defaultSession;
  const probes = [
    'https://google.com/',
    'https://www.google.com/',
    'https://accounts.google.com/',
    'https://youtube.com/',
    'https://www.youtube.com/',
  ];
  const seen = new Set<string>();
  for (const probe of probes) {
    let jar;
    try {
      jar = await part.cookies.get({ url: probe });
    } catch {
      continue;
    }
    for (const c of jar) {
      const key = `${c.domain}|${c.path}|${c.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await main.cookies.set({
          url: `https://${c.domain.replace(/^\./, '')}${c.path}`,
          name: c.name,
          value: c.value,
          // Host-only cookies (incl. __Host- prefixed) must not carry a
          // Domain attribute, or Chromium rejects/widens them.
          domain: c.hostOnly ? undefined : c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          expirationDate: c.expirationDate,
          sameSite: c.sameSite,
        });
      } catch {
        // expired/session cookie race — skip
      }
    }
  }
}

/** Open (or focus) the clean-room sign-in window. */
export function openGoogleLogin(targetUrl: string): void {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    void loginWindow.loadURL(targetUrl).catch(() => {});
    return;
  }

  const part = session.fromPartition(PARTITION);
  // Exactly what a stock Linux Chromium sends — nothing else.
  part.setUserAgent(
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`,
  );

  loginWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    show: false,
    title: '◆ Google Sign-In',
    backgroundColor: '#000000',
    webPreferences: {
      session: part,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  loginWindow.once('ready-to-show', () => {
    if (loginWindow) loginWindow.show();
  });
  loginWindow.webContents.on('did-navigate', () => {
    void syncGoogleCookies();
  });
  loginWindow.on('closed', () => {
    loginWindow = null;
    void syncGoogleCookies();
  });

  void loginWindow.loadURL(targetUrl).catch(() => {});
}
