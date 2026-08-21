// ═══════════════════════════════════════════════════════════
// AdBlock Filter List Updater
// Fetches EasyList + RU AdList, caches locally, filters
// unsupported rules for our parser.
// ═══════════════════════════════════════════════════════════

import { get } from 'https';
import { app } from 'electron';
import { join } from 'path';
import { readFile, writeFile, mkdir, access, stat } from 'fs/promises';

// ── Config ────────────────────────────────────────────────

const LIST_URLS: Record<string, string> = {
  easylist: 'https://easylist.to/easylist/easylist.txt',
  ruadlist: 'https://easylist-downloads.adblockplus.org/ruadlist.txt',
};

const CACHE_DIR = 'adblock';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Modifiers our parser does NOT support (skip these rules)
const UNSUPPORTED_MODIFIERS = [
  'redirect', 'redirect-rule', 'csp', 'removeparam', 'removeheader',
  'mp4', 'webrtc', 'generichide', 'specifichide', 'elemhide',
  'ghide', 'shide', 'ehide', 'popunder',
];

// ── Helpers ───────────────────────────────────────────────

function hasUnsupportedModifier(rule: string): boolean {
  const dollar = rule.lastIndexOf('$');
  if (dollar === -1) return false;
  const opts = rule.slice(dollar + 1).toLowerCase();
  for (const mod of UNSUPPORTED_MODIFIERS) {
    if (opts.includes(mod)) return true;
  }
  return false;
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          fetchText(loc).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function extractRules(text: string): { network: string[]; cosmetic: string[] } {
  const network: string[] = [];
  const cosmetic: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!')) continue;

    // ABP header lines like [Adblock Plus 2.0]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) continue;

    // Cosmetic rules: ## or #@# or #?#
    if (trimmed.includes('##')) {
      cosmetic.push(trimmed);
      continue;
    }

    // Skip unsupported modifiers
    if (hasUnsupportedModifier(trimmed)) continue;

    network.push(trimmed);
  }

  return { network, cosmetic };
}

// ═══════════════════════════════════════════════════════════
// Main API
// ═══════════════════════════════════════════════════════════

export async function loadExternalLists(): Promise<{ network: string[]; cosmetic: string[] }> {
  const cacheDir = join(app.getPath('userData'), CACHE_DIR);
  try {
    await access(cacheDir);
  } catch {
    await mkdir(cacheDir, { recursive: true });
  }

  let totalNetwork = 0;
  let totalCosmetic = 0;
  const allNetwork: string[] = [];
  const allCosmetic: string[] = [];

  for (const [name, url] of Object.entries(LIST_URLS)) {
    const cachePath = join(cacheDir, `${name}.txt`);
    let text: string | null = null;
    let fromCache = false;

    // Try fresh cache
    try {
      const s = await stat(cachePath);
      if (Date.now() - s.mtimeMs < CACHE_TTL_MS) {
        text = await readFile(cachePath, 'utf-8');
        fromCache = true;
      }
    } catch {
      // Cache miss or expired
    }

    // Fetch from network
    if (!text) {
      try {
        text = await fetchText(url);
        await writeFile(cachePath, text, 'utf-8');
      } catch (err) {
        console.error(`[AdBlockUpdater] Failed to fetch ${name}:`, (err as Error).message);
        // Fallback to stale cache
        try {
          text = await readFile(cachePath, 'utf-8');
          fromCache = true;
        } catch {
          continue;
        }
      }
    }

    const { network, cosmetic } = extractRules(text);
    allNetwork.push(...network);
    allCosmetic.push(...cosmetic);
    totalNetwork += network.length;
    totalCosmetic += cosmetic.length;
    console.log(`[AdBlockUpdater] ${name}: ${network.length} net + ${cosmetic.length} cosmetic (${fromCache ? 'cache' : 'network'})`);
  }

  console.log(`[AdBlockUpdater] Total external: ${totalNetwork} network + ${totalCosmetic} cosmetic rules`);
  return { network: allNetwork, cosmetic: allCosmetic };
}
