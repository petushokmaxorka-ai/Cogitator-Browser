// ═══ DARK MODE SCHEDULE ═══
// Night Intensifier — when the void deepens, the CRT effect
// strengthens. Scanlines thicken, glow intensifies, sacred
// colors deepen their resonance.
//
// "As the sun flees the noosphere, the Machine God's
//  presence grows ever stronger."

import { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  Clock,
  Sun,
  Zap,
  AlertTriangle,
  Check,
} from 'lucide-react';
import type { NightSchedule } from '../../../shared/types';

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_night_schedule';

const INTENSITY_LEVELS: { value: NightSchedule['intensity']; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Subtle scanlines, soft glow' },
  { value: 'medium', label: 'Medium', description: 'Visible scanlines, moderate glow' },
  { value: 'high', label: 'High', description: 'Dense scanlines, intense red glow' },
];

// ── Default schedule ────────────────────────────────────────

const DEFAULT_SCHEDULE: NightSchedule = {
  enabled: false,
  startTime: '22:00',
  endTime: '06:00',
  intensity: 'medium',
};

// ── Load from localStorage ──────────────────────────────────

function loadSchedule(): NightSchedule {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SCHEDULE, ...parsed };
    }
  } catch {
    // Corrupted storage — use defaults
  }
  return { ...DEFAULT_SCHEDULE };
}

// ── Check if current time is within night window ────────────

