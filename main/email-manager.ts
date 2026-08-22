// ═══════════════════════════════════════════════════════════
// Email Manager — Main Process
// IMAP/SMTP bridge for Noosphere Mail
// ═══════════════════════════════════════════════════════════

import Imap from 'imap';
import { createTransport, type Transporter } from 'nodemailer';
import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import { simpleParser } from 'mailparser';
import { join } from 'path';
import { readFile, writeFile, mkdir, access } from 'fs/promises';

// ── Types ──────────────────────────────────────────────────

export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string;
}

export interface EmailMessage {
  id: string;
  uid: number;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  subject: string;
  body: string;
  date: number;
  read: boolean;
  starred: boolean;
  folder: string;
  attachments: string[];
}

export interface EmailFolder {
  path: string;
  name: string;
  count: number;
  unread: number;
}

// ── Manager ────────────────────────────────────────────────

const ACCOUNTS_FILE = 'email-accounts.json';

// Simple obfuscation: base64 — not encryption, but better than plaintext in JSON
const obfuscate = (str: string): string => Buffer.from(str).toString('base64');
const deobfuscate = (str: string): string => Buffer.from(str, 'base64').toString('utf-8');

export class EmailManager {
  private window: BrowserWindow | null = null;
  private accounts = new Map<string, EmailAccount>();
  private clients = new Map<string, Imap>();
  private dataDir: string = '';

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  // ── Persistence ─────────────────────────────────────────

  async init(): Promise<void> {
    this.dataDir = join(app.getPath('userData'), 'email');
    try {
      await access(this.dataDir);
    } catch {
      await mkdir(this.dataDir, { recursive: true });
    }
    await this.loadAccounts();
  }

  private get accountsPath(): string {
    return join(this.dataDir, ACCOUNTS_FILE);
  }

  private async loadAccounts(): Promise<void> {
    try {
      const raw = await readFile(this.accountsPath, 'utf-8');
      const parsed = JSON.parse(raw) as Array<EmailAccount & { _obf?: boolean }>;
      for (const entry of parsed) {
        const account: EmailAccount = {
          ...entry,
          password: entry._obf ? deobfuscate(entry.password) : entry.password,
        };
        this.accounts.set(account.id, account);
      }
      console.log(`[EmailManager] Loaded ${this.accounts.size} account(s)`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('[EmailManager] Failed to load accounts:', err.message);
      }
    }
  }

  private async saveAccounts(): Promise<void> {
    try {
      const payload = Array.from(this.accounts.values()).map((a) => ({
        ...a,
        password: obfuscate(a.password),
        _obf: true,
      }));
      await writeFile(this.accountsPath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[EmailManager] Failed to save accounts:', err.message);
    }
  }

  // ── Account Management ──────────────────────────────────

  async addAccount(account: Omit<EmailAccount, 'id'>): Promise<EmailAccount> {
    const id = `email_${Date.now()}`;
    const fullAccount: EmailAccount = { ...account, id };
    this.accounts.set(id, fullAccount);
    await this.saveAccounts();
    return fullAccount;
  }

  async removeAccount(id: string): Promise<void> {
    const client = this.clients.get(id);
    if (client) {
      client.end();
      this.clients.delete(id);
    }
    this.accounts.delete(id);
    await this.saveAccounts();
  }

  getAccounts(): EmailAccount[] {
    return Array.from(this.accounts.values()).map((a) => ({
      ...a,
      password: '', // Never expose password
    }));
  }

  // ── IMAP: Connect & List Folders ────────────────────────

  async connectIMAP(accountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');

    return new Promise((resolve, reject) => {
      const client = new Imap({
        host: account.imapHost,
        port: account.imapPort,
        tls: account.imapSecure,
        user: account.username,
        password: account.password,
        connTimeout: 10000,
        authTimeout: 10000,
      });

      client.once('ready', () => {
        this.clients.set(accountId, client);
        resolve();
      });

      client.once('error', (err: Error) => {
        reject(err);
      });

      client.connect();
    });
  }

  async disconnectIMAP(accountId: string): Promise<void> {
    const client = this.clients.get(accountId);
    if (client) {
      client.end();
      this.clients.delete(accountId);
    }
  }

  async listFolders(accountId: string): Promise<EmailFolder[]> {
    const client = this.clients.get(accountId);
    if (!client) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      client.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }

        const folders: EmailFolder[] = [];
        const walk = (obj: any, prefix = '') => {
          for (const [name, box] of Object.entries(obj)) {
            const path = prefix ? `${prefix}${box.delimiter || '/'}${name}` : name;
            folders.push({
              path,
              name,
              count: (box as any).messages?.total || 0,
              unread: (box as any).messages?.new || 0,
            });
            if ((box as any).children) {
              walk((box as any).children, path);
            }
          }
        };

        walk(boxes);
        resolve(folders);
      });
    });
  }

  // ── IMAP: Fetch Messages ────────────────────────────────

  async fetchMessages(
    accountId: string,
    folderPath: string,
    limit = 50
  ): Promise<EmailMessage[]> {
    const client = this.clients.get(accountId);
    if (!client) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      client.openBox(folderPath, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const total = box.messages.total;
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:${total}`;

        const f = client.fetch(range, { bodies: '', struct: true });
        const messages: EmailMessage[] = [];
        let processed = 0;

        f.on('message', (msg, seqno) => {
          let uid = 0;
          let bodyBuffer = Buffer.alloc(0);

          msg.on('attributes', (attrs) => {
            uid = attrs.uid;
          });

          msg.on('body', (stream) => {
            stream.on('data', (chunk: Buffer) => {
              bodyBuffer = Buffer.concat([bodyBuffer, chunk]);
            });
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(bodyBuffer);
              messages.push({
                id: `${accountId}_${uid}`,
                uid,
                from: {
                  name: parsed.from?.value[0]?.name || '',
                  address: parsed.from?.value[0]?.address || '',
                },
                to: (parsed.to?.value || []).map((t: any) => ({
                  name: t.name || '',
                  address: t.address || '',
                })),
                subject: parsed.subject || '',
                body: parsed.text || parsed.html || '',
                date: parsed.date?.getTime() || Date.now(),
                read: true, // Simplified
                starred: false,
                folder: folderPath,
                attachments: [],
              });
            } catch {
              // Skip unparseable messages
            }
            processed++;
            if (processed >= limit || messages.length >= limit) {
              resolve(messages.slice(0, limit));
            }
          });
        });

        f.once('error', (err: Error) => reject(err));
        f.once('end', () => {
          if (messages.length < limit) {
            resolve(messages);
          }
        });
      });
    });
  }

  // ── SMTP: Send Message ──────────────────────────────────

  async sendMessage(
    accountId: string,
    to: string,
    subject: string,
    body: string
  ): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('Account not found');

    const transporter: Transporter = createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecure,
      auth: {
        user: account.username,
        pass: account.password,
      },
    });

    await transporter.sendMail({
      from: `"${account.name}" <${account.email}>`,
      to,
      subject,
      text: body,
    });
  }
}
