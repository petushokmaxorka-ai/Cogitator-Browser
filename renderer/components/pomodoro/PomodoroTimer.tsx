// ═══════════════════════════════════════════════════════════
// POMODORO TIMER — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Work: 25m -> Short Break: 5m -> ... -> Long Break: 15m (after 4 cycles)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  X,
  Check,
  Timer,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

type TimerPhase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
};

const STORAGE_KEY_SETTINGS = 'cogitator_pomodoro_settings';

const PHASE_COLORS: Record<TimerPhase, string> = {
  work: '#FF0000',
  shortBreak: '#00BFBF',
  longBreak: '#C8A84B',
};

const PHASE_LABELS: Record<TimerPhase, string> = {
  work: 'WORK',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
};

// ── Helpers ─────────────────────────────────────────────────

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: PomodoroSettings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ───────────────────────────────────────────────

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0); // completed work cycles
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime =
    phase === 'work'
      ? settings.workDuration * 60
      : phase === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;

  // ── Timer Logic ───────────────────────────────────────────

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Phase complete
          setIsRunning(false);
          setPhase((currentPhase) => {
            if (currentPhase === 'work') {
              const nextCycle = cycleCount + 1;
              setCycleCount(nextCycle);
              // After 4 work cycles -> long break
              const nextPhase = nextCycle % 4 === 0 ? 'longBreak' : 'shortBreak';
              const nextDuration =
                nextCycle % 4 === 0
                  ? settings.longBreakDuration * 60
                  : settings.shortBreakDuration * 60;
              setTimeLeft(nextDuration);
              if (settings.autoStartBreaks) {
                setTimeout(() => setIsRunning(true), 500);
              }
              return nextPhase;
            } else {
              // Break complete -> back to work
              setTimeLeft(settings.workDuration * 60);
              if (settings.autoStartBreaks) {
                setTimeout(() => setIsRunning(true), 500);
              }
              return 'work';
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, cycleCount, settings, phase]);

  // ── Controls ──────────────────────────────────────────────

  const handleStart = useCallback(() => setIsRunning(true), []);
  const handlePause = useCallback(() => setIsRunning(false), []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setPhase('work');
    setTimeLeft(settings.workDuration * 60);
    setCycleCount(0);
  }, [settings.workDuration]);

  const handleSkip = useCallback(() => {
    setIsRunning(false);
    if (phase === 'work') {
      const nextCycle = cycleCount + 1;
      setCycleCount(nextCycle);
      const nextPhase = nextCycle % 4 === 0 ? 'longBreak' : 'shortBreak';
      setPhase(nextPhase);
      setTimeLeft(
        nextCycle % 4 === 0
          ? settings.longBreakDuration * 60
          : settings.shortBreakDuration * 60
      );
    } else {
      setPhase('work');
      setTimeLeft(settings.workDuration * 60);
    }
  }, [phase, cycleCount, settings]);

  const handleSaveSettings = useCallback(
    (newSettings: PomodoroSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
      setTimeLeft(newSettings.workDuration * 60);
      setPhase('work');
      setIsRunning(false);
      setCycleCount(0);
      setShowSettings(false);
    },
    []
  );

  // ── SVG Timer Circle ──────────────────────────────────────

  const radius = 90;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const dashOffset = circumference * (1 - progress);
  const currentColor = PHASE_COLORS[phase];

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* ═══ Header ═══ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Timer size={14} style={{ color: currentColor }} />
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            POMODORO
          </span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            padding: '4px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
        >
          <Settings size={12} />
        </button>
      </div>

      {/* ═══ SVG Timer ═══ */}
      <div style={{ position: 'relative', marginTop: '30px' }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Background circle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="var(--iron-gray)"
            strokeWidth={strokeWidth}
            opacity={0.5}
          />
          {/* Progress circle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            style={{
              filter: `drop-shadow(0 0 6px ${currentColor}66)`,
              transition: 'stroke-dashoffset 1s linear, stroke 300ms ease',
            }}
          />
        </svg>

        {/* Timer text overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          {/* Phase label */}
          <div
            style={{
              color: currentColor,
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '4px',
              textShadow: `0 0 8px ${currentColor}44`,
            }}
          >
            {PHASE_LABELS[phase]}
          </div>
          {/* Time display */}
          <div
            style={{
              color: 'var(--sacred-white)',
              fontSize: '38px',
              letterSpacing: '0.05em',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {formatTime(timeLeft)}
          </div>
          {/* Status */}
          <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '4px', letterSpacing: '0.1em' }}>
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </div>
        </div>
      </div>

      {/* ═══ Cycle Counter ═══ */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
        <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', marginRight: '4px' }}>
          CYCLES
        </span>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: i < cycleCount % 4 || (cycleCount > 0 && cycleCount % 4 === 0 && i < 4 && phase !== 'work')
                ? currentColor
                : 'var(--iron-gray)',
              boxShadow: i < cycleCount % 4
                ? `0 0 6px ${currentColor}66`
                : 'none',
              transition: 'all 300ms ease',
            }}
          />
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: '9px', marginLeft: '4px' }}>
          #{Math.floor(cycleCount / 4) * 4 + (cycleCount % 4)}
        </span>
      </div>

      {/* ═══ Controls ═══ */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        {isRunning ? (
          <button
            onClick={handlePause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: 'var(--omnissiah-red-dim)',
              border: '1px solid var(--omnissiah-red)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: 'var(--glow-red)',
            }}
          >
            <Pause size={14} /> PAUSE
          </button>
        ) : (
          <button
            onClick={handleStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: phase === 'work' ? 'var(--omnissiah-red-dim)' : phase === 'shortBreak' ? 'rgba(0, 191, 191, 0.15)' : 'rgba(200, 168, 75, 0.15)',
              border: `1px solid ${currentColor}`,
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: `0 0 10px ${currentColor}44`,
            }}
          >
            <Play size={14} /> START
          </button>
        )}

        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--parchment)'; e.currentTarget.style.color = 'var(--parchment)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
        >
          <RotateCcw size={14} /> RESET
        </button>

        <button
          onClick={handleSkip}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; e.currentTarget.style.color = 'var(--cogitator-gold)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
        >
          <SkipForward size={14} /> SKIP
        </button>
      </div>

      {/* ═══ Settings Modal ═══ */}
      {showSettings && (
        <PomodoroSettingsModal
          currentSettings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Settings Modal Sub-Component
// ═══════════════════════════════════════════════════════════

function PomodoroSettingsModal({
  currentSettings,
  onSave,
  onClose,
}: {
  currentSettings: PomodoroSettings;
  onSave: (s: PomodoroSettings) => void;
  onClose: () => void;
}) {
  const [work, setWork] = useState(currentSettings.workDuration);
  const [shortBreak, setShortBreak] = useState(currentSettings.shortBreakDuration);
  const [longBreak, setLongBreak] = useState(currentSettings.longBreakDuration);
  const [autoStart, setAutoStart] = useState(currentSettings.autoStartBreaks);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 10, 10, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--iron-dark)',
          border: '1px solid var(--omnissiah-red)',
          padding: '16px',
          width: '100%',
          maxWidth: '300px',
          boxShadow: 'var(--glow-red)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            TIMER SETTINGS
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Work Duration */}
        <DurationInput label="WORK DURATION" value={work} onChange={setWork} color="#FF0000" min={1} max={60} />
        <DurationInput label="SHORT BREAK" value={shortBreak} onChange={setShortBreak} color="#00BFBF" min={1} max={30} />
        <DurationInput label="LONG BREAK" value={longBreak} onChange={setLongBreak} color="#C8A84B" min={1} max={60} />

        {/* Auto-start */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '16px', cursor: 'pointer' }}>
          <div
            onClick={() => setAutoStart(!autoStart)}
            style={{
              width: '16px',
              height: '16px',
              border: '1px solid var(--iron-gray)',
              background: autoStart ? 'var(--noosphere-cyan)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {autoStart && <Check size={12} color="#000" />}
          </div>
          <span style={{ color: 'var(--parchment-dim)', fontSize: '10px', letterSpacing: '0.1em' }}>
            AUTO-START BREAKS
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => onSave({ workDuration: work, shortBreakDuration: shortBreak, longBreakDuration: longBreak, autoStartBreaks: autoStart })}
            style={{
              padding: '6px 14px',
              background: 'var(--omnissiah-red-dim)',
              border: '1px solid var(--omnissiah-red)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: 'var(--glow-red)',
            }}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Duration Input Sub-Component ───────────────────────────

function DurationInput({
  label,
  value,
  onChange,
  color,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  min: number;
  max: number;
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em' }}>{label}</label>
        <span style={{ color, fontSize: '12px', fontWeight: 'bold' }}>{value} MIN</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
