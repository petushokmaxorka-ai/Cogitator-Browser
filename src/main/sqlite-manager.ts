// SQLite via sqlite3 CLI — no native module rebuild required

import { existsSync } from 'fs';
import { runCommand, commandExists } from './exec-util';

export interface SQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
  error?: string;
}

export class SQLiteManager {
  private dbPath: string | null = null;

  async open(dbPath: string): Promise<void> {
    if (!existsSync(dbPath)) {
      throw new Error('Database file not found: ' + dbPath);
    }
    if (!(await commandExists('sqlite3'))) {
      throw new Error('sqlite3 CLI not found — install sqlite package');
    }
    this.dbPath = dbPath;
  }

  getPath(): string | null {
    return this.dbPath;
  }

  async query(sql: string): Promise<SQLResult> {
    if (!this.dbPath) throw new Error('No database open');
    try {
      const out = await runCommand('sqlite3', ['-json', this.dbPath, sql]);
      if (!out) return { columns: [], rows: [] };
      const parsed = JSON.parse(out) as Record<string, unknown>[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { columns: [], rows: [] };
      }
      const columns = Object.keys(parsed[0] ?? {});
      return { columns, rows: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { columns: [], rows: [], error: msg };
    }
  }

  async listTables(): Promise<string[]> {
    const res = await this.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return res.rows.map((r) => String(r.name ?? ''));
  }

  async tableSchema(table: string): Promise<SQLResult> {
    const safe = table.replace(/[^a-zA-Z0-9_]/g, '');
    return this.query(`PRAGMA table_info(${safe})`);
  }
}

export default SQLiteManager;
