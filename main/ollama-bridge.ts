// ═══════════════════════════════════════════════════════════
// Ollama / llama-server Bridge — Main Process
// Default: Anathemetron on llama-server :11436
// ═══════════════════════════════════════════════════════════

import { BrowserWindow } from 'electron';
import { Ollama } from 'ollama';
import type { ChatMessage, LlmProvider, OllamaConfig } from '../shared/types';
import {
  DEFAULT_ANATHEMETRON_MODEL,
  DEFAULT_LLAMA_SERVER_URL,
  DEFAULT_LLM_PROVIDER,
  DEFAULT_OLLAMA_HOST,
} from '../shared/constants';
import {
  llamaServerRoot,
  normalizeLlmBaseUrl,
  parseOpenAiStreamDelta,
} from './llm-bridge-helpers';

export class OllamaBridge {
  private config: OllamaConfig = {
    host: DEFAULT_LLAMA_SERVER_URL,
    model: DEFAULT_ANATHEMETRON_MODEL,
    provider: DEFAULT_LLM_PROVIDER,
  };
  private ollama: Ollama = new Ollama({ host: DEFAULT_OLLAMA_HOST });
  private abortController: AbortController | null = null;

  private provider(): LlmProvider {
    return this.config.provider ?? DEFAULT_LLM_PROVIDER;
  }

  setConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.provider() === 'ollama') {
      this.ollama = new Ollama({ host: this.config.host || DEFAULT_OLLAMA_HOST });
    }
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  async checkStatus(): Promise<boolean> {
    if (this.provider() === 'llama-server') {
      try {
        const root = llamaServerRoot(normalizeLlmBaseUrl(this.config.host, 'llama-server'));
        const res = await fetch(`${root}/health`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return true;
        const models = await fetch(
          `${normalizeLlmBaseUrl(this.config.host, 'llama-server')}/models`,
          { signal: AbortSignal.timeout(4000) },
        );
        return models.ok;
      } catch {
        return false;
      }
    }
    try {
      await this.ollama.ps();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    if (this.provider() === 'llama-server') {
      try {
        const res = await fetch(
          `${normalizeLlmBaseUrl(this.config.host, 'llama-server')}/models`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!res.ok) return [];
        const body = (await res.json()) as { data?: Array<{ id?: string }> };
        return (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
      } catch {
        return [];
      }
    }
    try {
      const response = await this.ollama.list();
      return response.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    window: BrowserWindow,
  ): Promise<string> {
    if (this.provider() === 'llama-server') {
      return this.chatLlamaServer(messages, model, window);
    }
    return this.chatOllama(messages, model, window);
  }

  private async chatOllama(
    messages: ChatMessage[],
    model: string,
    window: BrowserWindow,
  ): Promise<string> {
    this.abortController = new AbortController();

    try {
      const stream = await this.ollama.chat({
        model: model || this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        if (this.abortController.signal.aborted) break;
        const content = chunk.message?.content || '';
        fullResponse += content;
        this.emitChunk(window, content, false);
      }
      this.emitChunk(window, '', true);
      return fullResponse;
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  private async chatLlamaServer(
    messages: ChatMessage[],
    model: string,
    window: BrowserWindow,
  ): Promise<string> {
    this.abortController = new AbortController();
    const base = normalizeLlmBaseUrl(this.config.host, 'llama-server');

    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || this.config.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          temperature: 0.45,
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`llama-server HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      if (!res.body) {
        throw new Error('llama-server: empty response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (this.abortController.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const delta = parseOpenAiStreamDelta(line);
          if (delta === null) continue;
          if (delta === '') continue;
          fullResponse += delta;
          this.emitChunk(window, delta, false);
        }
      }

      this.emitChunk(window, '', true);
      return fullResponse;
    } catch (error) {
      console.error('llama-server chat error:', error);
      throw error;
    }
  }

  private emitChunk(window: BrowserWindow, chunk: string, done: boolean): void {
    if (window && !window.isDestroyed()) {
      window.webContents.send('ollama:stream-chunk', { chunk, done });
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}
