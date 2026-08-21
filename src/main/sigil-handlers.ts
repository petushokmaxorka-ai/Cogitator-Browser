// ═══════════════════════════════════════════════════════════
// Sigil IPC Handlers — Digital Signature Bridge
// COGITATOR BROWSER v2 | Dark Mechanicus Edition
//
// Registers all IPC channels for the Sigil Engine.
// ═══════════════════════════════════════════════════════════

import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { getSigilEngine } from './sigil-engine';

// ── Register ──────────────────────────────────────────────

export function registerSigilHandlers(): void {
  const engine = getSigilEngine();

  // ── Config ──────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_GET_CONFIG, () => {
    return engine.getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_SET_CONFIG, (_, config) => {
    engine.setConfig(config);
  });

  // ── Certificate Management ──────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_IMPORT_P12, async (_, p12Path: string, password: string) => {
    return engine.importPKCS12(p12Path, password);
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_GET_CERTIFICATES, () => {
    return engine.getCertificates();
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_DELETE_CERT, (_, id: string) => {
    engine.deleteCertificate(id);
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_GENERATE_SELF_SIGNED, async (_, name: string) => {
    return engine.generateSelfSigned(name);
  });

  // ── Signing ─────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_SIGN_FILE, async (_, filePath: string, certificateId: string) => {
    return engine.signFile(filePath, certificateId);
  });

  // ── Verification ────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_VERIFY, async (_, filePath: string, signatureHex: string, certificateId?: string) => {
    return engine.verifySignature(filePath, signatureHex, certificateId);
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_VERIFY_SIG_FILE, async (_, filePath: string, sigFilePath: string) => {
    return engine.verifyFromSigFile(filePath, sigFilePath);
  });

  // ── Signature Log ───────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_GET_SIGNATURES, () => {
    return engine.getSignatures();
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_DELETE_SIGNATURE, (_, id: string) => {
    engine.deleteSignature(id);
  });

  // ── Encryption (Bonus) ──────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SIGIL_ENCRYPT_FILE, async (_, filePath: string, certificateId: string) => {
    return engine.encryptFile(filePath, certificateId);
  });

  ipcMain.handle(IPC_CHANNELS.SIGIL_DECRYPT_FILE, async (_, encryptedFilePath: string, certificateId: string) => {
    return engine.decryptFile(encryptedFilePath, certificateId);
  });

  // ── File Dialog Helper ──────────────────────────────────

  ipcMain.handle('dialog:open-file', async (_, options?: { filters?: any[]; title?: string }) => {
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Select File',
      properties: ['openFile'],
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle('dialog:open-sig-file', async (_, options?: { title?: string }) => {
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Select Signature File',
      properties: ['openFile'],
      filters: [
        { name: 'Signature Files', extensions: ['sig'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle(
    'dialog:open-files',
    async (_, options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => {
      const result = await dialog.showOpenDialog({
        title: options?.title || 'Select Files',
        properties: ['openFile', 'multiSelections'],
        filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
      });
      return result.canceled ? [] : result.filePaths;
    },
  );

  ipcMain.handle(
    'dialog:save-file',
    async (
      _,
      options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; title?: string },
    ) => {
      const result = await dialog.showSaveDialog({
        title: options?.title || 'Save File',
        defaultPath: options?.defaultPath,
        filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
      });
      return result.canceled ? null : result.filePath || null;
    },
  );
}
