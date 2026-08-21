#!/usr/bin/env node
/**
 * Direct verification: Anathemetron llama-server on :11436
 * No Electron — curl-equivalent fetch from Node.
 */
const BASE = 'http://127.0.0.1:11436/v1';
const PREFERRED = 'Anathemetron';

async function main() {
  console.log('[anathemetron-smoke] GET /v1/models');
  const modelsRes = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(8000) });
  if (!modelsRes.ok) {
    console.error('[anathemetron-smoke] FAIL models HTTP', modelsRes.status);
    process.exit(1);
  }
  const modelsBody = await modelsRes.json();
  const ids = (modelsBody.data ?? []).map((m) => m.id).filter(Boolean);
  console.log('[anathemetron-smoke] models:', ids.join(', ') || '(none)');
  const model = ids.includes(PREFERRED) ? PREFERRED : ids[0];
  if (!model) {
    console.error('[anathemetron-smoke] FAIL no models');
    process.exit(1);
  }

  console.log('[anathemetron-smoke] POST chat/completions model=', model);
  const chatRes = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Answer in one short word.' },
        { role: 'user', content: 'Say PING_OK only.' },
      ],
      stream: false,
      max_tokens: 32,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!chatRes.ok) {
    const err = await chatRes.text().catch(() => '');
    console.error('[anathemetron-smoke] FAIL chat HTTP', chatRes.status, err.slice(0, 300));
    process.exit(1);
  }

  const chatBody = await chatRes.json();
  const text = chatBody.choices?.[0]?.message?.content ?? '';
  console.log('[anathemetron-smoke] reply:', JSON.stringify(text.slice(0, 200)));
  if (!text.trim()) {
    console.error('[anathemetron-smoke] FAIL empty reply');
    process.exit(1);
  }
  console.log('[anathemetron-smoke] PASS');
}

main().catch((err) => {
  console.error('[anathemetron-smoke] FAIL', err.message || err);
  process.exit(1);
});
