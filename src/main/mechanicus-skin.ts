// ═══════════════════════════════════════════════════════════
// Desktop Chrome UA — the only surviving export of the old skin module
// ═══════════════════════════════════════════════════════════
// Version is taken from the real Chromium build so the UA string matches
// Sec-CH-UA client hints (static "Chrome/131" vs engine 137 makes Google
// login flag the browser as insecure).
// The skin/DarkReader machinery that used to live here is gone: external
// sites render pure Chromium; our own pages carry their built-in styles.

export const DESKTOP_CHROME_UA =
  `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
