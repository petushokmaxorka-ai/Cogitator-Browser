// ═══ TIMER WIDGET ═══
// Sacred countdown timer / stopwatch — measures the flow of time
// in the service of the Omnissiah. Features Web Audio beep alarm
// and Dark Mechanicus styling with red glow when time is low.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface TimerWidgetProps {
  /** Initial seconds for the timer */
  initialSeconds?: number;
  /** Called when timer completes */
  onComplete?: () => void;
  /** Compact mode (floating widget) */
  compact?: boolean;
  /** Called when close/minimize is clicked */
  onMinimize?: () => void;
}

export interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isComplete: boolean;
}

// ── Helpers ────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeInput(input: string): number {
  // Parse "MM:SS" or "M:SS" or just seconds
  const parts = input.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(input) || 0;
}

/**
 * Play a beep sound using Web Audio API.
 */
function playBeep(frequency = 880, duration = 0.2, type: OscillatorType = 'square'): void {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn('[TimerWidget] Audio beep failed:', err);
  }
}

// ── Component ──────────────────────────────────────────────

const TimerWidget: React.FC<TimerWidgetProps> = ({
  initialSeconds = 60,
  onComplete,
  compact = false,
  onMinimize,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [inputValue, setInputValue] = useState(formatTime(initialSeconds));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLowTime, setIsLowTime] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepCountRef = useRef(0);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = prev - 1;
          if (next <= 10 && next > 0) {
            setIsLowTime(true);
            if (soundEnabled) playBeep(440, 0.1);
          }
          if (next <= 0) {
            // Timer complete
            setIsRunning(false);
            setIsComplete(true);
            setIsLowTime(false);
            // Alarm beeps
            if (soundEnabled) {
              beepCountRef.current = 0;
              const alarmInterval = setInterval(() => {
                playBeep(880 + beepCountRef.current * 100, 0.2);
                beepCountRef.current++;
                if (beepCountRef.current >= 5) {
                  clearInterval(alarmInterval);
                }
              }, 300);
            }
            onComplete?.();
            return 0;
          }
          return next;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isRunning, remainingSeconds, soundEnabled, onComplete]);

  // ── Handlers ─────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (remainingSeconds <= 0) return;
    setIsComplete(false);
    setIsRunning(true);
  }, [remainingSeconds]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setIsLowTime(false);
    const seconds = parseTimeInput(inputValue);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
  }, [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow partial input while editing
    if (/^[\d:]*$/.test(val) && val.length <= 5) {
      setInputValue(val);
      if (!isRunning) {
        const seconds = parseTimeInput(val);
        setTotalSeconds(seconds);
        setRemainingSeconds(seconds);
      }
    }
  }, [isRunning]);

  const handleInputBlur = useCallback(() => {
    const seconds = parseTimeInput(inputValue);
    const formatted = formatTime(seconds);
    setInputValue(formatted);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
  }, [inputValue]);

  const adjustTime = useCallback((deltaSeconds: number) => {
    if (isRunning) return;
    setRemainingSeconds((prev) => Math.max(0, prev + deltaSeconds));
    setTotalSeconds((prev) => Math.max(0, prev + deltaSeconds));
    setInputValue((prev) => {
      const seconds = parseTimeInput(prev) + deltaSeconds;
      return formatTime(Math.max(0, seconds));
    });
  }, [isRunning]);

  // ── Progress ring calculation ────────────────────────────

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const radius = compact ? 24 : 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // ── Compact Mode ─────────────────────────────────────────

  if (compact) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          background: 'var(--iron-dark)',
          border: `1px solid ${isLowTime ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
          boxShadow: isLowTime
            ? 'var(--glow-red), 0 4px 20px rgba(0,0,0,0.5)'
            : '0 4px 20px rgba(0,0,0,0.5)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          transition: 'all 0.3s',
          animation: isLowTime ? 'pulse 1s infinite' : 'none',
        }}
      >
        <Timer size={14} style={{ color: 'var(--cogitator-gold)' }} />
        <span
          style={{
            fontSize: 'var(--font-size-md)',
            color: isComplete ? 'var(--omnissiah-red)' : isLowTime ? 'var(--omnissiah-red)' : 'var(--sacred-white)',
            fontWeight: 'bold',
            textShadow: isLowTime ? '0 0 8px rgba(255, 0, 0, 0.5)' : 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(remainingSeconds)}
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {!isRunning ? (
            <button
              onClick={handleStart}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--noosphere-cyan)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <Play size={12} />
            </button>
          ) : (
            <button
              onClick={handlePause}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cogitator-gold)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <Pause size={12} />
            </button>
          )}
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: soundEnabled ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
        </div>
      </div>
    );
  }

  // ── Full Mode ────────────────────────────────────────────

  return (
    <div
      style={{
        background: 'var(--iron-dark)',
        border: `1px solid ${isLowTime ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
        padding: '20px',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: isLowTime ? 'var(--glow-red)' : 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <span
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          \u2550\u2550\u2550 Sacred Timer \u2550\u2550\u2550
        </span>
        {onMinimize && (
          <button
            onClick={onMinimize}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            [\u2212]
          </button>
        )}
      </div>

      {/* Progress ring + time display */}
      <div style={{ position: 'relative', width: radius * 2 + 16, height: radius * 2 + 16 }}>
        <svg
          width={radius * 2 + 16}
          height={radius * 2 + 16}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx={radius + 8}
            cy={radius + 8}
            r={radius}
            fill="none"
            stroke="var(--iron-gray)"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx={radius + 8}
            cy={radius + 8}
            r={radius}
            fill="none"
            stroke={isComplete ? 'var(--omnissiah-red)' : isLowTime ? 'var(--omnissiah-red)' : 'var(--cogitator-gold)'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
              filter: isLowTime
                ? 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.5))'
                : 'drop-shadow(0 0 4px rgba(200, 168, 75, 0.3))',
            }}
          />
        </svg>
        {/* Time text in center */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          {isRunning ? (
            <span
              style={{
                fontSize: 'var(--font-size-xl)',
                color: isComplete ? 'var(--omnissiah-red)' : isLowTime ? 'var(--omnissiah-red)' : 'var(--sacred-white)',
                fontWeight: 'bold',
                textShadow: isLowTime ? '0 0 12px rgba(255, 0, 0, 0.6)' : '0 0 8px rgba(232, 232, 232, 0.2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTime(remainingSeconds)}
            </span>
          ) : (
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              disabled={isRunning}
              style={{
                width: '80px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'bold',
                textAlign: 'center',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = 'var(--omnissiah-red)';
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderBottomColor = 'var(--iron-gray)';
              }}
            />
          )}
        </div>
      </div>

      {/* Quick adjust buttons */}
      {!isRunning && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {[-60, -10, -1, 1, 10, 60].map((delta) => (
            <button
              key={delta}
              onClick={() => adjustTime(delta)}
              style={{
                padding: '4px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = delta > 0 ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)';
                e.currentTarget.style.color = delta > 0 ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              {delta > 0 ? `+${delta}` : `${delta}`}
            </button>
          ))}
        </div>
      )}

      {/* Control buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={remainingSeconds <= 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: remainingSeconds > 0
                ? 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))'
                : 'var(--iron-gray)',
              border: '1px solid var(--omnissiah-red)',
              color: remainingSeconds > 0 ? 'var(--sacred-white)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: remainingSeconds > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (remainingSeconds > 0) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (remainingSeconds > 0) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Play size={12} />
            Start
          </button>
        ) : (
          <button
            onClick={handlePause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: 'linear-gradient(135deg, var(--cogitator-gold-dim), var(--iron-dark))',
              border: '1px solid var(--cogitator-gold)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--glow-gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Pause size={12} />
            Pause
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
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--parchment-dim)';
            e.currentTarget.style.color = 'var(--sacred-white)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.color = 'var(--parchment-dim)';
          }}
        >
          <RotateCcw size={12} />
          Reset
        </button>

        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: soundEnabled ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {/* Completion message */}
      {isComplete && (
        <div
          style={{
            color: 'var(--omnissiah-red)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            textShadow: '0 0 8px rgba(255, 0, 0, 0.5)',
            animation: 'pulse 1s infinite',
          }}
        >
          \u26A0 Time elapsed. The Omnissiah waits. \u26A0
        </div>
      )}
    </div>
  );
};

export default TimerWidget;
