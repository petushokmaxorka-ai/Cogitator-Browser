// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — Clock ("Tempus Machina")
// Local clock + Alarm / Timer / Stopwatch trio.
// Distinct from WorldClock (WC): WC shows many cities; this is the
// operator's own time instruments. Dark Mechanicus styling.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, AlarmClock, Timer, Watch, Play, Pause, Square, Plus, X, Bell, RotateCcw } from 'lucide-react';

// ── Theme ────────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#000000',
  panel: '#0E0E0E',
  panelAlt: '#141414',
  border: '#2A2A2A',
  red: '#FF0000',
  gold: '#C8A84B',
  cyan: '#00BFBF',
  green: '#3CA374',
  text: '#E0E0E0',
  textDim: '#888888',
  inputBg: '#1A1A1A',
};

type Tool = 'clock' | 'alarm' | 'timer' | 'stopwatch';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatStopwatch(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ClockTool(): JSX.Element {
  const [tool, setTool] = useState<Tool>('clock');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: COLORS.panel,
          flexShrink: 0,
        }}
      >
        <Clock size={14} color={COLORS.gold} />
        <span style={{ color: COLORS.gold, fontSize: 11, letterSpacing: '0.12em' }}>
          TEMPUS MACHINA
        </span>
        <span style={{ color: COLORS.textDim, fontSize: 9, marginLeft: 'auto', letterSpacing: '0.06em' }}>
          LOCAL
        </span>
      </div>

      {/* ── Tool Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 8px',
          backgroundColor: COLORS.panel,
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        {([
          { id: 'clock', label: 'CLOCK', icon: <Clock size={11} /> },
          { id: 'alarm', label: 'ALARM', icon: <AlarmClock size={11} /> },
          { id: 'timer', label: 'TIMER', icon: <Timer size={11} /> },
          { id: 'stopwatch', label: 'STOPWATCH', icon: <Watch size={11} /> },
        ] as { id: Tool; label: string; icon: JSX.Element }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '6px 4px',
              backgroundColor: tool === t.id ? 'rgba(200, 168, 75, 0.12)' : 'transparent',
              border: `1px solid ${tool === t.id ? COLORS.gold : COLORS.border}`,
              color: tool === t.id ? COLORS.gold : COLORS.textDim,
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tool Body ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {tool === 'clock' && <ClockFace />}
        {tool === 'alarm' && <AlarmPanel />}
        {tool === 'timer' && <TimerPanel />}
        {tool === 'stopwatch' && <StopwatchPanel />}
      </div>
    </div>
  );
}

// ═══ LOCAL CLOCK ═══════════════════════════════════════════════════════════════

function ClockFace(): JSX.Element {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  const offsetMin = -now.getTimezoneOffset();
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const offsetH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offsetM = pad(Math.abs(offsetMin) % 60);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 20 }}>
      <div
        style={{
          fontSize: 42,
          fontWeight: 'bold',
          color: COLORS.cyan,
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          textShadow: '0 0 16px rgba(0, 191, 191, 0.4)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {time}
      </div>
      <div style={{ color: COLORS.gold, fontSize: 13, letterSpacing: '0.08em' }}>{dateStr}</div>
      <div
        style={{
          color: COLORS.textDim,
          fontSize: 11,
          fontFamily: 'monospace',
          padding: '4px 10px',
          border: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.panel,
        }}
      >
        {tz} · UTC{offsetSign}{offsetH}:{offsetM}
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 8, fontStyle: 'italic' }}>
        Time is the Omnissiah's most sacred resource.
      </div>
    </div>
  );
}

// ═══ ALARM ═════════════════════════════════════════════════════════════════════

interface Alarm {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
}

function AlarmPanel(): JSX.Element {
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    try {
      const stored = localStorage.getItem('cogitator_alarms');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  });
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [triggered, setTriggered] = useState<string | null>(null);
  // Track the last minute we checked each alarm for, to fire once per minute.
  const lastFiredRef = useRef<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('cogitator_alarms', JSON.stringify(alarms));
  }, [alarms]);

  // Tick every second; fire alarms when current HH:MM matches and not yet fired this minute.
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      for (const a of alarms) {
        if (!a.enabled) continue;
        if (a.time === hhmm && lastFiredRef.current[a.id] !== hhmm) {
          lastFiredRef.current[a.id] = hhmm;
          setTriggered(a.id);
          // Browser notification if permitted.
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('◆ Alarm', { body: a.label || a.time });
            }
          } catch { /* ignore */ }
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [alarms]);

  const addAlarm = useCallback(() => {
    const t = newTime.trim();
    if (!/^\d{1,2}:\d{2}$/.test(t)) return;
    const [h, m] = t.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) return;
    const norm = `${pad(h)}:${pad(m)}`;
    const id = `alarm_${Date.now()}`;
    setAlarms((prev) => [...prev, { id, time: norm, label: newLabel.trim() || 'Alarm', enabled: true }]);
    setNewTime('');
    setNewLabel('');
  }, [newTime, newLabel]);

  const requestNotify = useCallback(() => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {triggered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 10,
            backgroundColor: 'rgba(255, 0, 0, 0.12)',
            border: `1px solid ${COLORS.red}`,
            color: COLORS.red,
            animation: 'pulse 1s infinite',
          }}
        >
          <Bell size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold' }}>
              {alarms.find((a) => a.id === triggered)?.label || 'ALARM'}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textDim }}>
              {alarms.find((a) => a.id === triggered)?.time}
            </div>
          </div>
          <button
            onClick={() => setTriggered(null)}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.red}`,
              color: COLORS.red,
              padding: '4px 8px',
              fontFamily: 'monospace',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            DISMISS
          </button>
        </div>
      )}

      <div style={{ padding: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.panel }}>
        <div style={{ color: COLORS.gold, fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}>
          + NEW ALARM
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            placeholder="HH:MM"
            onFocus={requestNotify}
            style={inputStyle}
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (optional)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addAlarm} style={addBtnStyle}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {alarms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: COLORS.textDim, fontSize: 11 }}>
          No alarms set
        </div>
      ) : (
        alarms.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              backgroundColor: COLORS.panel,
              border: `1px solid ${a.enabled ? COLORS.cyan : COLORS.border}`,
              opacity: a.enabled ? 1 : 0.5,
            }}
          >
            <AlarmClock size={14} color={a.enabled ? COLORS.cyan : COLORS.textDim} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: a.enabled ? COLORS.cyan : COLORS.textDim, fontVariantNumeric: 'tabular-nums' }}>
                {a.time}
              </div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>{a.label}</div>
            </div>
            <button
              onClick={() => setAlarms((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))}
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.border}`,
                color: a.enabled ? COLORS.green : COLORS.textDim,
                padding: '3px 8px',
                fontFamily: 'monospace',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {a.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setAlarms((prev) => prev.filter((x) => x.id !== a.id))}
              style={{ background: 'transparent', border: 'none', color: COLORS.textDim, cursor: 'pointer', padding: 2 }}
              title="Delete"
            >
              <X size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ═══ TIMER (countdown) ═════════════════════════════════════════════════════════

