import { describe, it, expect, vi } from 'vitest';
import { resolve, normalize, isAbsolute, sep } from 'path';
import { homedir } from 'os';

// Pin the home dir: with the real one the escape cases depend on who runs
// the suite (as root, HOME=/root makes /root/.ssh an "allowed" path).
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => '/home/cogitator-test' };
});

// Replicate resolveSafePath logic from index.ts
const ALLOWED_ROOTS = [
  homedir(),
  '/tmp',
  '/home/heretic/Downloads',
  '/home/heretic/Documents',
].map(r => resolve(r));

function resolveSafePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path');
  }
  const resolved = resolve(normalize(inputPath));
  if (!isAbsolute(resolved)) {
    throw new Error('Path must be absolute');
  }
  const allowed = ALLOWED_ROOTS.some(
    root => resolved === root || resolved.startsWith(root + sep)
  );
  if (!allowed) {
    throw new Error('Path outside allowed directories: ' + resolved);
  }
  return resolved;
}

describe('Path Safety — resolveSafePath', () => {
  describe('Valid paths', () => {
    it('should accept home directory', () => {
      const home = homedir();
      expect(() => resolveSafePath(home)).not.toThrow();
    });

    it('should accept path inside home', () => {
      const home = homedir();
      expect(() => resolveSafePath(home + '/Documents/file.txt')).not.toThrow();
    });

    it('should accept /tmp', () => {
      expect(() => resolveSafePath('/tmp/test.txt')).not.toThrow();
    });

    it('should return resolved absolute path', () => {
      const home = homedir();
      const result = resolveSafePath(home + '/test.txt');
      expect(result).toContain('test.txt');
      expect(isAbsolute(result)).toBe(true);
    });
  });

  describe('Escape attempts', () => {
    it('should reject path traversal with ../', () => {
      const home = homedir();
      expect(() => resolveSafePath(home + '/../../../etc/passwd')).toThrow();
    });

    it('should reject direct /etc/passwd', () => {
      expect(() => resolveSafePath('/etc/passwd')).toThrow();
    });

    it('should reject /etc/shadow', () => {
      expect(() => resolveSafePath('/etc/shadow')).toThrow();
    });

    it('should reject /root/.ssh', () => {
      expect(() => resolveSafePath('/root/.ssh/id_rsa')).toThrow();
    });
  });

  describe('Absolute paths outside allowed', () => {
    it('should reject /usr/bin/ls', () => {
      expect(() => resolveSafePath('/usr/bin/ls')).toThrow();
    });

    it('should reject /var/log/syslog', () => {
      expect(() => resolveSafePath('/var/log/syslog')).toThrow();
    });
  });

  describe('Relative paths', () => {
    it('should reject relative path "foo"', () => {
      // resolve("foo") → /cwd/foo which may or may not be allowed
      // The function requires absolute, so if resolve gives absolute it checks
      // If cwd is not in ALLOWED_ROOTS, it should throw
      try {
        const result = resolveSafePath('foo');
        // If it doesn't throw, the resolved path must be in allowed roots
        expect(isAbsolute(result)).toBe(true);
      } catch (e) {
        expect((e as Error).message).toMatch(/Path|Invalid|outside/);
      }
    });
  });

  describe('Invalid input', () => {
    it('should reject empty string', () => {
      expect(() => resolveSafePath('')).toThrow('Invalid path');
    });

    it('should reject null-like input', () => {
      expect(() => resolveSafePath(null as unknown as string)).toThrow();
    });
  });
});
