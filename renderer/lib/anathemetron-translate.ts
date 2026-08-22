// ═══ Anathemetron translation via llama-server IPC ═══

import type { ChatMessage } from '../../shared/types';
import { DEFAULT_ANATHEMETRON_MODEL } from '../../shared/constants';
import { buildTranslatePrompt, cleanTranslationOutput } from '../../shared/translate-helpers';

export async function translateViaAnathemetron(
  text: string,
  sourceLang: string,
  targetLang: string,
  langMap: Record<string, string>,
  onPartial?: (partial: string) => void,
  model?: string,
): Promise<string> {
  const config = await window.electronAPI.ollama.getConfig();
  const selectedModel = model ?? config.model ?? DEFAULT_ANATHEMETRON_MODEL;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a precise translator. Output only the translated text in the target language.',
      timestamp: Date.now(),
    },
    {
      role: 'user',
      content: buildTranslatePrompt(text, sourceLang, targetLang, langMap),
      timestamp: Date.now(),
    },
  ];

  let accumulated = '';
  window.electronAPI.ollama.onStreamChunk((data) => {
    if (data.done) return;
    accumulated += data.chunk;
    onPartial?.(cleanTranslationOutput(accumulated));
  });

  const full = await window.electronAPI.ollama.chat(messages, selectedModel);
  return cleanTranslationOutput(full || accumulated);
}
