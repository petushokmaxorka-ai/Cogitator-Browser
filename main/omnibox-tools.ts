// Omnibox quick answers — network lookups from main process

import { networkInterfaces } from 'os';
import { commandExists, runCommand } from './exec-util';

const FX_CACHE_TTL_MS = 60 * 60 * 1000;
const fxCache = new Map<string, { rate: number; date: string; expires: number }>();

const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export interface IpInfo {
  publicIp: string;
  localIp: string;
}

export interface WeatherInfo {
  city: string;
  tempC: number;
  condition: string;
  line: string;
}

export interface CurrencyInfo {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  date: string;
}

export function sanitizeDomain(raw: string): string {
  const domain = raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] ?? '';
  if (!DOMAIN_RE.test(domain)) {
    throw new Error('Invalid domain');
  }
  return domain;
}

export function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

export async function getPublicIp(): Promise<string> {
  const res = await fetch('https://api.ipify.org?format=text', {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`ipify HTTP ${res.status}`);
  const text = (await res.text()).trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text) && !text.includes(':')) {
    throw new Error('Unexpected IP response');
  }
  return text;
}

export async function getIpInfo(): Promise<IpInfo> {
  const localIp = getLocalIp();
  try {
    const publicIp = await getPublicIp();
    return { publicIp, localIp };
  } catch {
    return { publicIp: '—', localIp };
  }
}

export async function fetchWeather(city: string): Promise<WeatherInfo> {
  const encoded = encodeURIComponent(city.trim());
  const res = await fetch(`https://wttr.in/${encoded}?format=j1`, {
    headers: { 'User-Agent': 'CogitatorBrowser/2.0' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);

  const data = (await res.json()) as {
    nearest_area?: Array<{ areaName?: Array<{ value?: string }> }>;
    current_condition?: Array<{
      temp_C?: string;
      weatherDesc?: Array<{ value?: string }>;
    }>;
  };

  const area = data.nearest_area?.[0]?.areaName?.[0]?.value ?? city;
  const current = data.current_condition?.[0];
  const tempC = Number.parseInt(current?.temp_C ?? '0', 10);
  const condition = current?.weatherDesc?.[0]?.value ?? 'Unknown';
  const sign = tempC > 0 ? '+' : '';
  const line = `${area}: ${sign}${tempC}°C, ${condition}`;

  return { city: area, tempC, condition, line };
}

async function getFxRate(from: string, to: string): Promise<{ rate: number; date: string }> {
  const key = `${from}_${to}`;
  const cached = fxCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return { rate: cached.rate, date: cached.date };
  }

  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);

  const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
  const rate = data.rates?.[to];
  if (rate === undefined) throw new Error(`Unsupported pair ${from}/${to}`);

  const date = data.date ?? new Date().toISOString().slice(0, 10);
  fxCache.set(key, { rate, date, expires: Date.now() + FX_CACHE_TTL_MS });
  return { rate, date };
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<CurrencyInfo> {
  const src = from.toUpperCase();
  const dst = to.toUpperCase();
  if (src === dst) {
    return { amount, from: src, to: dst, result: amount, rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const { rate, date } = await getFxRate(src, dst);
  const result = amount * rate;
  return { amount, from: src, to: dst, result, rate, date };
}

export async function lookupWhois(domain: string): Promise<string> {
  const safe = sanitizeDomain(domain);

  if (await commandExists('whois')) {
    const out = await runCommand('whois', [safe], { maxBuffer: 512 * 1024, timeoutMs: 20_000 });
    return summarizeWhois(out);
  }

  // Fallback: RDAP via rdap.org
  const res = await fetch(`https://rdap.org/domain/${safe}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WHOIS/RDAP failed (${res.status})`);
  const json = await res.json();
  return summarizeWhois(JSON.stringify(json, null, 2));
}

function summarizeWhois(raw: string): string {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const picked: string[] = [];
  const keys = [
    /^domain:/i,
    /^registrar:/i,
    /^creation date:/i,
    /^created:/i,
    /^registry expiry date:/i,
    /^expiry date:/i,
    /^name server:/i,
    /^nserver:/i,
    /^status:/i,
    /^organization:/i,
    /^org:/i,
  ];

  for (const line of lines) {
    if (keys.some((re) => re.test(line))) {
      picked.push(line);
    }
    if (picked.length >= 12) break;
  }

  if (picked.length === 0) {
    return lines.slice(0, 15).join('\n');
  }
  return picked.join('\n');
}

const CITY_TIMEZONES: Record<string, string> = {
  moscow: 'Europe/Moscow',
  spb: 'Europe/Moscow',
  'saint petersburg': 'Europe/Moscow',
  tokyo: 'Asia/Tokyo',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  ny: 'America/New_York',
  'new york': 'America/New_York',
  la: 'America/Los_Angeles',
  utc: 'UTC',
  dubai: 'Asia/Dubai',
  singapore: 'Asia/Singapore',
  sydney: 'Australia/Sydney',
};

export interface TimezoneInfo {
  label: string;
  zone: string;
  time: string;
  date: string;
}

export function getLocalTimeInZone(query: string): TimezoneInfo {
  const raw = query.trim();
  const key = raw.toLowerCase();
  let zone = CITY_TIMEZONES[key];
  if (!zone && raw.includes('/')) {
    zone = raw;
  }
  if (!zone) {
    throw new Error(`Unknown city/timezone: ${raw}`);
  }
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);
  return { label: raw, zone, time, date };
}

export interface DefinitionInfo {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  example?: string;
}

export async function fetchDefinition(word: string): Promise<DefinitionInfo> {
  const safe = word.trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (!safe) throw new Error('Invalid word');

  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(safe)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Definition not found (${res.status})`);

  const data = (await res.json()) as Array<{
    word?: string;
    phonetic?: string;
    meanings?: Array<{
      partOfSpeech?: string;
      definitions?: Array<{ definition?: string; example?: string }>;
    }>;
  }>;

  const entry = data[0];
  const meaning = entry?.meanings?.[0];
  const def = meaning?.definitions?.[0];
  if (!def?.definition) throw new Error('No definition in response');

  return {
    word: entry?.word ?? safe,
    phonetic: entry?.phonetic,
    partOfSpeech: meaning?.partOfSpeech,
    definition: def.definition,
    example: def.example,
  };
}
