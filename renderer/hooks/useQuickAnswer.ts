// ═══ USE QUICK ANSWER ═══
// Google/Yandex-style smart omnibox quick answers.
// Detects calculator, currency, timer, weather, random, hash,
// base64, IP, and WHOIS patterns in user input.

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseAiOmniboxQuery } from '../lib/chat-bridge';

// ── Types ──────────────────────────────────────────────────

export type QuickAnswerType =
  | 'calculator'
  | 'currency'
  | 'unit'
  | 'timer'
  | 'weather'
  | 'random'
  | 'hash'
  | 'base64'
  | 'ip'
  | 'whois'
  | 'timezone'
  | 'define'
  | 'ai';

export interface QuickAnswer {
  type: QuickAnswerType;
  query: string;
  result: string;
  detail?: string;
}

// ── Constants ──────────────────────────────────────────────

const ASYNC_LOADING = 'Загрузка…';

const LENGTH_TO_M: Record<string, number> = {
  m: 1,
  meter: 1,
  meters: 1,
  km: 1000,
  kilometer: 1000,
  kilometers: 1000,
  mi: 1609.344,
  mile: 1609.344,
  miles: 1609.344,
  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,
  cm: 0.01,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
};

const WEIGHT_TO_KG: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  kilograms: 1,
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
  lb: 0.453592,
  lbs: 0.453592,
  pound: 0.453592,
  pounds: 0.453592,
  oz: 0.0283495,
  ounce: 0.0283495,
  ounces: 0.0283495,
};

