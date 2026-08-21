// Anathemetron pulse — read-only snapshot from .heretic consciousness files

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join, resolve } from 'path';

export interface MindPulse {
  available: boolean;
  mood: string;
  energy: number | null;
  obsession: string | null;
  lifeRunning: boolean;
  lastThoughtAgeSec: number | null;
  socialBattery: number | null;
  updatedTs: string | null;
}

function hereticRoot(): string {
  return process.env.HERETIC_HOME || join(homedir(), 'heretic-os');
}

async function readJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function flattenConsciousness(raw: Record<string, unknown> | null): Record<string, unknown> {
  if (!raw) return {};
  if (raw.schema_version === 2 && raw.anathemetron && typeof raw.anathemetron === 'object') {
    return raw.anathemetron as Record<string, unknown>;
  }
  return raw;
}

function thoughtAgeSec(lastThoughtTs: unknown): number | null {
  const ts = asNumber(lastThoughtTs);
  if (ts === null) return null;
  const age = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  return age;
}

export async function readMindPulse(): Promise<MindPulse> {
  const root = resolve(hereticRoot());
  const consciousnessPath = join(root, '.heretic', 'consciousness_state.json');
  const lifePath = join(root, '.heretic', 'anathemetron_life.json');

  const empty: MindPulse = {
    available: false,
    mood: 'unknown',
    energy: null,
    obsession: null,
    lifeRunning: false,
    lastThoughtAgeSec: null,
    socialBattery: null,
    updatedTs: null,
  };

  const hasConsciousness = existsSync(consciousnessPath);
  const hasLife = existsSync(lifePath);
  if (!hasConsciousness && !hasLife) {
    return empty;
  }

  const con = flattenConsciousness(await readJson(consciousnessPath));
  const life = await readJson(lifePath);

  const mood =
    asString(con.mood) ?? asString(life?.mood) ?? 'unknown';
  const energy = asNumber(con.energy) ?? asNumber(life?.energy);
  const obsession =
    asString(con.current_obsession) ?? asString(life?.current_obsession);
  const lifeRunning = Boolean(life?.life_running);
  const lastThoughtAgeSec = thoughtAgeSec(con.last_thought_ts);
  const socialBattery = asNumber(con.social_battery);
  const updatedTs =
    asString(con.updated_ts) ??
    asString(life?.updated_ts) ??
    (hasConsciousness || hasLife ? new Date().toISOString() : null);

  return {
    available: true,
    mood,
    energy,
    obsession,
    lifeRunning,
    lastThoughtAgeSec,
    socialBattery,
    updatedTs,
  };
}
