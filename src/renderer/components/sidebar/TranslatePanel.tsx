// ═══ TRANSLATE PANEL ═══
// Primary: Anathemetron (llama-server :11436). Optional: LibreTranslate :5000.

import { useState, useCallback, useEffect } from 'react';
import { translateViaAnathemetron } from '../../lib/anathemetron-translate';
import {
  Languages,
  ArrowRightLeft,
  Loader2,
  AlertTriangle,
  Sparkles,
  Globe,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  FileText,
  Monitor,
} from 'lucide-react';
import Button from '../ui/Button';
import ScrollArea from '../ui/ScrollArea';

// ── Types ───────────────────────────────────────────────────

interface TranslatePanelProps {
  initialText?: string;
}

interface TranslateResponse {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    language: string;
  };
}

// ── Supported Languages ─────────────────────────────────────

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ko', name: 'Korean' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sv', name: 'Swedish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'hi', name: 'Hindi' },
  { code: 'la', name: 'High Gothic' },
];

// Language code to name mapping
const LANG_CODE_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter((l) => l.code !== 'auto').map((l) => [l.code, l.name])
);

// ── LibreTranslate Config ───────────────────────────────────

const TRANSLATE_ENDPOINT = 'http://localhost:5000/translate';
const DETECT_ENDPOINT = 'http://localhost:5000/detect';
const CONNECT_TIMEOUT = 3000;

// ── Auto-Translate Hook ─────────────────────────────────────

function useAutoTranslate() {
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem('cogitator_auto_translate') === 'true'
  );
  const [targetLang, setTargetLang] = useState(
    () => localStorage.getItem('cogitator_auto_translate_target') || 'ru'
  );
  const [excludeLangs, setExcludeLangs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cogitator_auto_translate_exclude');
      return stored ? JSON.parse(stored) : ['ru'];
    } catch {
      return ['ru'];
    }
  });

  useEffect(() => {
    localStorage.setItem('cogitator_auto_translate', String(enabled));
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem('cogitator_auto_translate_target', targetLang);
  }, [targetLang]);

  useEffect(() => {
    localStorage.setItem(
      'cogitator_auto_translate_exclude',
      JSON.stringify(excludeLangs)
    );
  }, [excludeLangs]);

  const shouldTranslate = (pageLang: string) => {
    return enabled && !excludeLangs.includes(pageLang);
  };

  const toggleExcludeLang = (langCode: string) => {
    setExcludeLangs((prev) =>
      prev.includes(langCode)
        ? prev.filter((l) => l !== langCode)
        : [...prev, langCode]
    );
  };

  return {
    enabled,
    setEnabled,
    targetLang,
    setTargetLang,
    excludeLangs,
    setExcludeLangs,
    shouldTranslate,
    toggleExcludeLang,
  };
}

// ── Component ───────────────────────────────────────────────

