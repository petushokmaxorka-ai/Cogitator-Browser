import { describe, expect, it } from 'vitest';
import {
  buildTranslatePrompt,
  cleanTranslationOutput,
  languageLabel,
} from '../../shared/translate-helpers';

describe('translate-helpers', () => {
  it('languageLabel resolves codes', () => {
    expect(languageLabel('auto', { ru: 'Russian' })).toBe('auto-detect');
    expect(languageLabel('ru', { ru: 'Russian' })).toBe('Russian');
  });

  it('buildTranslatePrompt includes languages and text', () => {
    const prompt = buildTranslatePrompt('Hello', 'en', 'ru', { en: 'English', ru: 'Russian' });
    expect(prompt).toContain('Russian');
    expect(prompt).toContain('Hello');
    expect(prompt).toContain('output ONLY the translated text');
  });

  it('cleanTranslationOutput strips channel tokens', () => {
    expect(cleanTranslationOutput('2<|channel|>thought\nПривет')).toBe('2thought\nПривет');
    expect(cleanTranslationOutput('<channel|>Hello')).toBe('Hello');
    expect(cleanTranslationOutput('```\nText\n```')).toBe('Text');
  });
});
