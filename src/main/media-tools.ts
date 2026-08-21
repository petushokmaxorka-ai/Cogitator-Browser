// Media download/extract via yt-dlp and ffmpeg CLI

import { join } from 'path';
import { app } from 'electron';
import { runCommand, commandExists } from './exec-util';

export interface VideoFormat {
  id: string;
  label: string;
  ext: string;
  resolution?: string;
}

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnail?: string;
  formats: VideoFormat[];
}

async function requireYtDlp(): Promise<void> {
  if (!(await commandExists('yt-dlp')) && !(await commandExists('youtube-dl'))) {
    throw new Error('yt-dlp not found — install: pacman -S yt-dlp');
  }
}

async function ytDlpBin(): Promise<string> {
  return (await commandExists('yt-dlp')) ? 'yt-dlp' : 'youtube-dl';
}

export async function analyzeVideo(url: string): Promise<VideoInfo> {
  await requireYtDlp();
  const bin = await ytDlpBin();
  const out = await runCommand(bin, ['-J', '--no-playlist', url], { timeoutMs: 120_000 });
  const data = JSON.parse(out) as {
    title?: string;
    duration?: number;
    thumbnail?: string;
    formats?: Array<{ format_id?: string; ext?: string; height?: number; format_note?: string }>;
  };

  const formats: VideoFormat[] = (data.formats ?? [])
    .filter((f) => f.ext && f.format_id)
    .slice(-20)
    .map((f) => ({
      id: f.format_id!,
      label: f.format_note ?? `${f.height ?? '?'}p ${f.ext}`,
      ext: f.ext!,
      resolution: f.height ? `${f.height}p` : undefined,
    }));

  return {
    title: data.title ?? 'Unknown',
    duration: data.duration ?? 0,
    thumbnail: data.thumbnail,
    formats: formats.length ? formats : [{ id: 'best', label: 'Best quality', ext: 'mp4' }],
  };
}

export async function downloadVideo(url: string, formatId: string): Promise<string> {
  await requireYtDlp();
  const bin = await ytDlpBin();
  const dest = join(app.getPath('downloads'), '%(title)s.%(ext)s');
  await runCommand(bin, ['-f', formatId, '-o', dest, '--no-playlist', url], {
    timeoutMs: 600_000,
  });
  return app.getPath('downloads');
}

export async function extractAudio(inputPath: string, format: string, bitrate: string): Promise<string> {
  if (!(await commandExists('ffmpeg'))) {
    throw new Error('ffmpeg not found');
  }
  const outPath = inputPath.replace(/\.[^.]+$/, `.${format}`);
  await runCommand('ffmpeg', ['-i', inputPath, '-vn', '-b:a', bitrate, '-y', outPath], {
    timeoutMs: 600_000,
  });
  return outPath;
}
