import { describe, it, expect } from 'vitest';

// Import the skip list and helper from fingerprint-spoofer
// Since the module uses Electron APIs, we test the logic directly

const SPOOF_SKIP_HOSTS = [
  'accounts.google.com',
  'myaccount.google.com',
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'accounts.youtube.com',
  'mail.google.com',
  'mail.proton.me',
  'account.proton.me',
  'github.com',
  'login.microsoftonline.com',
];

function shouldSkipSpoof(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SPOOF_SKIP_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch { return false; }
}

describe('Fingerprint Skip-List', () => {
  describe('Google Accounts', () => {
    it('should skip accounts.google.com', () => {
      expect(shouldSkipSpoof('https://accounts.google.com/signin')).toBe(true);
    });

    it('should skip myaccount.google.com', () => {
      expect(shouldSkipSpoof('https://myaccount.google.com')).toBe(true);
    });

    it('should skip mail.google.com', () => {
      expect(shouldSkipSpoof('https://mail.google.com/mail/u/0')).toBe(true);
    });
  });

  describe('YouTube', () => {
    it('should skip www.youtube.com', () => {
      expect(shouldSkipSpoof('https://www.youtube.com/watch?v=abc')).toBe(true);
    });

    it('should skip youtube.com', () => {
      expect(shouldSkipSpoof('https://youtube.com')).toBe(true);
    });

    it('should skip m.youtube.com', () => {
      expect(shouldSkipSpoof('https://m.youtube.com')).toBe(true);
    });

    it('should skip music.youtube.com', () => {
      expect(shouldSkipSpoof('https://music.youtube.com')).toBe(true);
    });

    it('should skip accounts.youtube.com', () => {
      expect(shouldSkipSpoof('https://accounts.youtube.com')).toBe(true);
    });
  });

  describe('ProtonMail', () => {
    it('should skip mail.proton.me', () => {
      expect(shouldSkipSpoof('https://mail.proton.me/inbox')).toBe(true);
    });

    it('should skip account.proton.me', () => {
      expect(shouldSkipSpoof('https://account.proton.me/login')).toBe(true);
    });
  });

  describe('GitHub', () => {
    it('should skip github.com', () => {
      expect(shouldSkipSpoof('https://github.com/login')).toBe(true);
    });

    it('should skip subdomain of github.com', () => {
      expect(shouldSkipSpoof('https://gist.github.com')).toBe(true); // endsWith .github.com
    });
  });

  describe('Microsoft', () => {
    it('should skip login.microsoftonline.com', () => {
      expect(shouldSkipSpoof('https://login.microsoftonline.com/oauth2')).toBe(true);
    });
  });

  describe('Random sites (spoofing active)', () => {
    it('should NOT skip random site', () => {
      expect(shouldSkipSpoof('https://example.com')).toBe(false);
    });

    it('should NOT skip Wikipedia', () => {
      expect(shouldSkipSpoof('https://en.wikipedia.org')).toBe(false);
    });

    it('should NOT skip Reddit', () => {
      expect(shouldSkipSpoof('https://www.reddit.com')).toBe(false);
    });

    it('should NOT skip Hacker News', () => {
      expect(shouldSkipSpoof('https://news.ycombinator.com')).toBe(false);
    });

    it('should NOT skip localhost', () => {
      expect(shouldSkipSpoof('http://localhost:3000')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid URL gracefully', () => {
      expect(shouldSkipSpoof('not-a-url')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(shouldSkipSpoof('')).toBe(false);
    });

    it('should NOT skip similar but different domains', () => {
      expect(shouldSkipSpoof('https://notgithub.com')).toBe(false);
      expect(shouldSkipSpoof('https://fakeyoutube.com')).toBe(false);
    });
  });
});
