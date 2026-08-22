// SSH command execution via ssh CLI (batch commands; no shell=True)

import { runCommand } from './exec-util';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  secret: string;
}

export class SSHManager {
  private config: SSHConfig | null = null;

  setConfig(config: SSHConfig): void {
    this.config = config;
  }

  isConnected(): boolean {
    return this.config !== null;
  }

  disconnect(): void {
    this.config = null;
  }

  private baseArgs(): string[] {
    if (!this.config) throw new Error('Not connected');
    const args = [
      '-p',
      String(this.config.port),
      '-o',
      'BatchMode=no',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      'ConnectTimeout=10',
    ];
    if (this.config.authType === 'key' && this.config.secret) {
      args.push('-i', this.config.secret);
    }
    args.push(`${this.config.username}@${this.config.host}`);
    return args;
  }

  async testConnection(config: SSHConfig): Promise<boolean> {
    const args = [
      '-p',
      String(config.port),
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      'ConnectTimeout=8',
    ];
    if (config.authType === 'key' && config.secret) {
      args.push('-i', config.secret);
    }
    args.push(`${config.username}@${config.host}`, 'echo', 'ok');
    try {
      const out = await runCommand('ssh', args, { timeoutMs: 15_000 });
      return out.includes('ok');
    } catch {
      return false;
    }
  }

  async exec(command: string): Promise<string> {
    const args = [...this.baseArgs(), command];
    return runCommand('ssh', args, { timeoutMs: 60_000 });
  }
}

export default SSHManager;
