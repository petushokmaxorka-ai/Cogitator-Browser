import { describe, expect, it } from 'vitest';
import {
  extractRealUrlFromPoisoned,
  isPersistableUrl,
  sanitizeNavigationUrl,
  shouldSkipLoadErrorHandler,
} from '../navigation-url';

describe('navigation-url', () => {
  it('rejects poisoned data URLs for session persistence', () => {
    expect(isPersistableUrl('https://data:text/html,abc')).toBe(false);
    expect(isPersistableUrl('data:text/html,abc')).toBe(false);
    expect(isPersistableUrl('cogitator://error?target=x')).toBe(false);
    expect(isPersistableUrl('https://www.youtube.com/')).toBe(true);
  });

  it('skips load-error handler for data-like URLs', () => {
    expect(shouldSkipLoadErrorHandler('https://data:text/html,x')).toBe(true);
    expect(shouldSkipLoadErrorHandler('https://youtube.com/')).toBe(false);
  });

  it('recovers youtube from nested legacy error session URL', () => {
    const poisoned =
      'https://data:text/html;charset=utf-8,' +
      encodeURIComponent('<a href="https://www.youtube.com/">youtube</a>');
    expect(extractRealUrlFromPoisoned(poisoned)).toBe('https://www.youtube.com/');
    expect(sanitizeNavigationUrl(poisoned)).toBe('https://www.youtube.com/');
  });

  it('falls back to start page when poison cannot be recovered', () => {
    expect(sanitizeNavigationUrl('data:text/html,garbage')).toBe('cogitator://start');
  });
});
