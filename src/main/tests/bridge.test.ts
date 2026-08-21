import { describe, expect, it } from 'vitest';
import { parseAiOmniboxQuery } from '../../renderer/lib/chat-bridge';
import { isEditableVaultPath } from '../../renderer/lib/editor-bridge';

describe('chat-bridge', () => {
  it('parseAiOmniboxQuery handles ? prefix', () => {
    expect(parseAiOmniboxQuery('? что такое synapse')).toBe('что такое synapse');
  });

  it('parseAiOmniboxQuery handles ai: prefix', () => {
    expect(parseAiOmniboxQuery('ai: hello')).toBe('hello');
  });

  it('parseAiOmniboxQuery handles // prefix', () => {
    expect(parseAiOmniboxQuery('// explain rust')).toBe('explain rust');
  });

  it('parseAiOmniboxQuery rejects short ?', () => {
    expect(parseAiOmniboxQuery('?')).toBeNull();
  });
});

describe('editor-bridge', () => {
  it('isEditableVaultPath accepts bibliotheca notes', () => {
    expect(isEditableVaultPath('/home/heretic/heretic-os/bibliotheca/foo.md')).toBe(true);
    expect(isEditableVaultPath('/tmp/archive.zip')).toBe(false);
  });
});
