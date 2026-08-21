/** Cross-panel bridge: omnibox / context menu → ChatPanel */

export interface ChatPrefillDetail {
  query: string;
  autoSend?: boolean;
}

const CHAT_PREFILL_EVENT = 'cogitator:chat-prefill';

export function dispatchChatPrefill(detail: ChatPrefillDetail): void {
  window.dispatchEvent(new CustomEvent<ChatPrefillDetail>(CHAT_PREFILL_EVENT, { detail }));
}

export function onChatPrefill(handler: (detail: ChatPrefillDetail) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<ChatPrefillDetail>).detail);
  };
  window.addEventListener(CHAT_PREFILL_EVENT, listener);
  return () => window.removeEventListener(CHAT_PREFILL_EVENT, listener);
}

/** Parse omnibox AI prefixes: ? …, ai: …, // … */
export function parseAiOmniboxQuery(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('?') && trimmed.length > 2) {
    return trimmed.slice(1).trim();
  }
  const aiMatch = trimmed.match(/^ai:\s*(.+)$/i);
  if (aiMatch?.[1]?.trim()) {
    return aiMatch[1].trim();
  }
  const slashMatch = trimmed.match(/^\/\/\s*(.+)$/);
  if (slashMatch?.[1]?.trim()) {
    return slashMatch[1].trim();
  }
  return null;
}
