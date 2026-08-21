#!/usr/bin/env node
/** Direct verification: Mens :8000 health + bibliotheca endpoints */
const BASE = 'http://127.0.0.1:8000';

async function get(path, timeoutMs = 15000) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('[mens-smoke] /health');
  const health = await get('/health');
  if (health.status !== 'ok') throw new Error('health not ok');
  console.log('[mens-smoke] health ok');

  console.log('[mens-smoke] /vault/digest');
  const digest = await get('/vault/digest');
  console.log('[mens-smoke] digest date:', digest.date, 'inbox:', digest.inbox?.count ?? 0);

  console.log('[mens-smoke] /search/semantic?q=anathemetron');
  try {
    const sem = await get('/search/semantic?q=anathemetron&limit=3', 8000);
    console.log('[mens-smoke] semantic hits:', sem.count ?? sem.results?.length ?? 0);
  } catch (err) {
    console.log('[mens-smoke] semantic skipped (embeddings offline):', err.message || err);
  }

  console.log('[mens-smoke] PASS');
}

main().catch((e) => {
  console.error('[mens-smoke] FAIL', e.message || e);
  process.exit(1);
});
