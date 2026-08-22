// ═══ useOllama ═══
/**
 * Custom hook for interacting with the local Ollama LLM service.
 * Manages model listing, configuration, chat streaming, and connection status.
 *
 * Designed for the Dark Mechanicus aesthetic — cold, relentless, machine-like AI communion.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, OllamaConfig } from '../../shared/types';
import { DEFAULT_LLAMA_SERVER_URL, DEFAULT_LLM_PROVIDER, DEFAULT_ANATHEMETRON_MODEL } from '../../shared/constants';

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface UseOllamaReturn {
  /** All available Ollama models */
  models: string[];
  /** Currently selected model name */
  selectedModel: string;
  /** Select a different model */
  setSelectedModel: (model: string) => void;
  /** Whether Ollama server is reachable */
  isOnline: boolean;
  /** Current Ollama configuration */
  config: OllamaConfig;
  /** Update Ollama configuration (partial merge) */
  updateConfig: (config: Partial<OllamaConfig>) => Promise<void>;
  /** Refresh the list of available models */
  refreshModels: () => Promise<void>;
  /** Send messages to Ollama and begin streaming response */
  sendMessage: (messages: ChatMessage[]) => Promise<void>;
  /** Abort the current streaming request */
  abort: () => Promise<void>;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Accumulated stream chunk from the current response */
  streamChunk: string;
  /** Whether streaming is currently active */
  isStreaming: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

const useOllama = (): UseOllamaReturn => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_ANATHEMETRON_MODEL);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [config, setConfig] = useState<OllamaConfig>({
    host: DEFAULT_LLAMA_SERVER_URL,
    model: DEFAULT_ANATHEMETRON_MODEL,
    provider: DEFAULT_LLM_PROVIDER,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamChunk, setStreamChunk] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const isStreamingRef = useRef<boolean>(false);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Check if Ollama server is alive */
  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const online = await window.electronAPI.ollama.checkStatus();
      setIsOnline(online);
      return online;
    } catch (error) {
      console.error('[useOllama] checkStatus error:', error);
      setIsOnline(false);
      return false;
    }
  }, []);

  /** Load available models from Ollama */
  const refreshModels = useCallback(async (): Promise<void> => {
    try {
      const modelList = await window.electronAPI.ollama.listModels();
      setModels(modelList);
      // Auto-select the first model if current selection is not available
      if (modelList.length > 0 && !modelList.includes(selectedModel)) {
        setSelectedModel(modelList[0]);
      }
    } catch (error) {
      console.error('[useOllama] refreshModels error:', error);
      setModels([]);
    }
  }, [selectedModel]);

  /** Load Ollama configuration from the main process */
  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      const cfg = await window.electronAPI.ollama.getConfig();
      setConfig(cfg);
      if (cfg.model) {
        setSelectedModel(cfg.model);
      }
    } catch (error) {
      console.error('[useOllama] loadConfig error:', error);
    }
  }, []);

  /** Merge-partial update of Ollama config */
  const updateConfig = useCallback(async (partial: Partial<OllamaConfig>): Promise<void> => {
    try {
      const merged: OllamaConfig = { ...config, ...partial };
      await window.electronAPI.ollama.setConfig(merged);
      setConfig(merged);
      if (partial.model) {
        setSelectedModel(partial.model);
      }
    } catch (error) {
      console.error('[useOllama] updateConfig error:', error);
    }
  }, [config]);

  /** Send messages and stream the response */
  const sendMessage = useCallback(async (messages: ChatMessage[]): Promise<void> => {
    if (isStreamingRef.current || messages.length === 0) return;

    setIsLoading(true);
    setStreamChunk('');
    setIsStreaming(true);
    isStreamingRef.current = true;

    try {
      // Subscribe to stream chunks before sending
      const unsubscribe = window.electronAPI.ollama.onStreamChunk((data: { chunk: string; done: boolean }) => {
        setStreamChunk((prev) => prev + data.chunk);
      });
      streamCleanupRef.current = unsubscribe;

      const response = await window.electronAPI.ollama.chat(messages, selectedModel);

      // If the main process returns a full response (non-streaming fallback), set it
      if (response && !isStreamingRef.current) {
        setStreamChunk(response);
      }
    } catch (error) {
      console.error('[useOllama] sendMessage error:', error);
      setStreamChunk((prev) => prev + '\n[Connection severed — the machine-spirit refuses to respond.]');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  }, [selectedModel]);

  /** Abort the active streaming request */
  const abort = useCallback(async (): Promise<void> => {
    try {
      await window.electronAPI.ollama.abort();
      isStreamingRef.current = false;
      setIsStreaming(false);
      setIsLoading(false);
    } catch (error) {
      console.error('[useOllama] abort error:', error);
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Initialize: check status, load config, fetch models */
  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      await loadConfig();
      if (cancelled) return;

      const online = await checkStatus();
      if (cancelled) return;

      if (online) {
        await refreshModels();
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [checkStatus, loadConfig, refreshModels]);

  /** Cleanup stream listener on unmount */
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    models,
    selectedModel,
    setSelectedModel,
    isOnline,
    config,
    updateConfig,
    refreshModels,
    sendMessage,
    abort,
    isLoading,
    streamChunk,
    isStreaming,
  };
};

export default useOllama;
