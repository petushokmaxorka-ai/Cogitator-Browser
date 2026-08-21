// ═══ Mens Machinae bridge — bibliotheca context for Cogitator AI ═══

import type { ChatMessage } from '../shared/types';
import { DEFAULT_MENS_URL, MENS_CONTEXT_MAX_CHARS } from '../shared/constants';

export interface SemanticSearchHit {
  title?: string;
  file_path?: string;
  snippet?: string;
  score?: number;
}

export type VaultSearchMethod = 'hybrid' | 'semantic' | 'none';

export interface SemanticSearchResult {
  online: boolean;
  results: SemanticSearchHit[];
  method: VaultSearchMethod;
  /** True when hybrid failed and semantic was used instead */
  fallback?: boolean;
  /** Hint when embeddings/hybrid are unavailable */
  hint?: string;
}

export interface MensContextResult {
  online: boolean;
  block: string;
  sources: string[];
}

interface SemanticHit {
  title?: string;
  file_path?: string;
  snippet?: string;
  score?: number;
}

function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') {
      return messages[i].content.trim();
    }
  }
  return '';
}

async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  const res = await fetchJsonResponse<T>(url, timeoutMs);
  return res?.ok ? res.data : null;
}

async function fetchJsonResponse<T>(
  url: string,
  timeoutMs = 6000,
): Promise<{ ok: boolean; status: number; data: T | null } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return { ok: false, status: res.status, data: null };
    }
    return { ok: true, status: res.status, data: (await res.json()) as T };
  } catch {
    return null;
  }
}

export class MensBridge {
  constructor(private baseUrl: string = DEFAULT_MENS_URL) {}

  async checkStatus(): Promise<boolean> {
    const data = await fetchJson<{ status?: string }>(`${this.baseUrl}/health`, 3000);
    return data?.status === 'ok';
  }

  async semanticSearch(query: string, limit = 8): Promise<SemanticSearchResult> {
    const online = await this.checkStatus();
    if (!online || !query.trim()) {
      return { online, results: [], method: 'none' };
    }

    const q = encodeURIComponent(query.slice(0, 200));
    const hybrid = await fetchJsonResponse<{ results?: SemanticHit[] }>(
      `${this.baseUrl}/search/hybrid?q=${q}&limit=${limit}`,
      12000,
    );

    if (hybrid?.ok && hybrid.data) {
      return { online, results: hybrid.data.results ?? [], method: 'hybrid' };
    }

    const semantic = await fetchJsonResponse<{ results?: SemanticHit[] }>(
      `${this.baseUrl}/search/semantic?q=${q}&limit=${limit}`,
      12000,
    );

    if (semantic?.ok && semantic.data) {
      return {
        online,
        results: semantic.data.results ?? [],
        method: 'semantic',
        fallback: true,
        hint: 'Hybrid unavailable — semantic-only (embeddings may need repair)',
      };
    }

    const hybridFailed = hybrid?.status === 502 || semantic?.status === 502;
    return {
      online,
      results: [],
      method: 'none',
      fallback: Boolean(hybrid?.ok === false && semantic?.ok === false),
      hint: hybridFailed
        ? 'Vault search offline — run scripts/repair-ollama-embeddings.sh'
        : undefined,
    };
  }

  async buildContextBlock(userQuery: string): Promise<MensContextResult> {
    const online = await this.checkStatus();
    if (!online || !userQuery.trim()) {
      return { online, block: '', sources: [] };
    }

    const parts: string[] = [];
    const sources: string[] = [];

    const digest = await fetchJson<{
      date?: string;
      inbox?: { count?: number; items?: Array<{ title?: string; path?: string }> };
      recent_notes?: { count?: number; items?: Array<{ title?: string; file_path?: string }> };
    }>(`${this.baseUrl}/vault/digest`, 8000);

    if (digest) {
      const inbox = digest.inbox?.items?.slice(0, 3) ?? [];
      const recent = digest.recent_notes?.items?.slice(0, 5) ?? [];
      if (inbox.length || recent.length) {
        parts.push('═══ BIBLIOTHECA DIGEST (Mens) ═══');
        if (digest.date) parts.push(`Дата: ${digest.date}`);
        for (const item of inbox) {
          if (item.title) parts.push(`Inbox: ${item.title}`);
        }
        for (const item of recent) {
          if (item.title) {
            parts.push(`Note: ${item.title}`);
            if (item.file_path) sources.push(item.file_path);
          }
        }
      }
    }

    const q = encodeURIComponent(userQuery.slice(0, 200));
    const semantic = await fetchJson<{
      results?: SemanticHit[];
    }>(`${this.baseUrl}/search/semantic?q=${q}&limit=5`, 12000);

    const hits = semantic?.results ?? [];
    if (hits.length) {
      parts.push('═══ SEMANTIC VAULT MATCHES ═══');
      for (const hit of hits) {
        const title = hit.title ?? hit.file_path ?? 'note';
        const snippet = (hit.snippet ?? '').replace(/\s+/g, ' ').trim().slice(0, 280);
        parts.push(`• ${title}${snippet ? `: ${snippet}` : ''}`);
        if (hit.file_path) sources.push(hit.file_path);
      }
    }

    let block = parts.join('\n');
    if (block.length > MENS_CONTEXT_MAX_CHARS) {
      block = `${block.slice(0, MENS_CONTEXT_MAX_CHARS)}\n[…truncated]`;
    }

    return { online, block, sources: [...new Set(sources)] };
  }

  async enrichMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    const query = lastUserMessage(messages);
    const { block } = await this.buildContextBlock(query);
    if (!block) return messages;

    const prefix = `${block}\n\nИспользуй контекст bibliotheca выше, если он релевантен запросу.\n`;
    const out = messages.map((m) => ({ ...m }));
    const sysIdx = out.findIndex((m) => m.role === 'system');
    if (sysIdx >= 0) {
      out[sysIdx] = {
        ...out[sysIdx],
        content: `${out[sysIdx].content}\n\n${prefix}`,
      };
    } else {
      out.unshift({
        role: 'system',
        content: prefix,
        timestamp: Date.now(),
      });
    }
    return out;
  }
}

export function enrichMessagesWithMensContext(
  messages: ChatMessage[],
  bridge: MensBridge,
): Promise<ChatMessage[]> {
  return bridge.enrichMessages(messages);
}
