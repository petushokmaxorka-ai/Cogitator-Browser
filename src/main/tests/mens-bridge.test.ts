import { describe, expect, it } from 'vitest';
import { MensBridge } from '../mens-bridge';
import type { ChatMessage } from '../../shared/types';

describe('MensBridge', () => {
  it('enrichMessages prepends bibliotheca block to system prompt', async () => {
    const bridge = new MensBridge('http://127.0.0.1:1');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      if (url.includes('/vault/digest')) {
        return new Response(
          JSON.stringify({
            date: '2026-06-27',
            inbox: { items: [{ title: 'Test inbox' }] },
            recent_notes: { items: [] },
          }),
          { status: 200 },
        );
      }
      if (url.includes('/search/semantic')) {
        return new Response(
          JSON.stringify({
            results: [{ title: 'Architecture', file_path: 'bibliotheca/01_ARCHITECTURE.md', snippet: 'Mens gateway' }],
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'base', timestamp: 1 },
        { role: 'user', content: 'What is Mens?', timestamp: 2 },
      ];
      const enriched = await bridge.enrichMessages(messages);
      expect(enriched[0].content).toContain('BIBLIOTHECA DIGEST');
      expect(enriched[0].content).toContain('SEMANTIC VAULT MATCHES');
      expect(enriched[0].content).toContain('Architecture');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('enrichMessages is no-op when Mens offline', async () => {
    const bridge = new MensBridge('http://127.0.0.1:1');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    try {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'hello', timestamp: 1 },
      ];
      const enriched = await bridge.enrichMessages(messages);
      expect(enriched).toEqual(messages);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('semanticSearch falls back to semantic when hybrid returns 502', async () => {
    const bridge = new MensBridge('http://127.0.0.1:1');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      if (url.includes('/search/hybrid')) {
        return new Response('embeddings down', { status: 502 });
      }
      if (url.includes('/search/semantic')) {
        return new Response(
          JSON.stringify({
            results: [{ title: 'Fallback note', file_path: 'bibliotheca/note.md', snippet: 'ok' }],
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    try {
      const res = await bridge.semanticSearch('mens gateway', 5);
      expect(res.method).toBe('semantic');
      expect(res.fallback).toBe(true);
      expect(res.results).toHaveLength(1);
      expect(res.results[0]?.title).toBe('Fallback note');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
