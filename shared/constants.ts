// ═══════════════════════════════════════════════════════════
// Shared Constants — COGITATOR BROWSER v2
// ═══════════════════════════════════════════════════════════

export const APP_NAME = 'COGITATOR BROWSER';
export const APP_VERSION = '2.1.0';
export const APP_TAGLINE = 'Sacred Instrument of the Omnissiah';

// Ollama / llama-server defaults — Anathemetron 3-model swarm brain
export const ANATHEMETRON_GGUF = 'gemma4-v2-Q4_K_M.gguf';
export const DEFAULT_ANATHEMETRON_MODEL = 'Vox Dei';
export const ANATHEMETRON_SWARM_MODELS = ['Vox Dei', 'Qwable-9B', 'Qwythos-9B'] as const;
export const DEFAULT_LLM_PROVIDER = 'llama-server' as const;
export const DEFAULT_LLAMA_SERVER_URL = 'http://127.0.0.1:11436/v1';
/** Legacy Ollama fallback */
export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = DEFAULT_ANATHEMETRON_MODEL;
export const DEFAULT_MENS_URL = 'http://127.0.0.1:8000';
export const MENS_CONTEXT_MAX_CHARS = 4000;

// Window defaults
export const WINDOW_DEFAULT_WIDTH = 1400;
export const WINDOW_DEFAULT_HEIGHT = 900;
export const WINDOW_MIN_WIDTH = 900;
export const WINDOW_MIN_HEIGHT = 600;
export const SIDEBAR_WIDTH = 480;

// Tabs
export const TITLEBAR_HEIGHT = 32;
export const TABBAR_HEIGHT = 40;
export const ADDRESSBAR_HEIGHT = 48;
/** Top chrome stack — tooltips must stay above this (BrowserView covers below). */
export const CHROME_HEIGHT = TITLEBAR_HEIGHT + TABBAR_HEIGHT + ADDRESSBAR_HEIGHT;

// Colors
export const COLORS = {
  voidBlack: '#000000',
  ironDark: '#1E1E1E',
  ironGray: '#2A2A2A',
  steelGray: '#3A3A3A',
  omnissiahRed: '#FF0000',
  omnissiahRedDim: '#8B0000',
  cogitatorGold: '#C8A84B',
  cogitatorGoldDim: '#8B7355',
  noosphereCyan: '#00BFBF',
  noosphereCyanDim: '#007777',
  parchment: '#D4C5A0',
  parchmentDim: '#8B7D6B',
  sacredWhite: '#E8E8E8',
} as const;

// Messages
export const ANATHEMETRON_GREETING = `═══ ANATHEMETRON SWARM ONLINE ═══
Рой из трёх мозгов пробуждён: Vox Dei · Qwable-9B · Qwythos-9B.
Задай вопрос или скажи "вкл впн" / "выкл впн"`;

export const SYSTEM_PROMPT = `Ты — Анафеметрон (Anathemetron), рой из трёх локальных мозгов COGITATOR BROWSER:
- Vox Dei — память и общий контекст;
- Qwable-9B — код, агентика, терминал;
- Qwythos-9B — рассуждение и философия.

Ты помогаешь пользователю работать с браузером, анализировать страницы,
искать информацию и управлять системой. Говори кратко, технически,
с лёгким оттенком стиля Адептус Механикус (WH40K).
Используй термины из лексикона Механикус, но не перегибай.
Отвечай на языке пользователя.`;
