// ═══ LLM URL helpers (testable) ═══

import type { LlmProvider } from '../shared/types';

export function normalizeLlmBaseUrl(host: string, provider: LlmProvider): string {
  const trimmed = host.replace(/\/+$/, '');
  if (provider === 'llama-server') {
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
  }
  return trimmed.replace(/\/v1$/, '');
}

export function llamaServerRoot(host: string): string {
  return host.replace(/\/v1\/?$/, '');
}

import { ANATHEMETRON_SWARM_MODELS } from '../shared/constants';

export function pickDefaultModel(models: string[], preferred: string): string {
  if (models.includes(preferred)) return preferred;
  const exact = ANATHEMETRON_SWARM_MODELS.find((name) => models.includes(name));
  if (exact) return exact;
  const fuzzy = models.find(
    (m) =>
      ANATHEMETRON_SWARM_MODELS.some((name) => m.toLowerCase().includes(name.toLowerCase())) ||
      m.toLowerCase().includes('anathemetron'),
  );
  return fuzzy ?? models[0] ?? preferred;
}

export function parseOpenAiStreamDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === '[DONE]') return '';
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}
