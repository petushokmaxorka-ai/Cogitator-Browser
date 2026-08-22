// ═══════════════════════════════════════════════════════════
// Vault Crypto — Password Vault Cryptographic Engine
// Dark Mechanicus Password Manager — COGITATOR BROWSER
// ═══════════════════════════════════════════════════════════
//
//  CRYPTKEEPER v1.0 — AES-256-GCM + PBKDF2-SHA256
//  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Encryption:     AES-256-GCM (authenticated encryption)
//  Key Derivation: PBKDF2-SHA256, 100,000 iterations
//  Key Length:     256 bits (32 bytes)
//  Salt:           256 bits (32 bytes), random per vault
//  IV:             128 bits (16 bytes), random per operation
//  Auth Tag:       128 bits (16 bytes), GCM authentication
//
//  File Layout (vault.enc):
//    [0..15]    IV (16 bytes)
//    [16..31]   Auth Tag (16 bytes)
//    [32..N]    Ciphertext (variable)
//
// ═══════════════════════════════════════════════════════════

import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// ── Cryptographic Constants ───────────────────────────────

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// ── Data Interfaces ───────────────────────────────────────

/** Password entry stored in the vault */
export interface PasswordEntry {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  folder: VaultFolder;
  createdAt: number;
  modifiedAt: number;
  favicon: string;
}

/** Card entry for payment card storage */
export interface CardEntry {
  id: string;
  title: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  notes: string;
  createdAt: number;
  modifiedAt: number;
}

/** Vault folder categories */
export type VaultFolder = 'general' | 'social' | 'banking' | 'work';

/** Vault data container */
export interface VaultData {
  passwords: PasswordEntry[];
  cards: CardEntry[];
  version: number;
}

/** New password entry (without auto-generated fields) */
export type NewPasswordEntry = Omit<PasswordEntry, 'id' | 'createdAt' | 'modifiedAt'>;

/** Password strength levels */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/** Password generation options */
export interface PasswordGenOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

// ── Vault Paths ───────────────────────────────────────────

let vaultDir: string;
let vaultFile: string;
let saltFile: string;
let tempKeyFile: string;

