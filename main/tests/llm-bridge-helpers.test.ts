import { describe, expect, it } from 'vitest';
import {
  llamaServerRoot,
  normalizeLlmBaseUrl,
  parseOpenAiStreamDelta,
  pickDefaultModel,
} from '../llm-bridge-helpers';

describe('llm-bridge-helpers', () => {
  it('normalizes llama-server base URL with /v1', () => {
    expect(normalizeLlmBaseUrl('http://127.0.0.1:11436', 'llama-server')).toBe(
      'http://127.0.0.1:11436/v1',
    );
    expect(normalizeLlmBaseUrl('http://127.0.0.1:11436/v1/', 'llama-server')).toBe(
      'http://127.0.0.1:11436/v1',
    );
  });

  it('strips /v1 for ollama host', () => {
    expect(normalizeLlmBaseUrl('http://127.0.0.1:11434/v1', 'ollama')).toBe(
      'http://127.0.0.1:11434',
    );
  });

  it('llamaServerRoot removes /v1 suffix', () => {
    expect(llamaServerRoot('http://127.0.0.1:11436/v1')).toBe('http://127.0.0.1:11436');
  });

  it('pickDefaultModel prefers Anathemetron', () => {
    expect(pickDefaultModel(['Vox Dei', 'Anathemetron'], 'Anathemetron')).toBe('Anathemetron');
    expect(pickDefaultModel(['other'], 'Anathemetron')).toBe('other');
  });

  it('parseOpenAiStreamDelta extracts content delta', () => {
    const line =
      'data: {"choices":[{"delta":{"content":"hello"}}]}';
    expect(parseOpenAiStreamDelta(line)).toBe('hello');
    expect(parseOpenAiStreamDelta('data: [DONE]')).toBe('');
  });
});