function TimerPanel(): JSX.Element {
  const [hours, setHours] = useState(0);
  const [mins, setMins] = useState(5);
  const [secs, setSecs] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null); // ms
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endTimeRef = useRef<number>(0);

  const totalSet = (hours * 3600 + mins * 60 + secs) * 1000;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = endTimeRef.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        setFinished(true);
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('◆ Timer', { body: 'Countdown complete' });
          }
        } catch { /* ignore */ }
        clearInterval(id);
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    if (totalSet <= 0) return;
    endTimeRef.current = Date.now() + (remaining ?? totalSet);
    setFinished(false);
    setRunning(true);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }
  };

  const pause = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(null);
    setFinished(false);
  };

  const display = remaining !== null ? remaining : totalSet;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 16 }}>
      <div
        style={{
          fontSize: 40,
          fontWeight: 'bold',
          color: finished ? COLORS.red : running ? COLORS.cyan : COLORS.gold,
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          textShadow: finished ? '0 0 16px rgba(255,0,0,0.5)' : '0 0 12px rgba(200,168,75,0.3)',
        }}
      >
        {formatCountdown(display)}
      </div>

      {remaining === null && !running && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {([
            { label: 'H', val: hours, set: setHours, max: 23 },
            { label: 'M', val: mins, set: setMins, max: 59 },
            { label: 'S', val: secs, set: setSecs, max: 59 },
          ] as { label: string; val: number; set: (n: number) => void; max: number }[]).map((f) => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => f.set(Math.min(f.max, f.val + (f.label === 'H' ? 1 : f.label === 'M' ? 5 : 5)))} style={stepBtnStyle}><Plus size={10} /></button>
              </div>
              <input
                type="number"
                min={0}
                max={f.max}
                value={f.val}
                onChange={(e) => f.set(Math.max(0, Math.min(f.max, Number(e.target.value) || 0)))}
                style={{ width: 50, textAlign: 'center', ...inputStyle }}
              />
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => f.set(Math.max(0, f.val - (f.label === 'H' ? 1 : f.label === 'M' ? 5 : 5)))} style={stepBtnStyle}><X size={10} /></button>
              </div>
              <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: '0.1em' }}>{f.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!running ? (
          <button onClick={start} disabled={totalSet <= 0 && remaining === null} style={primaryBtnStyle('#00BFBF')}>
            <Play size={12} /> START
          </button>
        ) : (
          <button onClick={pause} style={primaryBtnStyle('#C8A84B')}>
            <Pause size={12} /> PAUSE
          </button>
        )}
        <button onClick={reset} style={secondaryBtnStyle}>
          <RotateCcw size={12} /> RESET
        </button>
      </div>

      {finished && (
        <div style={{ color: COLORS.red, fontSize: 12, letterSpacing: '0.1em', animation: 'pulse 1s infinite' }}>
          ▶ COUNTDOWN COMPLETE
        </div>
      )}
    </div>
  );
}