function formatUnitResult(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function convertUnits(amount: number, fromRaw: string, toRaw: string): { result: string; detail: string } | null {
  const from = fromRaw.toLowerCase();
  const to = toRaw.toLowerCase();

  if ((from === 'c' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
    const result = amount * (9 / 5) + 32;
    return { result: `${formatUnitResult(result)}°F`, detail: `${amount}°C → ${formatUnitResult(result)}°F` };
  }
  if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celsius')) {
    const result = (amount - 32) * (5 / 9);
    return { result: `${formatUnitResult(result)}°C`, detail: `${amount}°F → ${formatUnitResult(result)}°C` };
  }

  if (from in LENGTH_TO_M && to in LENGTH_TO_M) {
    const meters = amount * LENGTH_TO_M[from];
    const result = meters / LENGTH_TO_M[to];
    const formatted = formatUnitResult(result);
    return { result: `${formatted} ${toRaw}`, detail: `${amount} ${fromRaw} = ${formatted} ${toRaw}` };
  }

  if (from in WEIGHT_TO_KG && to in WEIGHT_TO_KG) {
    const kg = amount * WEIGHT_TO_KG[from];
    const result = kg / WEIGHT_TO_KG[to];
    const formatted = formatUnitResult(result);
    return { result: `${formatted} ${toRaw}`, detail: `${amount} ${fromRaw} = ${formatted} ${toRaw}` };
  }

  return null;
}

const WEATHER_ICONS: Record<string, string> = {
  Snow: '❄️',
  Overcast: '☁️',
  Rain: '🌧️',
  Cloudy: '☁️',
  Drizzle: '🌧️',
  Clear: '☀️',
  Sunny: '☀️',
  Windy: '💨',
  Fog: '🌫️',
  Mist: '🌫️',
};

// ── Safe Math Evaluator ────────────────────────────────────

/**
 * Safely evaluate a mathematical expression.
 * Only allows numbers, operators, parentheses, and math functions.
 */
function safeEval(expr: string): number | null {
  // Whitelist allowed characters
  const cleaned = expr.replace(/\s+/g, '');
  if (!/^[\d+\-*/().^]+$/.test(cleaned)) return null;

  // Replace ^ with ** for exponentiation
  const jsExpr = cleaned.replace(/\^/g, '**');

  // Additional safety: only allow specific patterns
  if (!/^[\d+\-*/().\s**]+$/.test(jsExpr)) return null;

  try {
    // Use Function constructor for safer eval
    const result = new Function('return ' + jsExpr)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// ── Hash Computation (Web Crypto API) ──────────────────────

/**
 * Compute MD5 hash using a simple implementation.
 * Note: MD5 is not available in Web Crypto, so we use a lightweight implementation.
 */
async function computeMD5(message: string): Promise<string> {
  // Simple MD5 implementation for browser use
  const utf8 = new TextEncoder().encode(message);

  // Use Web Crypto for SHA-256, but we need a fallback for MD5
  // Since MD5 is not in Web Crypto, we use a lightweight implementation
  const data = Array.from(utf8);

  // MD5 constants
  const s: number[] = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const K: number[] = [];
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  }

  let a0 = 0x67452301;
  let b0 = 0xEFCDAB89;
  let c0 = 0x98BADCFE;
  let d0 = 0x10325476;

  const originalLength = data.length;
  // Padding
  data.push(0x80);
  while ((data.length % 64) !== 56) {
    data.push(0);
  }
  // Append length in bits (64-bit little-endian)
  const bitLength = originalLength * 8;
  for (let i = 0; i < 8; i++) {
    data.push((bitLength >>> (i * 8)) & 0xFF);
  }

  // Process in 64-byte chunks
  for (let chunkStart = 0; chunkStart < data.length; chunkStart += 64) {
    const chunk = data.slice(chunkStart, chunkStart + 64);
    const M: number[] = [];
    for (let i = 0; i < 16; i++) {
      M[i] = chunk[i * 4] | (chunk[i * 4 + 1] << 8) | (chunk[i * 4 + 2] << 16) | (chunk[i * 4 + 3] << 24);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      const temp = D;
      D = C;
      C = B;
      B = B + leftRotate(A + F + K[i] + M[g], s[i]);
      A = temp;
    }

    a0 += A;
    b0 += B;
    c0 += C;
    d0 += D;
  }

  function leftRotate(x: number, c: number): number {
    return ((x << c) | (x >>> (32 - c))) >>> 0;
  }

  function toHex(n: number): string {
    return ((n >>> 0) & 0xFFFFFFFF).toString(16).padStart(8, '0');
  }

  // Reverse byte order for each word
  const result =
    toHex((a0 & 0xFF) << 24 | (a0 & 0xFF00) << 8 | (a0 & 0xFF0000) >>> 8 | (a0 >>> 24) & 0xFF) +
    toHex((b0 & 0xFF) << 24 | (b0 & 0xFF00) << 8 | (b0 & 0xFF0000) >>> 8 | (b0 >>> 24) & 0xFF) +
    toHex((c0 & 0xFF) << 24 | (c0 & 0xFF00) << 8 | (c0 & 0xFF0000) >>> 8 | (c0 >>> 24) & 0xFF) +
    toHex((d0 & 0xFF) << 24 | (d0 & 0xFF00) << 8 | (d0 & 0xFF0000) >>> 8 | (d0 >>> 24) & 0xFF);

  return result;
}

async function computeSHA256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function computeSHA1(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Main Detection Function ────────────────────────────────

/**
 * Detect if the input matches a quick answer pattern.
 * Returns a QuickAnswer object or null.
 */
export function detectQuickAnswer(input: string): QuickAnswer | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // ═══ Calculator: "2+2", "150*4.5", "sqrt(16)" ═══
  // Allow digits, operators, parentheses, dots, spaces, and common math
  if (/^[\d+\-*/().^\s]+$/.test(trimmed) && /\d/.test(trimmed) && trimmed.length > 2) {
    const result = safeEval(trimmed);
    if (result !== null) {
      // Format nicely
      const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return { type: 'calculator', query: trimmed, result: formatted };
    }
  }

  // Also try with sqrt() function
  const sqrtMatch = trimmed.match(/^sqrt\((\d+(?:\.\d+)?)\)$/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    const result = Math.sqrt(val);
    const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    return { type: 'calculator', query: trimmed, result: formatted };
  }

  // ═══ Currency: "100 USD in RUB", "50 EUR to USD" ═══
  const currencyMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]{3})\s+(?:in|to)\s+([A-Za-z]{3})$/i);
  if (currencyMatch) {
    const amount = parseFloat(currencyMatch[1]);
    const from = currencyMatch[2].toUpperCase();
    const to = currencyMatch[3].toUpperCase();
    return {
      type: 'currency',
      query: trimmed,
      result: ASYNC_LOADING,
      detail: `${amount}|${from}|${to}`,
    };
  }

  // ═══ Units: "10 km in mi", "32 f to c", "5 lb to kg" ═══
  const unitMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:in|to)\s+([a-zA-Z]+)$/i);
  if (unitMatch) {
    const amount = parseFloat(unitMatch[1]);
    const from = unitMatch[2];
    const to = unitMatch[3];
    const converted = convertUnits(amount, from, to);
    if (converted) {
      return { type: 'unit', query: trimmed, result: converted.result, detail: converted.detail };
    }
  }

  // ═══ Timer: "timer 5 min", "timer 30 sec" ═══
  const timerMatch = trimmed.match(/^timer\s+(\d+(?:\.\d+)?)\s*(min|sec|hour|h|m|s|minutes?|seconds?|hours?)$/i);
  if (timerMatch) {
    const value = timerMatch[1];
    const unit = timerMatch[2].toLowerCase();
    const normalizedUnit = unit.startsWith('min') || unit === 'm' ? 'min' :
                           unit.startsWith('hour') || unit === 'h' ? 'hour' :
                           unit.startsWith('sec') || unit === 's' ? 'sec' : unit;
    const seconds = normalizedUnit === 'hour' ? parseFloat(value) * 3600 :
                    normalizedUnit === 'min' ? parseFloat(value) * 60 :
                    parseFloat(value);
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return {
      type: 'timer',
      query: trimmed,
      result: `\u23F1 ${mins}:${secs.toString().padStart(2, '0')}`,
      detail: `Press Enter to start ${value} ${normalizedUnit} timer`,
    };
  }

  // ═══ Weather: "weather Moscow", "pogoda SPb" ═══
  const weatherMatch = trimmed.match(/^(?:weather|pogoda)\s+(.+)$/i);
  if (weatherMatch) {
    return {
      type: 'weather',
      query: trimmed,
      result: ASYNC_LOADING,
      detail: weatherMatch[1].trim(),
    };
  }

  // ═══ Random: "random 1-100" ═══
  const randomMatch = trimmed.match(/^random\s+(\d+)(?:-(\d+))?$/i);
  if (randomMatch) {
    const min = parseInt(randomMatch[2] || '1');
    const max = parseInt(randomMatch[1]);
    const actualMin = Math.min(min, max);
    const actualMax = Math.max(min, max);
    const result = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
    return {
      type: 'random',
      query: trimmed,
      result: String(result),
      detail: `Random number between ${actualMin} and ${actualMax}`,
    };
  }

  // ═══ Hash: "md5 text", "sha256 text" ═══
  const hashMatch = trimmed.match(/^(md5|sha256|sha1)\s+(.+)$/i);
  if (hashMatch) {
    const algo = hashMatch[1].toLowerCase();
    const text = hashMatch[2];
    return {
      type: 'hash',
      query: trimmed,
      result: 'Computing...',
      detail: `${algo.toUpperCase()}: "${text}"`,
    };
  }

  // ═══ Base64: "b64 encode text", "b64 decode dGV4dA==" ═══
  const b64Match = trimmed.match(/^b64\s+(encode|decode)\s+(.+)$/i);
  if (b64Match) {
    const action = b64Match[1].toLowerCase();
    const text = b64Match[2];
    try {
      if (action === 'encode') {
        const encoded = btoa(text);
        return { type: 'base64', query: trimmed, result: encoded };
      } else {
        const decoded = atob(text);
        return { type: 'base64', query: trimmed, result: decoded };
      }
    } catch {
      return {
        type: 'base64',
        query: trimmed,
        result: 'Error: Invalid input',
        detail: `${action === 'encode' ? 'Encode' : 'Decode'} failed`,
      };
    }
  }

  // ═══ IP: "ip" ═══
  if (trimmed.toLowerCase() === 'ip') {
    return {
      type: 'ip',
      query: trimmed,
      result: ASYNC_LOADING,
      detail: 'public+local',
    };
  }

  // ═══ WHOIS: "whois example.com" ═══
  const whoisMatch = trimmed.match(/^whois\s+(.+)$/i);
  if (whoisMatch) {
    return {
      type: 'whois',
      query: trimmed,
      result: ASYNC_LOADING,
      detail: whoisMatch[1].trim(),
    };
  }

  // ═══ Timezone: "time Moscow", "time UTC" ═══
  const timeMatch = trimmed.match(/^time\s+(.+)$/i);
  if (timeMatch) {
    return {
      type: 'timezone',
      query: trimmed,
      result: ASYNC_LOADING,
      detail: timeMatch[1].trim(),
    };
  }

  // ═══ Define: "define word", "define: word" ═══
  const defineMatch = trimmed.match(/^define:?\s+(.+)$/i);
  if (defineMatch) {
    const word = defineMatch[1].trim().split(/\s+/)[0] ?? '';
    if (word) {
      return {
        type: 'define',
        query: trimmed,
        result: ASYNC_LOADING,
        detail: word,
      };
    }
  }

  // ═══ AI: "? question", "ai: question", "// question" ═══
  const aiPrompt = parseAiOmniboxQuery(trimmed);
  if (aiPrompt) {
    return {
      type: 'ai',
      query: trimmed,
      result: '→ Anathemetron Chat',
      detail: aiPrompt,
    };
  }

  return null;
}