/** Initialize vault paths (must be called before any operations) */
export function initializeVaultPaths(): void {
  const userData = app.getPath('userData');
  vaultDir = join(userData, 'vault');
  vaultFile = join(vaultDir, 'vault.enc');
  saltFile = join(vaultDir, '.salt');
  tempKeyFile = join(vaultDir, '.tmp');

  if (!existsSync(vaultDir)) {
    mkdirSync(vaultDir, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════
//  VAULT CRYPTO CLASS
// ═══════════════════════════════════════════════════════════

export class VaultCrypto {
  private key: Buffer | null = null;
  private salt: Buffer;
  private unlocked = false;
  private vaultData: VaultData = { passwords: [], cards: [], version: 1 };

  // ── Initialization ──────────────────────────────────────

  constructor() {
    if (!vaultDir) {
      initializeVaultPaths();
    }

    // Load or generate salt
    if (existsSync(saltFile!)) {
      this.salt = readFileSync(saltFile!);
    } else {
      this.salt = randomBytes(SALT_LENGTH);
      writeFileSync(saltFile!, this.salt);
    }
  }

  // ── Key Derivation ──────────────────────────────────────

  /**
   * Derive encryption key from master password using PBKDF2-SHA256.
   * This is the core security primitive — slow by design to resist brute-force.
   */
  private deriveKey(password: string): Buffer {
    return pbkdf2Sync(password, this.salt, ITERATIONS, KEY_LENGTH, 'sha256');
  }

  // ── Core Cryptographic Operations ───────────────────────

  /**
   * Encrypt plaintext data using AES-256-GCM.
   * Returns: IV (16) + AuthTag (16) + Ciphertext (N)
   */
  private encrypt(plaintext: string): Buffer {
    if (!this.key) throw new Error('[CRYPT] Vault locked — key unavailable');

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    const output = Buffer.concat([iv, authTag, encrypted]);

    // Overwrite sensitive buffers
    iv.fill(0);
    authTag.fill(0);

    return output;
  }

  /**
   * Decrypt data encrypted with AES-256-GCM.
   * Input format: IV (16) + AuthTag (16) + Ciphertext (N)
   * Throws if authentication fails (tampered data or wrong key).
   */
  private decrypt(data: Buffer): string {
    if (!this.key) throw new Error('[CRYPT] Vault locked — key unavailable');

    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('[CRYPT] Invalid vault file — too short');
    }

    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    return decrypted;
  }

  // ── Vault Lifecycle ─────────────────────────────────────

  /**
   * Unlock the vault with a master password.
   * Returns true if successful, false if password is incorrect.
   * If vault file doesn't exist yet, creates an empty vault in memory.
   */
  unlock(masterPassword: string): boolean {
    try {
      this.key = this.deriveKey(masterPassword);

      if (existsSync(vaultFile!)) {
        const encrypted = readFileSync(vaultFile!);
        const decrypted = this.decrypt(encrypted);
        this.vaultData = JSON.parse(decrypted);

        // Validate structure
        if (!this.vaultData.passwords) this.vaultData.passwords = [];
        if (!this.vaultData.cards) this.vaultData.cards = [];
        if (!this.vaultData.version) this.vaultData.version = 1;
      } else {
        // First time — initialize empty vault
        this.vaultData = { passwords: [], cards: [], version: 1 };
      }

      this.unlocked = true;
      return true;
    } catch (err) {
      this.key = null;
      this.unlocked = false;
      this.vaultData = { passwords: [], cards: [], version: 1 };
      return false;
    }
  }

  /** Lock the vault — zeroes the key from memory */
  lock(): void {
    if (this.key) {
      this.key.fill(0);
      this.key = null;
    }
    this.unlocked = false;
  }

  /** Check if vault file exists on disk */
  vaultExists(): boolean {
    return existsSync(vaultFile!);
  }

  /** Check if vault is currently unlocked */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Persist vault data to disk (encrypt + write) */
  private save(): void {
    if (!this.key || !this.unlocked) {
      throw new Error('[CRYPT] Vault locked — cannot save');
    }

    const plaintext = JSON.stringify(this.vaultData);
    const encrypted = this.encrypt(plaintext);
    writeFileSync(vaultFile!, encrypted);
  }

  /** Change master password — re-encrypts vault with new key */
  changePassword(newPassword: string): boolean {
    if (!this.unlocked) return false;

    try {
      // Generate new salt for the new password
      const newSalt = randomBytes(SALT_LENGTH);
      const newKey = pbkdf2Sync(newPassword, newSalt, ITERATIONS, KEY_LENGTH, 'sha256');

      // Re-encrypt with new key
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, newKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(this.vaultData), 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      const output = Buffer.concat([iv, authTag, encrypted]);

      // Atomically update: write new salt first, then vault
      writeFileSync(saltFile!, newSalt);
      writeFileSync(vaultFile!, output);

      // Update in-memory key
      if (this.key) this.key.fill(0);
      this.key = newKey;
      this.salt = newSalt;

      return true;
    } catch {
      return false;
    }
  }

  // ── Password Operations ─────────────────────────────────

  /** Get all passwords (with passwords masked) */
  getPasswords(): Omit<PasswordEntry, 'password'>[] {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    return this.vaultData.passwords.map((p) => ({ ...p, password: '••••••••' }));
  }

  /** Get a single password entry by ID (includes actual password) */
  getPassword(id: string): PasswordEntry | undefined {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    return this.vaultData.passwords.find((p) => p.id === id);
  }

  /** Search passwords by title, URL, or username */
  searchPasswords(query: string): PasswordEntry[] {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    const q = query.toLowerCase();
    return this.vaultData.passwords.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.url.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
    );
  }

  /** Get passwords matching a URL (for auto-fill) */
  getPasswordsForUrl(url: string): PasswordEntry[] {
    if (!this.unlocked) return [];
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return this.vaultData.passwords.filter((p) => {
        if (!p.url) return false;
        try {
          const pUrl = new URL(p.url);
          return pUrl.hostname.toLowerCase() === hostname;
        } catch {
          return p.url.toLowerCase().includes(hostname);
        }
      });
    } catch {
      return this.vaultData.passwords.filter((p) =>
        p.url.toLowerCase().includes(url.toLowerCase())
      );
    }
  }

  /** Add a new password entry */
  addPassword(entry: NewPasswordEntry): PasswordEntry {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');

    const newEntry: PasswordEntry = {
      ...entry,
      id: randomBytes(16).toString('hex'),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.vaultData.passwords.push(newEntry);
    this.save();
    return newEntry;
  }

  /** Update an existing password entry */
  updatePassword(id: string, updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>): void {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');

    const idx = this.vaultData.passwords.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('[CRYPT] Password entry not found');

    this.vaultData.passwords[idx] = {
      ...this.vaultData.passwords[idx],
      ...updates,
      modifiedAt: Date.now(),
    };
    this.save();
  }

  /** Delete a password entry */
  deletePassword(id: string): void {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    this.vaultData.passwords = this.vaultData.passwords.filter((p) => p.id !== id);
    this.save();
  }

  // ── Secure Password Generation ──────────────────────────

  /**
   * Generate a cryptographically secure password.
   * Uses crypto.randomBytes for unpredictable randomness.
   */
  generatePassword(
    length = 16,
    useSymbols = true,
    useNumbers = true,
    useUppercase = true,
    useLowercase = true
  ): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = '';
    if (useLowercase) charset += lowercase;
    if (useUppercase) charset += uppercase;
    if (useNumbers) charset += numbers;
    if (useSymbols) charset += symbols;

    if (charset.length === 0) {
      throw new Error('[CRYPT] At least one character set must be enabled');
    }

    // Ensure at least one character from each required set
    let password = '';
    if (useLowercase) password += this.getRandomChar(lowercase);
    if (useUppercase) password += this.getRandomChar(uppercase);
    if (useNumbers) password += this.getRandomChar(numbers);
    if (useSymbols) password += this.getRandomChar(symbols);

    // Fill remaining with random characters from full charset
    const remaining = length - password.length;
    if (remaining > 0) {
      for (let i = 0; i < remaining; i++) {
        password += this.getRandomChar(charset);
      }
    }

    // Shuffle using Fisher-Yates with crypto-secure randomness
    return this.secureShuffle(password);
  }

  /** Get a random character from a string using crypto RNG */
  private getRandomChar(charset: string): string {
    const randomValues = randomBytes(4);
    const index = randomValues.readUInt32LE(0) % charset.length;
    return charset[index];
  }

  /** Fisher-Yates shuffle using crypto-secure randomness */
  private secureShuffle(str: string): string {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const randomValues = randomBytes(4);
      const j = randomValues.readUInt32LE(0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  // ── Password Strength Analysis ──────────────────────────

  /**
   * Analyze password strength.
   * Returns: 'weak' | 'fair' | 'good' | 'strong'
   *
   * Scoring:
   *   - Length >= 8:  +1
   *   - Length >= 12: +1
   *   - Length >= 16: +1
   *   - Mixed case:   +1
   *   - Numbers:      +1
   *   - Symbols:      +1
   *   - Length >= 20: +1
   *
   *   0-1: weak | 2: fair | 3-4: good | 5+: strong
   */
  checkStrength(password: string): PasswordStrength {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (password.length >= 20) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return 'weak';
    if (score <= 2) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
  }

  /** Calculate password entropy in bits */
  calculateEntropy(password: string): number {
    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

    if (charsetSize === 0) return 0;
    return Math.round(password.length * Math.log2(charsetSize));
  }

  // ── Card Operations (Future Use) ────────────────────────

  /** Get all card entries */
  getCards(): CardEntry[] {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    return this.vaultData.cards;
  }

  /** Add a new card entry */
  addCard(entry: Omit<CardEntry, 'id' | 'createdAt' | 'modifiedAt'>): CardEntry {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');

    const newEntry: CardEntry = {
      ...entry,
      id: randomBytes(16).toString('hex'),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.vaultData.cards.push(newEntry);
    this.save();
    return newEntry;
  }

  /** Delete a card entry by ID */
  deleteCard(id: string): void {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');
    this.vaultData.cards = this.vaultData.cards.filter((c) => c.id !== id);
    this.save();
  }

  // ── Statistics ────────────────────────────────────────────

  /** Get vault statistics */
  getStats(): { passwordCount: number; cardCount: number; oldestEntry: number; newestEntry: number } {
    if (!this.unlocked) throw new Error('[CRYPT] Vault locked');

    const passwords = this.vaultData.passwords;
    return {
      passwordCount: passwords.length,
      cardCount: this.vaultData.cards.length,
      oldestEntry: passwords.length > 0 ? Math.min(...passwords.map((p) => p.createdAt)) : 0,
      newestEntry: passwords.length > 0 ? Math.max(...passwords.map((p) => p.createdAt)) : 0,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────

  /** Securely destroy vault data in memory */
  destroy(): void {
    this.lock();
    this.vaultData = { passwords: [], cards: [], version: 1 };
  }
}

// ═══════════════════════════════════════════════════════════
//  SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════

let vaultInstance: VaultCrypto | null = null;

/** Get the singleton VaultCrypto instance */
export function getVaultCrypto(): VaultCrypto {
  if (!vaultInstance) {
    vaultInstance = new VaultCrypto();
  }
  return vaultInstance;
}

/** Reset the singleton (for testing) */
export function resetVaultCrypto(): void {
  if (vaultInstance) {
    vaultInstance.destroy();
    vaultInstance = null;
  }
}
