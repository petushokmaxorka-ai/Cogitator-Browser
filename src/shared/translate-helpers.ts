// ═══ Translation helpers (LibreTranslate + Anathemetron) ═══

export function languageLabel(code: string, langMap: Record<string, string>): string {
  if (code === 'auto') return 'auto-detect';
  return langMap[code] ?? code;
}

export function buildTranslatePrompt(
  text: string,
  sourceLang: string,
  targetLang: string,
  langMap: Record<string, string>,
): string {
  const source = languageLabel(sourceLang, langMap);
  const target = languageLabel(targetLang, langMap);
  return `You are a translation engine. Translate into ${target} only.
Source language: ${source}.
Rules: output ONLY the translated text — no preamble, analysis, markdown, or channel tags.
Preserve meaning and line breaks. Do not wrap in quotes.

${text}`;
}

/** Strip gemma channel tokens and common LLM wrappers from translation output. */
export function cleanTranslationOutput(raw: string): string {
  return raw
    .replace(/<\|[^|>]*\|>/g, '')
    .replace(/<[^>\n]*\|>/g, '')
    .replace(/^```[\w]*\n?/m, '')
    .replace(/\n?```$/m, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}