/**
 * Compute hash asynchronously. Call this after detecting a hash pattern.
 */
export async function computeHashAsync(algo: string, text: string): Promise<string> {
  switch (algo.toLowerCase()) {
    case 'md5':
      return computeMD5(text);
    case 'sha1':
      return computeSHA1(text);
    case 'sha256':
      return computeSHA256(text);
    default:
      return 'Unsupported algorithm';
  }
}

function weatherIcon(condition: string): string {
  for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
    if (condition.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '☀️';
}

async function fetchOmniboxAsync(
  type: QuickAnswerType,
  detected: QuickAnswer,
): Promise<Partial<QuickAnswer>> {
  const api = window.electronAPI?.omnibox;
  if (!api) throw new Error('Omnibox API unavailable');

  switch (type) {
    case 'ip': {
      const info = await api.getIp();
      return {
        result: info.publicIp,
        detail: `Локальный: ${info.localIp}`,
      };
    }
    case 'weather': {
      const city = detected.detail ?? '';
      const wx = await api.getWeather(city);
      const sign = wx.tempC > 0 ? '+' : '';
      const icon = weatherIcon(wx.condition);
      return {
        result: `${icon} ${sign}${wx.tempC}°C`,
        detail: wx.line,
      };
    }
    case 'currency': {
      const parts = (detected.detail ?? '').split('|');
      const amount = Number.parseFloat(parts[0] ?? '0');
      const from = parts[1] ?? 'USD';
      const to = parts[2] ?? 'EUR';
      const fx = await api.convertCurrency(amount, from, to);
      const formatted =
        fx.result < 0.01 ? fx.result.toExponential(4) : fx.result.toFixed(2);
      return {
        result: `${formatted} ${fx.to}`,
        detail: `1 ${fx.from} = ${fx.rate.toFixed(4)} ${fx.to} (${fx.date})`,
      };
    }
    case 'whois': {
      const domain = detected.detail ?? '';
      const text = await api.whois(domain);
      return {
        result: text.split('\n')[0] ?? domain,
        detail: text,
      };
    }
    case 'timezone': {
      const city = detected.detail ?? '';
      const tz = await api.getTime(city);
      return {
        result: `\u{1F550} ${tz.time}`,
        detail: `${tz.label} (${tz.zone}) — ${tz.date}`,
      };
    }
    case 'define': {
      const word = detected.detail ?? '';
      const def = await api.define(word);
      const pos = def.partOfSpeech ? ` (${def.partOfSpeech})` : '';
      return {
        result: def.definition.length > 80 ? `${def.definition.slice(0, 77)}…` : def.definition,
        detail: `${def.word}${pos}${def.phonetic ? ` · ${def.phonetic}` : ''}\n${def.definition}${def.example ? `\n\n"${def.example}"` : ''}`,
      };
    }
    default:
      throw new Error(`Unsupported async type: ${type}`);
  }
}

// ── Hook ───────────────────────────────────────────────────

export interface UseQuickAnswerReturn {
  /** The detected quick answer, or null if no pattern matched */
  answer: QuickAnswer | null;
  /** Set the answer directly */
  setAnswer: (answer: QuickAnswer | null) => void;
  /** Recompute the answer for the given input */
  detect: (input: string) => void;
  /** Whether a hash computation is in progress */
  isComputing: boolean;
  /** Copy the result to clipboard */
  copyResult: () => Promise<boolean>;
}

/**
 * React hook for quick answer detection in the omnibox.
 */
export function useQuickAnswer(): UseQuickAnswerReturn {
  const [answer, setAnswer] = useState<QuickAnswer | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const computeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const asyncRequestIdRef = useRef(0);

  const detect = useCallback((input: string) => {
    if (computeTimeoutRef.current) {
      clearTimeout(computeTimeoutRef.current);
    }

    const detected = detectQuickAnswer(input);
    setAnswer(detected);

    if (detected?.type === 'ai') {
      setIsComputing(false);
      return;
    }

    const asyncTypes: QuickAnswerType[] = ['ip', 'weather', 'currency', 'whois', 'timezone', 'define'];
    if (detected && asyncTypes.includes(detected.type) && detected.result === ASYNC_LOADING) {
      setIsComputing(true);
      asyncRequestIdRef.current += 1;
      const requestId = asyncRequestIdRef.current;
      const queryKey = input.trim();
      const snapshot = detected;

      void fetchOmniboxAsync(detected.type, snapshot)
        .then((patch) => {
          if (requestId !== asyncRequestIdRef.current) return;
          setAnswer((prev) =>
            prev?.type === snapshot.type && prev.query === queryKey
              ? { ...prev, ...patch }
              : prev,
          );
        })
        .catch((err) => {
          if (requestId !== asyncRequestIdRef.current) return;
          setAnswer((prev) =>
            prev?.type === snapshot.type && prev.query === queryKey
              ? {
                  ...prev,
                  result: 'Ошибка запроса',
                  detail: err instanceof Error ? err.message : String(err),
                }
              : prev,
          );
        })
        .finally(() => {
          if (requestId === asyncRequestIdRef.current) {
            setIsComputing(false);
          }
        });
      return;
    }

    // Handle async hash computation
    if (detected?.type === 'hash' && detected.result === 'Computing...') {
      setIsComputing(true);
      const hashMatch = input.trim().match(/^(md5|sha256|sha1)\s+(.+)$/i);
      if (hashMatch) {
        const [, algo, text] = hashMatch;
        computeHashAsync(algo, text).then((hash) => {
          setAnswer((prev) =>
            prev?.type === 'hash' && prev.query === input.trim()
              ? { ...prev, result: hash }
              : prev
          );
          setIsComputing(false);
        });
      }
    } else {
      setIsComputing(false);
    }
  }, []);

  const copyResult = useCallback(async (): Promise<boolean> => {
    if (
      !answer?.result ||
      answer.result === 'Computing...' ||
      answer.result === ASYNC_LOADING
    ) {
      return false;
    }
    const text =
      (answer.type === 'whois' || answer.type === 'define') && answer.detail && answer.detail.includes('\n')
        ? answer.detail
        : answer.result;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [answer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (computeTimeoutRef.current) {
        clearTimeout(computeTimeoutRef.current);
      }
      asyncRequestIdRef.current += 1;
    };
  }, []);

  return { answer, setAnswer, detect, isComputing, copyResult };
}

export default useQuickAnswer;
