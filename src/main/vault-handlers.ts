// ═══════════════════════════════════════════════════════════
// Vault IPC Handlers — Password Vault Bridge
// Dark Mechanicus Password Manager — COGITATOR BROWSER
// ═══════════════════════════════════════════════════════════
//
//  Bridges VaultCrypto <-> Renderer via IPC channels.
//  All crypto operations stay in main process (Node.js).
//  Renderer never sees the encryption key.
//
// ═══════════════════════════════════════════════════════════

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { getVaultCrypto } from './vault-crypto';
import type { NewPasswordEntry, PasswordEntry, PasswordStrength, VaultFolder, CardEntry } from './vault-crypto';

// ── Singleton Instance ────────────────────────────────────

const vault = getVaultCrypto();

// ── Register All Vault Handlers ───────────────────────────

export function registerVaultHandlers(): void {
  // ═══ Vault Lifecycle ═══════════════════════════════════

  /** Check if vault file exists */
  ipcMain.handle(IPC_CHANNELS.VAULT_EXISTS, () => {
    return vault.vaultExists();
  });

  /** Unlock vault with master password */
  ipcMain.handle(IPC_CHANNELS.VAULT_UNLOCK, (_, password: string) => {
    return vault.unlock(password);
  });

  /** Lock vault — clear key from memory */
  ipcMain.handle(IPC_CHANNELS.VAULT_LOCK, () => {
    vault.lock();
  });

  /** Check if vault is unlocked */
  ipcMain.handle(IPC_CHANNELS.VAULT_IS_UNLOCKED, () => {
    return vault.isUnlocked();
  });

  // ═══ Password CRUD ═════════════════════════════════════

  /** Get all passwords (passwords masked) */
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PASSWORDS, () => {
    return vault.getPasswords();
  });

  /** Get single password by ID (with actual password) */
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PASSWORD, (_, id: string) => {
    return vault.getPassword(id);
  });

  /** Add new password entry */
  ipcMain.handle(IPC_CHANNELS.VAULT_ADD_PASSWORD, (_, entry: NewPasswordEntry) => {
    return vault.addPassword(entry);
  });

  /** Update password entry */
  ipcMain.handle(
    IPC_CHANNELS.VAULT_UPDATE_PASSWORD,
    (_, id: string, updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>) => {
      vault.updatePassword(id, updates);
    }
  );

  /** Delete password entry */
  ipcMain.handle(IPC_CHANNELS.VAULT_DELETE_PASSWORD, (_, id: string) => {
    vault.deletePassword(id);
  });

  // ═══ Search & Auto-fill ════════════════════════════════

  /** Search passwords by query */
  ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH_PASSWORDS, (_, query: string) => {
    return vault.searchPasswords(query);
  });

  /** Get passwords matching a URL (for auto-fill) */
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PASSWORDS_FOR_URL, (_, url: string) => {
    return vault.getPasswordsForUrl(url);
  });

  // ═══ Password Generator & Strength ═════════════════════

  /** Generate secure password */
  ipcMain.handle(
    IPC_CHANNELS.VAULT_GENERATE_PASSWORD,
    (
      _,
      length?: number,
      useSymbols?: boolean,
      useNumbers?: boolean,
      useUppercase?: boolean,
      useLowercase?: boolean
    ) => {
      return vault.generatePassword(
        length ?? 16,
        useSymbols ?? true,
        useNumbers ?? true,
        useUppercase ?? true,
        useLowercase ?? true
      );
    }
  );

  /** Check password strength */
  ipcMain.handle(IPC_CHANNELS.VAULT_CHECK_STRENGTH, (_, password: string) => {
    return vault.checkStrength(password);
  });

  /** Calculate password entropy */
  ipcMain.handle(IPC_CHANNELS.VAULT_CALCULATE_ENTROPY, (_, password: string) => {
    return vault.calculateEntropy(password);
  });

  // ═══ Vault Statistics ══════════════════════════════════

  /** Get vault statistics */
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_STATS, () => {
    return vault.getStats();
  });

  // ═══ Change Password ═══════════════════════════════════

  /** Change master password */
  ipcMain.handle(IPC_CHANNELS.VAULT_CHANGE_PASSWORD, (_, newPassword: string) => {
    return vault.changePassword(newPassword);
  });

  // ═══ Vault Cards ═══════════════════════════════════════

  /** Get all saved cards */
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_CARDS, () => {
    if (!vault.isUnlocked()) return { error: 'locked' };
    return { cards: vault.getCards() };
  });

  /** Save a new card entry */
  ipcMain.handle(IPC_CHANNELS.VAULT_SAVE_CARD, (_, card: Omit<CardEntry, 'id' | 'createdAt' | 'modifiedAt'>) => {
    if (!vault.isUnlocked()) return { error: 'locked' };
    const entry = vault.addCard(card);
    return { success: true, card: entry };
  });

  /** Delete a card by ID */
  ipcMain.handle(IPC_CHANNELS.VAULT_DELETE_CARD, (_, id: string) => {
    if (!vault.isUnlocked()) return { error: 'locked' };
    vault.deleteCard(id);
    return { success: true };
  });
}
