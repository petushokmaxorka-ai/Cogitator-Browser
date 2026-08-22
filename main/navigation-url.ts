// URL normalization and poisoned-session recovery (legacy data: error pages).

const START_URL = 'cogitator://start';

function isDataLikeUrl(url: string): boolean {
  return (
    url.startsWith('data:') ||
    /^https?:\/\/data:/i.test(url) ||
    url.includes('data:text/html')
  );
}

/** Pull a real http(s) target out of nested legacy error-page URLs. */
export function extractRealUrlFromPoisoned(url: string): string | null {
  if (url.startsWith('cogitator://error')) {
    try {
      const target = new URL(url).searchParams.get('target');
      if (target) return extractRealUrlFromPoisoned(target);
    } catch {
      /* ignore */
    }
    return null;
  }

  let probe = url;
  if (/^https?:\/\/data:/i.test(probe)) {
    probe = probe.replace(/^https?:\/\//i, '');
  }

  if (!isDataLikeUrl(probe) && !isDataLikeUrl(url)) {
    if (/^https?:\/\//i.test(url) && !isDataLikeUrl(url)) return url;
    return null;
  }

  try {
    const decoded = decodeURIComponent(probe);
    const yt = decoded.match(/https?:\/\/(?:www\.)?youtube\.com[^\s"'<>]*/i);
    if (yt) return yt[0];
    const href = decoded.match(/href="(https?:\/\/[^"]+)"/i);
    if (href?.[1] && !isDataLikeUrl(href[1])) return href[1];
    const any = decoded.match(/https?:\/\/[a-z0-9][a-z0-9.-]*[a-z]{2,}[^\s"'<>]*/i);
    if (any && !isDataLikeUrl(any[0])) return any[0];
  } catch {
    /* ignore */
  }

  const ytEnc = url.match(/https?%3A%2F%2F(?:www%2E)?youtube\.com[^%&"']*/i);
  if (ytEnc) {
    try {
      return decodeURIComponent(ytEnc[0].replace(/\+/g, '%20'));
    } catch {
      return 'https://www.youtube.com/';
    }
  }

  return null;
}

export function isPersistableUrl(url: string): boolean {
  if (!url || url === START_URL || url === 'about:blank') return false;
  if (url.startsWith('cogitator://error')) return false;
  if (isDataLikeUrl(url)) return false;
  return true;
}

export function sanitizeNavigationUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return START_URL;

  if (trimmed.startsWith('cogitator://error') || isDataLikeUrl(trimmed)) {
    const recovered = extractRealUrlFromPoisoned(trimmed);
    return recovered ? normalizeNavigationUrl(recovered) : START_URL;
  }

  return normalizeNavigationUrl(trimmed);
}

export function normalizeNavigationUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^(https?|cogitator|data):/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('about:')) return trimmed;
  if (/^https?:\/\/data:/i.test(trimmed)) {
    return sanitizeNavigationUrl(trimmed.replace(/^https?:\/\//i, ''));
  }
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed) || trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function shouldSkipLoadErrorHandler(url: string): boolean {
  if (!url) return true;
  if (url.startsWith('cogitator://error')) return true;
  if (url.startsWith('about:')) return true;
  if (isDataLikeUrl(url)) return true;
  return false;
}

export function buildLoadErrorUrl(url: string, errorCode: number, errorDescription: string): string {
  const params = new URLSearchParams({
    target: url,
    code: String(errorCode),
    desc: errorDescription,
  });
  return `cogitator://error?${params.toString()}`;
}