function isNightTime(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same day window (e.g., 14:00 to 18:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g., 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// ── Apply night CSS variables to document root ──────────────

function applyNightIntensity(intensity: NightSchedule['intensity'], active: boolean): void {
  const root = document.documentElement;

  if (!active) {
    root.style.removeProperty('--scanline-opacity');
    root.style.removeProperty('--glow-intensity');
    root.style.removeProperty('--color-saturation');
    root.style.removeProperty('--night-active');
    return;
  }

  const config = {
    low: { scanlineOpacity: '0.15', glowIntensity: '1.2', saturation: '1.05' },
    medium: { scanlineOpacity: '0.3', glowIntensity: '1.5', saturation: '1.15' },
    high: { scanlineOpacity: '0.5', glowIntensity: '2.0', saturation: '1.3' },
  };

  const c = config[intensity];
  root.style.setProperty('--scanline-opacity', c.scanlineOpacity);
  root.style.setProperty('--glow-intensity', c.glowIntensity);
  root.style.setProperty('--color-saturation', c.saturation);
  root.style.setProperty('--night-active', '1');
}

// ── Component ───────────────────────────────────────────────

export default function DarkModeSchedule() {
  // ── State ───────────────────────────────────────────────
  const [schedule, setSchedule] = useState<NightSchedule>(loadSchedule);
  const [isNight, setIsNight] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Check night status on mount and every minute ────────

  useEffect(() => {
    const check = () => {
      const night = schedule.enabled && isNightTime(schedule.startTime, schedule.endTime);
      setIsNight(night);
      applyNightIntensity(schedule.intensity, night);
    };

    check();
    const interval = setInterval(check, 60000); // Check every minute

    return () => {
      clearInterval(interval);
      applyNightIntensity('medium', false); // Cleanup on unmount
    };
  }, [schedule]);

  // ── Persist changes ─────────────────────────────────────

  const updateSchedule = useCallback((updates: Partial<NightSchedule>) => {
    setSchedule((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  // ── Time input style ────────────────────────────────────

  const timeInputStyle: React.CSSProperties = {
    padding: '6px 8px',
    background: 'var(--void-black)',
    border: '1px solid var(--iron-gray)',
    color: 'var(--sacred-white)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.05em',
    outline: 'none',
    cursor: 'pointer',
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--iron-gray)',
        }}
      >
        <Moon
          size={14}
          strokeWidth={1.5}
          style={{ color: 'var(--cogitator-gold)' }}
        />
        <span
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          Night Intensify
        </span>
        {isNight && (
          <span
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid var(--omnissiah-red)',
              color: 'var(--omnissiah-red)',
              fontSize: '8px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              textShadow: '0 0 8px rgba(255, 0, 0, 0.4)',
            }}
          >
            <Zap size={8} />
            ACTIVE
          </span>
        )}
      </div>

      {/* ── Enable Toggle ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: 'var(--void-black)',
          border: '1px solid var(--iron-gray)',
          marginBottom: '10px',
          cursor: 'pointer',
        }}
        onClick={() => updateSchedule({ enabled: !schedule.enabled })}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {schedule.enabled ? (
            <Moon size={14} style={{ color: 'var(--omnissiah-red)' }} />
          ) : (
            <Sun size={14} style={{ color: 'var(--parchment-dim)' }} />
          )}
          <span
            style={{
              color: schedule.enabled ? 'var(--sacred-white)' : 'var(--parchment-dim)',
              fontSize: '11px',
              letterSpacing: '0.08em',
            }}
          >
            Enable Night Intensify
          </span>
        </div>
        <div
          style={{
            width: '32px',
            height: '16px',
            background: schedule.enabled ? 'var(--omnissiah-red)' : 'var(--iron-gray)',
            borderRadius: '8px',
            position: 'relative',
            transition: 'all 200ms ease',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#000000',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: schedule.enabled ? '18px' : '2px',
              transition: 'left 200ms ease',
            }}
          />
        </div>
      </div>

      {/* ── Time Selectors ────────────────────────────────── */}
      {schedule.enabled && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            {/* FROM */}
            <div style={{ flex: 1 }}>
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
                <Clock size={8} style={{ display: 'inline', marginRight: '3px' }} />
                From
              </label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => updateSchedule({ startTime: e.target.value })}
                style={timeInputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                }}
              />
            </div>

            {/* Arrow */}
            <div
              style={{
                paddingTop: '14px',
                color: 'var(--parchment-dim)',
                fontSize: '12px',
              }}
            >
              →
            </div>

            {/* TO */}
            <div style={{ flex: 1 }}>
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
                <Clock size={8} style={{ display: 'inline', marginRight: '3px' }} />
                To
              </label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => updateSchedule({ endTime: e.target.value })}
                style={timeInputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                }}
              />
            </div>
          </div>

          {/* ── Overnight Note ──────────────────────────── */}
          {(() => {
            const [sh, sm] = schedule.startTime.split(':').map(Number);
            const [eh, em] = schedule.endTime.split(':').map(Number);
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;
            if (startMin > endMin) {
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    background: 'rgba(0, 191, 191, 0.05)',
                    border: '1px solid var(--noosphere-cyan-dim)',
                    marginBottom: '10px',
                  }}
                >
                  <Moon size={10} style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }} />
                  <span
                    style={{
                      color: 'var(--noosphere-cyan)',
                      fontSize: '9px',
                      lineHeight: 1.4,
                    }}
                  >
                    Overnight mode — intensifier spans across midnight.
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* ── Intensity Selector ──────────────────────── */}
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
              <Zap size={8} style={{ display: 'inline', marginRight: '3px' }} />
              CRT Intensity
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {INTENSITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => updateSchedule({ intensity: level.value })}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    background:
                      schedule.intensity === level.value
                        ? 'rgba(255, 0, 0, 0.12)'
                        : 'var(--void-black)',
                    border: `1px solid ${
                      schedule.intensity === level.value
                        ? 'var(--omnissiah-red)'
                        : 'var(--iron-gray)'
                    }`,
                    color:
                      schedule.intensity === level.value
                        ? 'var(--omnissiah-red)'
                        : 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (schedule.intensity !== level.value) {
                      e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (schedule.intensity !== level.value) {
                      e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    {level.label}
                  </div>
                  <div
                    style={{
                      fontSize: '7px',
                      color:
                        schedule.intensity === level.value
                          ? 'var(--omnissiah-red)'
                          : 'var(--text-muted)',
                      lineHeight: 1.3,
                    }}
                  >
                    {level.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Preview ─────────────────────────────────── */}
          <div
            style={{
              padding: '10px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '8px',
                  color: 'var(--parchment-dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Preview
              </span>
              <span
                style={{
                  fontSize: '8px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                }}
              >
                Scanlines + Glow + Saturation
              </span>
            </div>
            <div
              style={{
                height: '40px',
                background: 'var(--iron-dark)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Simulated scanlines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 0, 0, ${
                      schedule.intensity === 'low'
                        ? '0.15'
                        : schedule.intensity === 'medium'
                        ? '0.3'
                        : '0.5'
                    }) 2px,
                    rgba(0, 0, 0, ${
                      schedule.intensity === 'low'
                        ? '0.15'
                        : schedule.intensity === 'medium'
                        ? '0.3'
                        : '0.5'
                    }) 4px
                  )`,
                }}
              />
              {/* Simulated glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    color: 'var(--omnissiah-red)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textShadow: `0 0 ${
                      schedule.intensity === 'low'
                        ? '6px'
                        : schedule.intensity === 'medium'
                        ? '12px'
                        : '20px'
                    } rgba(255, 0, 0, ${
                      schedule.intensity === 'low'
                        ? '0.4'
                        : schedule.intensity === 'medium'
                        ? '0.6'
                        : '0.9'
                    })`,
                  }}
                >
                  MACHINE GOD
                </span>
                <span
                  style={{
                    color: 'var(--noosphere-cyan)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textShadow: `0 0 ${
                      schedule.intensity === 'low'
                        ? '6px'
                        : schedule.intensity === 'medium'
                        ? '12px'
                        : '20px'
                    } rgba(0, 191, 191, ${
                      schedule.intensity === 'low'
                        ? '0.4'
                        : schedule.intensity === 'medium'
                        ? '0.6'
                        : '0.9'
                    })`,
                  }}
                >
                  OMNISSIAH
                </span>
                <span
                  style={{
                    color: 'var(--cogitator-gold)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textShadow: `0 0 ${
                      schedule.intensity === 'low'
                        ? '6px'
                        : schedule.intensity === 'medium'
                        ? '12px'
                        : '20px'
                    } rgba(200, 168, 75, ${
                      schedule.intensity === 'low'
                        ? '0.4'
                        : schedule.intensity === 'medium'
                        ? '0.6'
                        : '0.9'
                    })`,
                  }}
                >
                  COGITATOR
                </span>
              </div>
            </div>
          </div>

          {/* ── Saved indicator ─────────────────────────── */}
          {saved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                background: 'rgba(0, 191, 191, 0.05)',
                border: '1px solid var(--noosphere-cyan-dim)',
              }}
            >
              <Check size={10} style={{ color: 'var(--noosphere-cyan)' }} />
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Settings saved
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Info ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px',
          border: '1px solid var(--iron-gray)',
          background: 'var(--void-black)',
          marginTop: '10px',
        }}
      >
        <AlertTriangle
          size={12}
          style={{
            color: 'var(--cogitator-gold)',
            flexShrink: 0,
            marginTop: '1px',
          }}
        />
        <span
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '9px',
            lineHeight: 1.5,
          }}
        >
          Night Intensify increases CRT scanline density and color glow
          during the configured hours. The Dark Mechanicus theme is always
          active — this feature merely intensifies it.
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Expose night status for other components
// ═══════════════════════════════════════════════════════════

export function isNightActive(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;

  try {
    const schedule: NightSchedule = JSON.parse(stored);
    if (!schedule.enabled) return false;
    return isNightTime(schedule.startTime, schedule.endTime);
  } catch {
    return false;
  }
}
