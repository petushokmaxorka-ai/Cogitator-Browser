#!/usr/bin/env node
/** Direct verification: Anathemetron translation prompt on :11436 */
import { buildTranslatePrompt, cleanTranslationOutput } from '../src/shared/translate-helpers.ts';

const BASE = 'http://127.0.0.1:11436/v1';
const MODEL = 'Anathemetron';
const LANG_MAP = { en: 'English', ru: 'Russian' };

async function main() {
  const prompt = buildTranslatePrompt('Hello, world!', 'en', 'ru', LANG_MAP);
  console.log('[translate-smoke] POST chat/completions (en→ru)');

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise translator. Output only the translated text.',
        },
        { role: 'user', content: prompt },
      ],
      stream: false,
      max_tokens: 64,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    console.error('[translate-smoke] FAIL HTTP', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }

  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content ?? '';
  const cleaned = cleanTranslationOutput(raw);
  console.log('[translate-smoke] raw:', JSON.stringify(raw.slice(0, 120)));
  console.log('[translate-smoke] cleaned:', JSON.stringify(cleaned.slice(0, 120)));

  if (!cleaned.trim()) {
    console.error('[translate-smoke] FAIL empty translation');
    process.exit(1);
  }

  console.log('[translate-smoke] PASS');
}

main().catch((err) => {
  console.error('[translate-smoke] FAIL', err.message || err);
  process.exit(1);
});
