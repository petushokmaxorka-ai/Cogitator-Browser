import { describe, it, expect } from 'vitest';
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

// Replicate vault crypto logic from vault-crypto.ts
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function encrypt(plaintext: string, password: string): Buffer {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Layout: salt(32) + iv(16) + authTag(16) + ciphertext
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

function decrypt(encryptedBuffer: Buffer, password: string): string {
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// Vault data structures
interface PasswordEntry {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
}

interface CardEntry {
  id: string;
  title: string;
  cardNumber: string;
}

interface VaultData {
  passwords: PasswordEntry[];
  cards: CardEntry[];
  version: number;
}

describe('Vault Crypto', () => {
  const masterPassword = 'test-master-password-123!';

  describe('Encrypt/Decrypt roundtrip', () => {
    it('should encrypt and decrypt text', () => {
      const original = 'Hello, HereticArch!';
      const encrypted = encrypt(original, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt JSON vault data', () => {
      const vault: VaultData = {
        passwords: [{
          id: '1',
          title: 'GitHub',
          url: 'https://github.com',
          username: 'user',
          password: 'pass123',
        }],
        cards: [],
        version: 1,
      };
      const json = JSON.stringify(vault);
      const encrypted = encrypt(json, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      const parsed = JSON.parse(decrypted) as VaultData;
      expect(parsed.passwords[0].title).toBe('GitHub');
      expect(parsed.passwords[0].password).toBe('pass123');
    });

    it('should produce different ciphertext for same input (random salt/IV)', () => {
      const text = 'same input';
      const enc1 = encrypt(text, masterPassword);
      const enc2 = encrypt(text, masterPassword);
      expect(Buffer.compare(enc1, enc2)).not.toBe(0);
    });
  });

  describe('Wrong password', () => {
    it('should fail with wrong password', () => {
      const encrypted = encrypt('secret', masterPassword);
      expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
    });
  });

  describe('Empty vault', () => {
    it('should encrypt empty JSON object', () => {
      const empty = '{}';
      const encrypted = encrypt(empty, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      expect(decrypted).toBe('{}');
    });

    it('should encrypt empty vault data', () => {
      const vault: VaultData = { passwords: [], cards: [], version: 1 };
      const json = JSON.stringify(vault);
      const encrypted = encrypt(json, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      const parsed = JSON.parse(decrypted) as VaultData;
      expect(parsed.passwords).toHaveLength(0);
      expect(parsed.cards).toHaveLength(0);
    });
  });

  describe('Card operations', () => {
    it('should save and retrieve card', () => {
      const vault: VaultData = {
        passwords: [],
        cards: [{
          id: '1',
          title: 'Visa',
          cardNumber: '4111111111111111',
        }],
        version: 1,
      };
      const json = JSON.stringify(vault);
      const encrypted = encrypt(json, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      const parsed = JSON.parse(decrypted) as VaultData;
      expect(parsed.cards).toHaveLength(1);
      expect(parsed.cards[0].title).toBe('Visa');
      expect(parsed.cards[0].cardNumber).toBe('4111111111111111');
    });
  });

  describe('Large vault', () => {
    it('should handle 100 passwords', () => {
      const passwords: PasswordEntry[] = [];
      for (let i = 0; i < 100; i++) {
        passwords.push({
          id: String(i),
          title: `Site ${i}`,
          url: `https://site${i}.com`,
          username: `user${i}`,
          password: `pass${i}`,
        });
      }
      const vault: VaultData = { passwords, cards: [], version: 1 };
      const json = JSON.stringify(vault);
      const encrypted = encrypt(json, masterPassword);
      const decrypted = decrypt(encrypted, masterPassword);
      const parsed = JSON.parse(decrypted) as VaultData;
      expect(parsed.passwords).toHaveLength(100);
      expect(parsed.passwords[99].title).toBe('Site 99');
    });
  });
});