// ═══ STOPWATCH ═════════════════════════════════════════════════════════════════

function StopwatchPanel(): JSX.Element {
  const [elapsed, setElapsed] = useState(0); // ms
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(baseRef.current + (Date.now() - startRef.current));
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    baseRef.current = elapsed;
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    baseRef.current = 0;
  };
  const lap = () => {
    setLaps((prev) => [elapsed, ...prev]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
      <div
        style={{
          fontSize: 40,
          fontWeight: 'bold',
          color: running ? COLORS.cyan : COLORS.gold,
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 12px rgba(0,191,191,0.3)',
        }}
      >
        {formatStopwatch(elapsed)}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {!running ? (
          <button onClick={start} style={primaryBtnStyle('#00BFBF')}>
            <Play size={12} /> {elapsed > 0 ? 'RESUME' : 'START'}
          </button>
        ) : (
          <button onClick={pause} style={primaryBtnStyle('#C8A84B')}>
            <Pause size={12} /> PAUSE
          </button>
        )}
        <button onClick={lap} disabled={!running} style={{ ...secondaryBtnStyle, opacity: running ? 1 : 0.4, cursor: running ? 'pointer' : 'not-allowed' }}>
          <Square size={12} /> LAP
        </button>
        <button onClick={reset} style={secondaryBtnStyle}>
          <RotateCcw size={12} /> RESET
        </button>
      </div>

      {laps.length > 0 && (
        <div style={{ width: '100%', maxHeight: 200, overflowY: 'auto', borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
          {laps.map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '5px 12px',
                fontSize: 11,
                borderBottom: `1px solid #1A1A1A`,
              }}
            >
              <span style={{ color: COLORS.textDim }}>LAP {laps.length - i}</span>
              <span style={{ color: COLORS.gold, fontVariantNumeric: 'tabular-nums' }}>{formatStopwatch(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ Shared button styles ═══════════════════════════════════════════════════════

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  backgroundColor: COLORS.inputBg,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.text,
  fontFamily: 'monospace',
  fontSize: 12,
  outline: 'none',
  width: 70,
};

const stepBtnStyle: React.CSSProperties = {
  backgroundColor: COLORS.inputBg,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.textDim,
  padding: '2px 6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const addBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: `1px solid ${COLORS.gold}`,
  color: COLORS.gold,
  padding: '4px 10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

function primaryBtnStyle(accent: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: `1px solid ${accent}`,
    color: accent,
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  backgroundColor: 'transparent',
  border: `1px solid ${COLORS.border}`,
  color: COLORS.textDim,
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: '0.1em',
  cursor: 'pointer',
  transition: 'all 150ms ease',
};
