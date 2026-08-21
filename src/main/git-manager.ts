// ═══════════════════════════════════════════════════════════
// Git Manager — real git CLI integration (no shell=True)
// ═══════════════════════════════════════════════════════════

import { existsSync } from 'fs';
import { join } from 'path';
import { runCommand } from './exec-util';

export interface GitStatusEntry {
  status: 'M' | 'A' | 'D' | '?' | 'R';
  file: string;
  staged: boolean;
}

export interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBranchInfo {
  branches: string[];
  current: string;
}

function parsePorcelain(output: string): GitStatusEntry[] {
  const entries: GitStatusEntry[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const index = line[0];
    const workTree = line[1];
    const file = line.slice(3).trim();
    if (!file) continue;

    if (index === '?' && workTree === '?') {
      entries.push({ status: '?', file, staged: false });
      continue;
    }

    const staged = index !== ' ' && index !== '?';
    const wtChanged = workTree !== ' ' && workTree !== '?';

    let status: GitStatusEntry['status'] = 'M';
    const code = staged ? index : workTree;
    if (code === 'A') status = 'A';
    else if (code === 'D') status = 'D';
    else if (code === 'R') status = 'R';
    else if (code === '?') status = '?';
    else status = 'M';

    if (staged) {
      entries.push({ status, file, staged: true });
    }
    if (wtChanged && (!staged || workTree !== index)) {
      entries.push({ status: workTree === 'D' ? 'D' : 'M', file, staged: false });
    }
  }
  return entries;
}

export class GitManager {
  private repoPath: string | null = null;

  async setRepoPath(path: string): Promise<boolean> {
    const gitDir = join(path, '.git');
    if (!existsSync(gitDir)) {
      throw new Error('Not a git repository: ' + path);
    }
    this.repoPath = path;
    return true;
  }

  getRepoPath(): string | null {
    return this.repoPath;
  }

  private requireRepo(): string {
    if (!this.repoPath) throw new Error('No repository selected');
    return this.repoPath;
  }

  private async git(args: string[]): Promise<string> {
    return runCommand('git', args, { cwd: this.requireRepo() });
  }

  async getStatus(): Promise<{ entries: GitStatusEntry[]; branch: string }> {
    const branch = await this.git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const out = await this.git(['status', '--porcelain=v1']);
    return { entries: parsePorcelain(out), branch };
  }

  async add(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.git(['add', '--', ...files]);
  }

  async reset(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.git(['reset', 'HEAD', '--', ...files]);
  }

  async discard(file: string): Promise<void> {
    await this.git(['checkout', '--', file]);
  }

  async commit(message: string): Promise<string> {
    const hash = await this.git(['commit', '-m', message]);
    const match = hash.match(/\[.+?\s([0-9a-f]+)\]/i);
    return match?.[1] ?? hash.slice(0, 7);
  }

  async getLog(maxCount = 20): Promise<GitLogEntry[]> {
    const out = await this.git([
      'log',
      `-n${maxCount}`,
      '--pretty=format:%h|%s|%an|%ar',
    ]);
    if (!out) return [];
    return out.split('\n').map((line) => {
      const [hash, message, author, date] = line.split('|');
      return { hash: hash ?? '', message: message ?? '', author: author ?? '', date: date ?? '' };
    });
  }

  async getBranches(): Promise<GitBranchInfo> {
    const out = await this.git(['branch', '--list']);
    const branches: string[] = [];
    let current = 'main';
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('* ')) {
        current = trimmed.slice(2);
        branches.push(current);
      } else {
        branches.push(trimmed);
      }
    }
    return { branches, current };
  }

  async checkout(branch: string): Promise<void> {
    await this.git(['checkout', branch]);
  }

  async createBranch(branch: string): Promise<void> {
    await this.git(['checkout', '-b', branch]);
  }

  async pull(): Promise<string> {
    return this.git(['pull']);
  }

  async push(): Promise<string> {
    return this.git(['push']);
  }

  async clone(url: string, targetPath: string): Promise<void> {
    await runCommand('git', ['clone', url, targetPath]);
    this.repoPath = targetPath;
  }

  async init(dirPath: string): Promise<void> {
    await runCommand('git', ['init'], { cwd: dirPath });
    this.repoPath = dirPath;
  }

  async getDiff(file?: string): Promise<string> {
    const args = file ? ['diff', '--', file] : ['diff'];
    return this.git(args);
  }
}

export default GitManager;
