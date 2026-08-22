import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function runCommand(
  cmd: string,
  args: string[],
  options?: { cwd?: string; maxBuffer?: number; timeoutMs?: number },
): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, {
    cwd: options?.cwd,
    maxBuffer: options?.maxBuffer ?? 16 * 1024 * 1024,
    timeout: options?.timeoutMs ?? 120_000,
  });
  return typeof stdout === 'string' ? stdout.trim() : String(stdout).trim();
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await runCommand('which', [cmd], { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}
