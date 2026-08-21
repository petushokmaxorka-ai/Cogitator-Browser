// ═══════════════════════════════════════════════════════════
// COGITATOR BROWSER — LLM Config Store
// ═══════════════════════════════════════════════════════════
// Persists the AI endpoint (host/model/provider) across restarts
// in userData/llm-config.json. Without this the Settings panel
// config was memory-only and lost on every relaunch.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import type { OllamaConfig, LlmProvider } from '../shared/types';

const FILE_NAME = 'llm-config.json';

function configPath(): string {
  return join(app.getPath('userData'), FILE_NAME);
}

/** Load persisted config; null when absent/corrupt (defaults apply). */
export function loadLlmConfig(): Partial<OllamaConfig> | null {
  try {
    if (!existsSync(configPath())) return null;
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Record<string, unknown>;
    if (typeof raw !== 'object' || raw === null) return null;
    const cfg: Partial<OllamaConfig> = {};
    if (typeof raw.host === 'string' && raw.host.trim()) cfg.host = raw.host.trim();
    if (typeof raw.model === 'string' && raw.model.trim()) cfg.model = raw.model.trim();
    if (raw.provider === 'ollama' || raw.provider === 'llama-server') {
      cfg.provider = raw.provider as LlmProvider;
    }
    return Object.keys(cfg).length ? cfg : null;
  } catch (err) {
    console.error('[LLM-Config] load failed:', err);
    return null;
  }
}

/** Persist config (validated fields only); never throws. */
export function saveLlmConfig(cfg: Partial<OllamaConfig>): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true });
    const clean: Partial<OllamaConfig> = {};
    if (typeof cfg.host === 'string' && cfg.host.trim()) clean.host = cfg.host.trim();
    if (typeof cfg.model === 'string' && cfg.model.trim()) clean.model = cfg.model.trim();
    if (cfg.provider === 'ollama' || cfg.provider === 'llama-server') clean.provider = cfg.provider;
    writeFileSync(configPath(), JSON.stringify(clean, null, 2));
  } catch (err) {
    console.error('[LLM-Config] save failed:', err);
  }
}
