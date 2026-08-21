// Archive listing/extraction via unzip/tar CLI

import { existsSync } from 'fs';
import { basename } from 'path';
import { runCommand, commandExists } from './exec-util';

export interface ArchiveEntry {
  name: string;
  size: string;
}

export async function listArchive(archivePath: string): Promise<ArchiveEntry[]> {
  if (!existsSync(archivePath)) throw new Error('Archive not found');
  const lower = archivePath.toLowerCase();

  if (lower.endsWith('.zip')) {
    const out = await runCommand('unzip', ['-l', archivePath]);
    return out
      .split('\n')
      .slice(3, -2)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        const size = parts[0] ?? '0';
        const name = parts.slice(3).join(' ') || (parts[parts.length - 1] ?? '');
        return { name, size };
      })
      .filter((e) => e.name);
  }

  if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    const out = await runCommand('tar', ['-tvf', archivePath]);
    return out.split('\n').filter(Boolean).map((line) => {
      const parts = line.trim().split(/\s+/);
      const size = parts[2] ?? '0';
      const name = parts.slice(5).join(' ') || basename(archivePath);
      return { name, size };
    });
  }

  throw new Error('Unsupported archive format');
}

export async function extractArchive(archivePath: string, destDir: string): Promise<string> {
  if (!existsSync(archivePath)) throw new Error('Archive not found');
  const lower = archivePath.toLowerCase();

  if (lower.endsWith('.zip')) {
    if (!(await commandExists('unzip'))) throw new Error('unzip not found');
    await runCommand('unzip', ['-o', archivePath, '-d', destDir]);
    return destDir;
  }

  if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    await runCommand('tar', ['-xf', archivePath, '-C', destDir]);
    return destDir;
  }

  throw new Error('Unsupported archive format');
}

export async function extractArchiveEntries(
  archivePath: string,
  destDir: string,
  entryNames: string[],
): Promise<string> {
  if (entryNames.length === 0) throw new Error('No entries selected');
  if (!existsSync(archivePath)) throw new Error('Archive not found');
  const lower = archivePath.toLowerCase();

  if (lower.endsWith('.zip')) {
    if (!(await commandExists('unzip'))) throw new Error('unzip not found');
    await runCommand('unzip', ['-o', archivePath, ...entryNames, '-d', destDir]);
    return destDir;
  }

  if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    await runCommand('tar', ['-xf', archivePath, '-C', destDir, ...entryNames]);
    return destDir;
  }

  throw new Error('Selective extract supported for .zip and .tar.gz only');
}

export async function readArchiveEntry(archivePath: string, entryName: string): Promise<string> {
  if (!existsSync(archivePath)) throw new Error('Archive not found');
  const lower = archivePath.toLowerCase();

  if (lower.endsWith('.zip')) {
    if (!(await commandExists('unzip'))) throw new Error('unzip not found');
    return runCommand('unzip', ['-p', archivePath, entryName], { maxBuffer: 512 * 1024 });
  }

  throw new Error('Entry preview supported for .zip only');
}

export type ArchiveCreateFormat = 'zip' | 'tar.gz' | '7z';

export async function createArchive(
  outputPath: string,
  sourcePaths: string[],
  format: ArchiveCreateFormat,
): Promise<string> {
  if (sourcePaths.length === 0) throw new Error('No source files selected');
  for (const src of sourcePaths) {
    if (!existsSync(src)) throw new Error(`Source not found: ${src}`);
  }

  const lower = outputPath.toLowerCase();

  if (format === 'zip') {
    if (!(await commandExists('zip'))) throw new Error('zip CLI not found');
    if (!lower.endsWith('.zip')) throw new Error('Output path must end with .zip');
    await runCommand('zip', ['-j', outputPath, ...sourcePaths]);
    return outputPath;
  }

  if (format === 'tar.gz') {
    if (!lower.endsWith('.tar.gz') && !lower.endsWith('.tgz')) {
      throw new Error('Output path must end with .tar.gz or .tgz');
    }
    await runCommand('tar', ['-czf', outputPath, ...sourcePaths]);
    return outputPath;
  }

  if (format === '7z') {
    if (!(await commandExists('7z')) && !(await commandExists('7za'))) {
      throw new Error('7z / 7za CLI not found');
    }
    const bin = (await commandExists('7z')) ? '7z' : '7za';
    if (!lower.endsWith('.7z')) throw new Error('Output path must end with .7z');
    await runCommand(bin, ['a', outputPath, ...sourcePaths]);
    return outputPath;
  }

  throw new Error('Unsupported archive format');
}
