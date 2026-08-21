// ═══════════════════════════════════════════════════════════════════════════════
// TEXT TO SPEECH — Vocalization Cogitator
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Square, Globe, Zap, Activity, Type } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface TTSOptions {
  speed: number;
  pitch: number;
  volume: number;
  lang: string;
  voice: SpeechSynthesisVoice | null;
}

interface TTSState {
  text: string;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  options: TTSOptions;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LANG = 'en-US';

const STORAGE_KEY = 'cogitator_tts_options';

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// ── Helper Functions ─────────────────────────────────────────────────────────

function loadSavedOptions(): Partial<TTSOptions> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

function saveOptions(options: TTSOptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      speed: options.speed,
      pitch: options.pitch,
      volume: options.volume,
      lang: options.lang,
    }));
  } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TextToSpeech() {
  const savedOpts = loadSavedOptions();

  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speed, setSpeed] = useState(savedOpts.speed ?? 1.0);
  const [pitch, setPitch] = useState(savedOpts.pitch ?? 1.0);
  const [volume, setVolume] = useState(savedOpts.volume ?? 1.0);
  const [lang, setLang] = useState(savedOpts.lang ?? DEFAULT_LANG);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Load voices ────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── Save options on change ─────────────────────────────────────────────────

  useEffect(() => {
    saveOptions({ speed, pitch, volume, lang, voice: null });
  }, [speed, pitch, volume, lang]);

  // ── Cancel speech on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const speak = useCallback((textToSpeak: string) => {
    if (!textToSpeak.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak.trim());
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    if (voices[selectedVoiceIdx]) {
      utterance.voice = voices[selectedVoiceIdx];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [speed, pitch, volume, lang, voices, selectedVoiceIdx]);

  const handleSpeak = useCallback(() => {
    speak(text);
  }, [speak, text]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handleSpeakSelectedPageText = useCallback(async () => {
    try {
      // Try to get selected text from the active page via electron API
      const selectedText = await window.electronAPI?.tabs?.getSelectedText?.();
      if (selectedText && selectedText.trim()) {
        setText(selectedText);
        speak(selectedText);
      } else {
        // Fallback: try to get page text content
        const pageText = await window.electronAPI?.tabs?.getPageText?.();
        if (pageText && pageText.trim()) {
          setText(pageText);
          speak(pageText);
        }
      }
    } catch {
      // If electron API is not available, show placeholder
      const placeholder = 'The Machine Spirit awaits your command. Enter text above to vocalize.';
      setText(placeholder);
      speak(placeholder);
    }
  }, [speak]);

  // ── Filter voices by language ──────────────────────────────────────────────

  const filteredVoices = voices.filter((v) =>
    lang === 'all' ? true : v.lang.startsWith(lang)
  );

  const languages = Array.from(new Set(voices.map((v) => v.lang.split('-')[0]))).sort();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '10px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="mech-header">
        <Volume2 size={14} style={{ color: 'var(--omnissiah-red)' }} />
        <span>Vocalization Cogitator</span>
      </div>

      {/* ═══ Text Input ═══ */}
      <div
        style={{
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <Type size={11} />
          Text to Vocalize
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text for the Machine Spirit to speak..."
          rows={5}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.5,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* ═══ Controls ═══ */}
      <div
        style={{
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Language */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            <Globe size={11} />
            Language
          </label>
          <select
            value={lang}
            onChange={(e) => { setLang(e.target.value); setSelectedVoiceIdx(0); }}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Voice Selection */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            <Volume2 size={11} />
            Voice ({filteredVoices.length})
          </label>
          <select
            value={selectedVoiceIdx}
            onChange={(e) => setSelectedVoiceIdx(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {filteredVoices.map((voice, idx) => (
              <option key={`${voice.name}-${idx}`} value={idx}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={11} />
              Speed
            </span>
            <span style={{ color: 'var(--cogitator-gold)' }}>{speed.toFixed(2)}x</span>
          </label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {SPEED_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: '4px 10px',
                  background: speed === s ? 'rgba(255, 0, 0, 0.2)' : 'var(--void-black)',
                  border: `1px solid ${speed === s ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
                  color: speed === s ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{
              width: '100%',
              marginTop: '6px',
              accentColor: '#FF0000',
            }}
          />
        </div>

        {/* Pitch */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={11} />
              Pitch
            </span>
            <span style={{ color: 'var(--cogitator-gold)' }}>{pitch.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#00BFBF',
            }}
          />
        </div>

        {/* Volume */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={11} />
              Volume
            </span>
            <span style={{ color: 'var(--cogitator-gold)' }}>{Math.round(volume * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#C8A84B',
            }}
          />
        </div>
      </div>

      {/* ═══ Action Buttons ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleSpeak}
            disabled={!text.trim() || isSpeaking}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              background: isSpeaking
                ? 'rgba(0, 191, 191, 0.15)'
                : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
              border: `1px solid ${isSpeaking ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)'}`,
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              cursor: isSpeaking ? 'not-allowed' : 'pointer',
              opacity: !text.trim() ? 0.5 : 1,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isSpeaking && text.trim()) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSpeaking) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Volume2 size={14} />
            {isSpeaking ? 'Speaking...' : 'Speak'}
          </button>

          {isSpeaking && (
            <button
              onClick={handlePauseResume}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                background: 'rgba(200, 168, 75, 0.1)',
                border: '1px solid var(--cogitator-gold-dim)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!isSpeaking}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: isSpeaking ? 'var(--omnissiah-red)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              cursor: isSpeaking ? 'pointer' : 'not-allowed',
              opacity: isSpeaking ? 1 : 0.4,
            }}
          >
            <Square size={12} />
            Stop
          </button>
        </div>

        <button
          onClick={handleSpeakSelectedPageText}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            background: 'rgba(0, 191, 191, 0.08)',
            border: '1px solid var(--noosphere-cyan-dim)',
            color: 'var(--noosphere-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
            e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--noosphere-cyan-dim)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Zap size={12} />
          Speak Selected Page Text
        </button>
      </div>

      {/* ═══ Status ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--iron-gray)',
          marginTop: 'auto',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isSpeaking ? 'var(--noosphere-cyan)' : 'var(--steel-gray)',
            boxShadow: isSpeaking ? '0 0 6px var(--noosphere-cyan-glow)' : 'none',
          }}
        />
        <span>
          {isSpeaking
            ? isPaused ? 'Paused' : 'Vocalizing...'
            : voices.length > 0
              ? `${voices.length} voices loaded`
              : 'Loading voices...'}
        </span>
      </div>
    </div>
  );
}
