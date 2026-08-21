#!/usr/bin/env node
/**
 * Cogitator Browser smoke — main-process helpers + Mens vault API.
 * Run from repo: node cogitator-browser/scripts/smoke-cogitator.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const MENS = 'http://127.0.0.1:8000';

async function get(path, timeoutMs = 12000) {
  const res = await fetch(`${MENS}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

function runVitestOmnibox() {
  console.log('[cogitator-smoke] vitest omnibox-tools');
  const r = spawnSync('npx', ['vitest', 'run', 'src/main/tests/omnibox-tools.test.ts'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (r.status !== 0) throw new Error('omnibox vitest failed');
}

async function smokeMens() {
  console.log('[cogitator-smoke] Mens /health');
  const health = await get('/health', 5000);
  if (health.status !== 'ok') throw new Error('Mens health not ok');

  console.log('[cogitator-smoke] Mens /search/hybrid');
  try {
    const hybrid = await get('/search/hybrid?q=heretic&limit=3', 15000);
    console.log('[cogitator-smoke] hybrid hits:', hybrid.count ?? hybrid.results?.length ?? 0);
  } catch (err) {
    console.log('[cogitator-smoke] hybrid skipped (embeddings offline):', err.message || err);
  }
}

async function smokeOmniboxNetwork() {
  console.log('[cogitator-smoke] ipify (public IP)');
  try {
    const res = await fetch('https://api.ipify.org?format=text', { signal: AbortSignal.timeout(8000) });
    const ip = (await res.text()).trim();
    if (!ip) throw new Error('empty ip');
    console.log('[cogitator-smoke] public IP ok:', ip.slice(0, 8) + '…');
  } catch (err) {
    console.log('[cogitator-smoke] ipify skipped:', err.message || err);
  }
}

async function main() {
  runVitestOmnibox();
  await smokeMens();
  await smokeOmniboxNetwork();
  console.log('[cogitator-smoke] PASS');
}

main().catch((e) => {
  console.error('[cogitator-smoke] FAIL', e.message || e);
  process.exit(1);
});