export default function TranslatePanel({ initialText = '' }: TranslatePanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ru');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [libreAvailable, setLibreAvailable] = useState<boolean | null>(null);
  const [anathemetronAvailable, setAnathemetronAvailable] = useState<boolean | null>(null);
  const [activeBackend, setActiveBackend] = useState<'anathemetron' | 'libre' | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  const translateOnline =
    libreAvailable === true || anathemetronAvailable === true;
  const translateChecking =
    libreAvailable === null || anathemetronAvailable === null;

  // ── Auto-translate state ────────────────────────────────
  const autoTx = useAutoTranslate();
  const [pageLang, setPageLang] = useState<string | null>(null);
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);
  const [autoTranslateProgress, setAutoTranslateProgress] = useState(0);
  const [translatedPageContent, setTranslatedPageContent] = useState<string | null>(null);
  const [showTranslatedPage, setShowTranslatedPage] = useState(false);

  // ── Update source text when initialText changes ──────────
  useEffect(() => {
    if (initialText) {
      setSourceText(initialText);
    }
  }, [initialText]);

  // ── Check translation backends ─────────────────────────────
  useEffect(() => {
    const checkBackends = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);
        const response = await fetch('http://localhost:5000/languages', {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setLibreAvailable(response.ok);
      } catch {
        setLibreAvailable(false);
      }

      try {
        const ok = await window.electronAPI.ollama.checkStatus();
        setAnathemetronAvailable(ok);
      } catch {
        setAnathemetronAvailable(false);
      }
    };

    checkBackends();
    const interval = setInterval(checkBackends, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Detect page language from active tab ──────────────────
  useEffect(() => {
    const detectPageLang = async () => {
      try {
        // Try to get page info from the active tab
        const info = await window.electronAPI.page.getInfo();
        if (info?.content) {
          // Simple heuristic: check for common language patterns
          // In a real implementation, this would use the LibreTranslate
          // detect endpoint or the browser's own lang detection
          const htmlLang = document.documentElement?.lang;
          if (htmlLang) {
            setPageLang(htmlLang.split('-')[0]);
          }
        }
      } catch {
        // Page detection not available
      }
    };

    detectPageLang();
  }, []);

  // ── Translate handler ─────────────────────────────────────

  const translateWithLibre = useCallback(
    async (text: string, source: string, target: string): Promise<string> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(TRANSLATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: source === 'auto' ? 'auto' : source,
          target,
          format: 'text',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LibreTranslate HTTP ${response.status}: ${errorText.slice(0, 120)}`);
      }

      const data: TranslateResponse = await response.json();
      if (data.detectedLanguage?.language) {
        const lang = LANGUAGES.find((l) => l.code === data.detectedLanguage?.language);
        setDetectedLang(lang?.name || data.detectedLanguage.language);
      }
      return data.translatedText;
    },
    [],
  );

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (!translateOnline) {
      setError('No translation backend online. Start heretic-router (Anathemetron) or LibreTranslate.');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setTranslatedText('');
    setActiveBackend(null);

    const tryAnathemetron = async () => {
      const result = await translateViaAnathemetron(
        sourceText,
        sourceLang,
        targetLang,
        LANG_CODE_MAP,
        (partial) => setTranslatedText(partial),
      );
      setTranslatedText(result);
      setActiveBackend('anathemetron');
    };

    const tryLibre = async () => {
      const result = await translateWithLibre(sourceText, sourceLang, targetLang);
      setTranslatedText(result);
      setActiveBackend('libre');
    };

    try {
      if (anathemetronAvailable) {
        await tryAnathemetron();
      } else if (libreAvailable) {
        await tryLibre();
      }
    } catch (primaryErr) {
      if (anathemetronAvailable && libreAvailable) {
        try {
          await tryLibre();
        } catch (fallbackErr) {
          const message =
            fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error';
          setError(`Translation failed: ${message}`);
        }
      } else {
        const message =
          primaryErr instanceof Error ? primaryErr.message : 'Unknown error';
        setError(`Translation failed: ${message}`);
      }
    } finally {
      setIsTranslating(false);
    }
  }, [
    sourceText,
    sourceLang,
    targetLang,
    translateOnline,
    anathemetronAvailable,
    libreAvailable,
    translateWithLibre,
  ]);

  // ── Manual page translation ───────────────────────────────

  const handleTranslatePage = useCallback(async () => {
    if (!translateOnline) {
      setError('No translation backend online. Start heretic-router (Anathemetron).');
      return;
    }

    setIsAutoTranslating(true);
    setError(null);
    setAutoTranslateProgress(0);
    setActiveBackend(null);

    try {
      const info = await window.electronAPI.page.getInfo();
      if (!info?.content) {
        setError('No page content available. Navigate to a page first.');
        return;
      }

      setAutoTranslateProgress(10);

      let detectedCode = 'auto';
      if (libreAvailable) {
        try {
          const detectController = new AbortController();
          const detectTimeout = setTimeout(() => detectController.abort(), 5000);
          const detectResponse = await fetch(DETECT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: info.content.slice(0, 500) }),
            signal: detectController.signal,
          });
          clearTimeout(detectTimeout);
          if (detectResponse.ok) {
            const detectData = await detectResponse.json();
            if (Array.isArray(detectData) && detectData.length > 0) {
              detectedCode = detectData[0].language;
              setPageLang(detectedCode);
            }
          }
        } catch {
          // detection optional
        }
      }

      setAutoTranslateProgress(20);
      const chunks = chunkText(info.content, anathemetronAvailable ? 1500 : 2000);
      let fullTranslation = '';

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let piece = '';

        if (anathemetronAvailable) {
          piece = await translateViaAnathemetron(
            chunk,
            detectedCode,
            autoTx.targetLang,
            LANG_CODE_MAP,
          );
          setActiveBackend('anathemetron');
        } else if (libreAvailable) {
          piece = await translateWithLibre(
            chunk,
            detectedCode === 'auto' ? 'auto' : detectedCode,
            autoTx.targetLang,
          );
          setActiveBackend('libre');
        }

        fullTranslation += `${piece} `;
        setAutoTranslateProgress(20 + Math.round(((i + 1) / chunks.length) * 80));
      }

      setTranslatedPageContent(fullTranslation.trim());
      setShowTranslatedPage(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Page translation failed: ${message}`);
    } finally {
      setIsAutoTranslating(false);
      setAutoTranslateProgress(100);
    }
  }, [
    autoTx.targetLang,
    translateOnline,
    anathemetronAvailable,
    libreAvailable,
    translateWithLibre,
  ]);

  // ── Swap languages ────────────────────────────────────────

  const handleSwapLanguages = useCallback(() => {
    if (sourceLang === 'auto') {
      // If auto-detect, use detected language or default to en
      setSourceLang(targetLang);
      setTargetLang('en');
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    // Also swap text
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText('');
    }
  }, [sourceLang, targetLang, translatedText]);

  // ── Clear text ────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
    setError(null);
    setDetectedLang(null);
    setTranslatedPageContent(null);
    setShowTranslatedPage(false);
  }, []);

  // ── Language select style ─────────────────────────────────

  const selectStyle: React.CSSProperties = {
    padding: '5px 8px',
    background: 'var(--void-black)',
    border: '1px solid var(--iron-gray)',
    color: 'var(--sacred-white)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.05em',
    outline: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
  };

  // ── Checkbox style ────────────────────────────────────────

  const checkboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 6px',
    background: 'var(--void-black)',
    border: '1px solid var(--iron-gray)',
    cursor: 'pointer',
    fontSize: '9px',
    color: 'var(--parchment-dim)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages
            size={14}
            strokeWidth={1.5}
            style={{ color: 'var(--noosphere-cyan)' }}
          />
          <span
            style={{
              color: 'var(--noosphere-cyan)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Anathemetron Translate
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Globe
            size={10}
            style={{
              color: translateOnline
                ? 'var(--noosphere-cyan)'
                : translateChecking
                  ? 'var(--text-muted)'
                  : 'var(--omnissiah-red)',
            }}
          />
          <span
            style={{
              fontSize: '8px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              color: translateOnline
                ? 'var(--noosphere-cyan)'
                : translateChecking
                  ? 'var(--text-muted)'
                  : 'var(--omnissiah-red)',
            }}
          >
            {translateChecking
              ? '...'
              : !translateOnline
                ? 'OFFLINE'
                : activeBackend === 'libre'
                  ? 'LIBRE'
                  : activeBackend === 'anathemetron'
                    ? 'ANATHEMETRON'
                    : anathemetronAvailable
                      ? 'ANATHEMETRON'
                      : 'LIBRE'}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div style={{ padding: '10px' }}>
          {/* ════════════════════════════════════════════════════ */}
          {/* PAGE TRANSLATION SECTION                           */}
          {/* ════════════════════════════════════════════════════ */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              marginBottom: '12px',
            }}
          >
            {/* Section header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--void-black)',
                borderBottom: '1px solid var(--iron-gray)',
              }}
            >
              <Monitor size={12} style={{ color: 'var(--cogitator-gold)' }} />
              <span
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  flex: 1,
                }}
              >
                Page Translation
              </span>
              {/* Toggle */}
              <button
                onClick={() => autoTx.setEnabled(!autoTx.enabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: autoTx.enabled
                    ? 'var(--noosphere-cyan)'
                    : 'var(--text-muted)',
                  padding: 0,
                }}
                title={
                  autoTx.enabled
                    ? 'Auto-translate ON'
                    : 'Auto-translate OFF'
                }
              >
                {autoTx.enabled ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
              </button>
            </div>

            {/* Auto-translate settings */}
            <div style={{ padding: '10px' }}>
              {/* Auto-translate toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--parchment-dim)',
                    letterSpacing: '0.08em',
                  }}
                >
                  Auto-translate foreign pages
                </span>
                <button
                  onClick={() => autoTx.setEnabled(!autoTx.enabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    background: autoTx.enabled
                      ? 'rgba(0, 191, 191, 0.08)'
                      : 'var(--void-black)',
                    border: `1px solid ${
                      autoTx.enabled
                        ? 'var(--noosphere-cyan)'
                        : 'var(--iron-gray)'
                    }`,
                    color: autoTx.enabled
                      ? 'var(--noosphere-cyan)'
                      : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {autoTx.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Target language */}
              <div style={{ marginBottom: '10px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '8px',
                    color: 'var(--parchment-dim)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Target Language
                </label>
                <select
                  value={autoTx.targetLang}
                  onChange={(e) => autoTx.setTargetLang(e.target.value)}
                  style={{
                    ...selectStyle,
                    width: '100%',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  }}
                >
                  {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                    <option key={`atx_${lang.code}`} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exclude languages */}
              <div style={{ marginBottom: '10px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '8px',
                    color: 'var(--parchment-dim)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  Do Not Translate (Whitelist)
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    maxHeight: '80px',
                    overflow: 'auto',
                    padding: '4px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                  }}
                >
                  {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => {
                    const isExcluded = autoTx.excludeLangs.includes(lang.code);
                    return (
                      <button
                        key={`exc_${lang.code}`}
                        onClick={() => autoTx.toggleExcludeLang(lang.code)}
                        style={{
                          ...checkboxStyle,
                          borderColor: isExcluded
                            ? 'var(--omnissiah-red)'
                            : 'var(--iron-gray)',
                          color: isExcluded
                            ? 'var(--omnissiah-red)'
                            : 'var(--parchment-dim)',
                          background: isExcluded
                            ? 'rgba(255, 0, 0, 0.06)'
                            : 'var(--void-black)',
                        }}
                        title={
                          isExcluded
                            ? 'Click to translate from this language'
                            : 'Click to skip translation from this language'
                        }
                      >
                        {isExcluded ? '✗' : '✓'} {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual translate page button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleTranslatePage}
                isLoading={isAutoTranslating}
                disabled={!translateOnline || isAutoTranslating}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {isAutoTranslating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileText size={12} />
                )}
                TRANSLATE THIS PAGE
              </Button>

              {/* Progress bar */}
              {isAutoTranslating && (
                <div
                  style={{
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '3px',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--noosphere-cyan)',
                        fontSize: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      Transmuting page content...
                    </span>
                    <span
                      style={{
                        color: 'var(--noosphere-cyan)',
                        fontSize: '8px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {autoTranslateProgress}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '3px',
                      background: 'var(--void-black)',
                      border: '1px solid var(--iron-gray)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${autoTranslateProgress}%`,
                        height: '100%',
                        background: 'var(--noosphere-cyan)',
                        transition: 'width 200ms ease',
                        boxShadow: '0 0 6px var(--noosphere-cyan)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Page language detection */}
              {pageLang && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    background: 'rgba(0, 191, 191, 0.05)',
                    border: '1px solid var(--noosphere-cyan-dim)',
                  }}
                >
                  <Globe
                    size={10}
                    style={{ color: 'var(--noosphere-cyan)' }}
                  />
                  <span
                    style={{
                      color: 'var(--noosphere-cyan)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Page language: {LANG_CODE_MAP[pageLang] || pageLang}
                    {autoTx.shouldTranslate(pageLang) && (
                      <span style={{ color: 'var(--cogitator-gold)', marginLeft: '6px' }}>
                        (will auto-translate)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Original / Translated toggle */}
              {translatedPageContent && (
                <div
                  style={{
                    display: 'flex',
                    marginTop: '8px',
                    border: '1px solid var(--iron-gray)',
                  }}
                >
                  <button
                    onClick={() => setShowTranslatedPage(false)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: !showTranslatedPage
                        ? 'rgba(255, 0, 0, 0.1)'
                        : 'var(--void-black)',
                      border: 'none',
                      borderRight: '1px solid var(--iron-gray)',
                      color: !showTranslatedPage
                        ? 'var(--omnissiah-red)'
                        : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setShowTranslatedPage(true)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: showTranslatedPage
                        ? 'rgba(0, 191, 191, 0.1)'
                        : 'var(--void-black)',
                      border: 'none',
                      color: showTranslatedPage
                        ? 'var(--noosphere-cyan)'
                        : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    Translated
                  </button>
                </div>
              )}

              {/* Translated content preview */}
              {translatedPageContent && showTranslatedPage && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '8px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--noosphere-cyan-dim)',
                    maxHeight: '150px',
                    overflow: 'auto',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--noosphere-cyan)',
                      fontSize: '11px',
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {translatedPageContent.slice(0, 1000)}
                    {translatedPageContent.length > 1000 && '...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Server Offline Warning ──────────────────────── */}
          {!translateChecking && !translateOnline && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px',
                border: '1px solid var(--omnissiah-red-dim)',
                background: 'rgba(255,0,0,0.05)',
                marginBottom: '10px',
              }}
            >
              <AlertTriangle
                size={14}
                style={{
                  color: 'var(--omnissiah-red)',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              />
              <div>
                <div
                  style={{
                    color: 'var(--omnissiah-red)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '4px',
                  }}
                >
                  Translation Offline
                </div>
                <div
                  style={{
                    color: 'var(--parchment-dim)',
                    fontSize: '9px',
                    lineHeight: 1.5,
                  }}
                >
                  Start Anathemetron:
                  <br />
                  <code
                    style={{
                      color: 'var(--noosphere-cyan)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                    }}
                  >
                    systemctl --user start heretic-router.service
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* ── Language Selectors ──────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <select
              value={sourceLang}
              onChange={(e) => {
                setSourceLang(e.target.value);
                setDetectedLang(null);
              }}
              style={selectStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={`src_${lang.code}`} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleSwapLanguages}
              title="Swap languages"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                e.currentTarget.style.color = 'var(--cogitator-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              <ArrowRightLeft size={12} />
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={selectStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
              }}
            >
              {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                <option key={`tgt_${lang.code}`} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Detected Language Indicator ─────────────────── */}
          {detectedLang && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                padding: '4px 8px',
                background: 'rgba(0,191,191,0.05)',
                border: '1px solid var(--noosphere-cyan-dim)',
              }}
            >
              <Sparkles
                size={10}
                style={{ color: 'var(--noosphere-cyan)' }}
              />
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Detected: {detectedLang}
              </span>
            </div>
          )}

          {/* ── Source Textarea ─────────────────────────────── */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Source Text
              </span>
              {sourceText && (
                <button
                  onClick={handleClear}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to transmute..."
              rows={6}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow =
                  '0 0 8px rgba(255,0,0,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleTranslate();
                }
              }}
            />
          </div>

          {/* ── Translate Button ────────────────────────────── */}
          <div style={{ marginBottom: '10px' }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleTranslate}
              isLoading={isTranslating}
              disabled={!sourceText.trim() || !translateOnline}
              style={{ width: '100%' }}
            >
              {isTranslating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Languages size={14} />
              )}
              TRANSMUTE
            </Button>
          </div>

          {/* ── Error Message ───────────────────────────────── */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px',
                border: '1px solid var(--omnissiah-red-dim)',
                background: 'rgba(255,0,0,0.05)',
                marginBottom: '10px',
              }}
            >
              <AlertTriangle
                size={12}
                style={{
                  color: 'var(--omnissiah-red)',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />
              <span
                style={{
                  color: 'var(--omnissiah-red)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </span>
            </div>
          )}

          {/* ── Result Textarea ─────────────────────────────── */}
          {translatedText && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    color: 'var(--cogitator-gold)',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  Transmutation
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard
                      .writeText(translatedText)
                      .catch(() => {});
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                  }}
                >
                  Copy
                </button>
              </div>
              <textarea
                value={translatedText}
                readOnly
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--cogitator-gold-dim)',
                  color: 'var(--cogitator-gold)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* ── Empty state hint ────────────────────────────── */}
          {!translatedText && !isTranslating && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '30px 16px',
                gap: '10px',
                color: 'var(--text-muted)',
              }}
            >
              <BookOpen size={28} strokeWidth={1} style={{ opacity: 0.3 }} />
              <span
                style={{
                  fontSize: '10px',
                  textAlign: 'center',
                  maxWidth: '200px',
                  lineHeight: 1.5,
                }}
              >
                Enter text above and invoke the Anathemetron to transmute
                between tongues.
                <br />
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--parchment-dim)',
                    marginTop: '6px',
                    display: 'block',
                  }}
                >
                  Ctrl+Enter to invoke
                </span>
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Utility: chunk text for batch translation
// ═══════════════════════════════════════════════════════════

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)];
}

// ═══════════════════════════════════════════════════════════
// Utility: translate text programmatically
// ═══════════════════════════════════════════════════════════

export async function translateText(
  text: string,
  source: string,
  target: string,
): Promise<string> {
  try {
    const online = await window.electronAPI.ollama.checkStatus();
    if (online) {
      return translateViaAnathemetron(text, source, target, LANG_CODE_MAP);
    }
  } catch {
    // fall through to LibreTranslate
  }

  const response = await fetch(TRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source, target, format: 'text' }),
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status}`);
  }

  const data: TranslateResponse = await response.json();
  return data.translatedText;
}

// ═══════════════════════════════════════════════════════════
// Utility: auto-translate hook for external use
// ═══════════════════════════════════════════════════════════

export { useAutoTranslate };
