// ═══════════════════════════════════════════════════════════
// TIME TRACKER — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Time tracking like Toggl — start/stop timer, logs, reports, CSV export
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Square,
  Timer,
  Plus,
  Trash2,
  Download,
  BarChart3,
  List,
  X,
  Clock,
  ChevronDown,
  Tag,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  taskName: string;
  project: string;
  startTime: number; // timestamp
  endTime: number | null;
  duration: number; // seconds (running = elapsed so far)
}

interface TimeTrackerData {
  entries: TimeEntry[];
}

const STORAGE_KEY = 'cogitator_time_tracker';
const PROJECTS = ['Development', 'Design', 'Research', 'Meeting', 'Writing', 'Other'];

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'tt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadData(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(entries: TimeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function getWeekStart(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function isThisWeek(ts: number): boolean {
  const d = new Date(ts);
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

function exportToCSV(entries: TimeEntry[]) {
  const headers = ['Date', 'Task', 'Project', 'Start', 'End', 'Duration (hours)'];
  const rows = entries
    .filter((e) => e.endTime !== null)
    .map((e) => {
      const date = new Date(e.startTime).toISOString().split('T')[0];
      const start = formatTime(e.startTime);
      const end = e.endTime ? formatTime(e.endTime) : '';
      const hours = (e.duration / 3600).toFixed(2);
      return [date, e.taskName, e.project, start, end, hours].map((f) => `"${f}"`).join(',');
    });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cogitator-time-tracker-${getTodayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ───────────────────────────────────────────────

type TrackerView = 'today' | 'week' | 'report';

export default function TimeTracker() {
  const [entries, setEntries] = useState<TimeEntry[]>(loadData);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [taskName, setTaskName] = useState('');
  const [project, setProject] = useState(PROJECTS[0]);
  const [view, setView] = useState<TrackerView>('today');
  const [showHistory, setShowHistory] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist
  useEffect(() => {
    saveData(entries);
  }, [entries]);

  // Timer tick
  useEffect(() => {
    if (runningEntry) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const dur = Math.floor((now - runningEntry.startTime) / 1000);
        setElapsed(dur);
        setRunningEntry((prev) => (prev ? { ...prev, duration: dur } : null));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runningEntry?.id]);

  // ── Timer Controls ────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (!taskName.trim()) return;
    const newEntry: TimeEntry = {
      id: generateId(),
      taskName: taskName.trim(),
      project,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
    };
    setRunningEntry(newEntry);
    setElapsed(0);
  }, [taskName, project]);

  const handleStop = useCallback(() => {
    if (!runningEntry) return;
    const now = Date.now();
    const finalDuration = Math.floor((now - runningEntry.startTime) / 1000);
    const completed: TimeEntry = {
      ...runningEntry,
      endTime: now,
      duration: finalDuration,
    };
    setEntries((prev) => [completed, ...prev]);
    setRunningEntry(null);
    setElapsed(0);
    setTaskName('');
  }, [runningEntry]);

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Derived Data ──────────────────────────────────────────

  const todayEntries = useMemo(() => entries.filter((e) => isToday(e.startTime)), [entries]);
  const weekEntries = useMemo(() => entries.filter((e) => isThisWeek(e.startTime)), [entries]);

  const todayTotal = useMemo(() => {
    const completed = todayEntries.filter((e) => e.endTime !== null).reduce((sum, e) => sum + e.duration, 0);
    return completed + (runningEntry ? elapsed : 0);
  }, [todayEntries, runningEntry, elapsed]);

  const weekTotal = useMemo(() => {
    const completed = weekEntries.filter((e) => e.endTime !== null).reduce((sum, e) => sum + e.duration, 0);
    return completed + (runningEntry ? elapsed : 0);
  }, [weekEntries, runningEntry, elapsed]);

  // Report by project
  const projectReport = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.endTime !== null)
      .forEach((e) => {
        map.set(e.project, (map.get(e.project) || 0) + e.duration);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  // Daily totals for this week
  const dailyTotals = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totals = days.map((day, i) => {
      const weekStart = getWeekStart();
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      const dayEntries = entries.filter((e) => {
        const d = new Date(e.startTime);
        return d.getDate() === dayDate.getDate() && d.getMonth() === dayDate.getMonth() && d.getFullYear() === dayDate.getFullYear() && e.endTime !== null;
      });
      const total = dayEntries.reduce((sum, e) => sum + e.duration, 0);
      return { day, total, date: dayDate };
    });
    return totals;
  }, [entries]);

  const maxDaily = useMemo(() => Math.max(...dailyTotals.map((d) => d.total), 1), [dailyTotals]);

  // ── Styles ────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: 'var(--iron-dark)',
    border: '1px solid var(--iron-gray)',
    color: 'var(--parchment)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };

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
      }}
    >
      {/* ═══ Header ═══ */}
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
          <Timer size={14} style={{ color: 'var(--noosphere-cyan)' }} />
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            TIME TRACK
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => exportToCSV(entries)} style={{ ...btnBase, padding: '4px 8px' }} title="Export CSV">
            <Download size={12} />
          </button>
        </div>
      </div>

      {/* ═══ Timer Controls ═══ */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {/* Task name + Project */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="What are you working on?"
            disabled={!!runningEntry}
            onKeyDown={(e) => e.key === 'Enter' && !runningEntry && handleStart()}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              outline: 'none',
            }}
            onFocus={(e) => { if (!runningEntry) e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
          />
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            disabled={!!runningEntry}
            style={{
              padding: '6px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PROJECTS.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Timer display + Start/Stop */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '28px',
                color: runningEntry ? 'var(--omnissiah-red)' : 'var(--sacred-white)',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
                textShadow: runningEntry ? 'var(--glow-red)' : 'none',
                transition: 'all 300ms ease',
              }}
            >
              {formatDuration(runningEntry ? elapsed : 0)}
            </span>
            {runningEntry && (
              <span style={{ fontSize: '9px', color: 'var(--omnissiah-red)', letterSpacing: '0.1em' }}>
                {runningEntry.taskName}
              </span>
            )}
          </div>

          {runningEntry ? (
            <button
              onClick={handleStop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                background: 'var(--omnissiah-red-dim)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: 'var(--glow-red)',
                transition: 'all 150ms ease',
              }}
            >
              <Square size={12} fill="currentColor" /> STOP
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!taskName.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                background: taskName.trim() ? 'rgba(0, 191, 191, 0.15)' : 'transparent',
                border: `1px solid ${taskName.trim() ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
                color: taskName.trim() ? 'var(--noosphere-cyan)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: taskName.trim() ? 'pointer' : 'not-allowed',
                opacity: taskName.trim() ? 1 : 0.4,
                transition: 'all 150ms ease',
              }}
            >
              <Play size={12} fill="currentColor" /> START
            </button>
          )}
        </div>
      </div>

      {/* ═══ Summary ═══ */}
      <div
        style={{
          display: 'flex',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          gap: '16px',
          background: 'var(--void-black)',
        }}
      >
        <div>
          <span style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em' }}>TODAY</span>
          <div style={{ color: 'var(--noosphere-cyan)', fontSize: '16px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(todayTotal)}
          </div>
        </div>
        <div style={{ width: '1px', background: 'var(--iron-gray)' }} />
        <div>
          <span style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em' }}>THIS WEEK</span>
          <div style={{ color: 'var(--cogitator-gold)', fontSize: '16px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(weekTotal)}
          </div>
        </div>
        <div style={{ width: '1px', background: 'var(--iron-gray)' }} />
        <div>
          <span style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em' }}>ENTRIES</span>
          <div style={{ color: 'var(--parchment)', fontSize: '16px', fontWeight: 'bold' }}>
            {entries.length}
          </div>
        </div>
      </div>

      {/* ═══ View Tabs ═══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        {([
          ['today', 'TODAY'],
          ['week', 'WEEK'],
          ['report', 'REPORT'],
        ] as [TrackerView, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: '6px',
              background: view === v ? 'var(--iron-dark)' : 'transparent',
              border: 'none',
              borderBottom: view === v ? '2px solid var(--noosphere-cyan)' : '2px solid transparent',
              color: view === v ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Content Area ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} className="scrollbar-thin">
        {/* ── Today View ── */}
        {view === 'today' && (
          <>
            {/* Running entry */}
            {runningEntry && (
              <div
                style={{
                  padding: '8px',
                  background: 'rgba(255, 0, 0, 0.05)',
                  border: '1px solid var(--omnissiah-red)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--omnissiah-red)', boxShadow: 'var(--glow-red)', animation: 'pulse 1s infinite' }} />
                <span style={{ flex: 1, fontSize: '11px', color: 'var(--parchment)' }}>{runningEntry.taskName}</span>
                <Tag size={10} style={{ color: 'var(--parchment-dim)' }} />
                <span style={{ fontSize: '9px', color: 'var(--parchment-dim)' }}>{runningEntry.project}</span>
                <span style={{ fontSize: '12px', color: 'var(--omnissiah-red)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(elapsed)}
                </span>
              </div>
            )}

            {/* Completed entries */}
            {todayEntries.filter((e) => e.endTime !== null).length === 0 && !runningEntry ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', marginTop: '30px', fontStyle: 'italic' }}>
                No entries today. Start the timer to track time.
              </div>
            ) : (
              todayEntries
                .filter((e) => e.endTime !== null)
                .map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      marginBottom: '3px',
                      background: 'var(--iron-dark)',
                      borderLeft: '2px solid var(--noosphere-cyan)',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: '11px', color: 'var(--parchment)' }}>{entry.taskName}</span>
                    <Tag size={10} style={{ color: 'var(--parchment-dim)' }} />
                    <span style={{ fontSize: '8px', color: 'var(--parchment-dim)', background: 'var(--void-black)', padding: '1px 5px', border: '1px solid var(--iron-gray)' }}>
                      {entry.project}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--noosphere-cyan)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '...'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--cogitator-gold)', fontVariantNumeric: 'tabular-nums', minWidth: '60px', textAlign: 'right' }}>
                      {formatDuration(entry.duration)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))
            )}
          </>
        )}

        {/* ── Week View ── */}
        {view === 'week' && (
          <>
            {/* Daily bar chart */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                DAILY BREAKDOWN (HOURS)
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px' }}>
                {dailyTotals.map(({ day, total }) => {
                  const hours = total / 3600;
                  const pct = Math.min((total / maxDaily) * 100, 100);
                  return (
                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--parchment)', fontVariantNumeric: 'tabular-nums' }}>
                        {hours.toFixed(1)}h
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(pct, 4)}%`,
                          minHeight: '4px',
                          background: hours > 0 ? 'var(--noosphere-cyan)' : 'var(--iron-gray)',
                          transition: 'height 300ms ease',
                          opacity: hours > 0 ? 1 : 0.3,
                        }}
                      />
                      <span style={{ fontSize: '8px', color: 'var(--parchment-dim)' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week entries */}
            {weekEntries.filter((e) => e.endTime !== null).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', marginTop: '20px', fontStyle: 'italic' }}>
                No entries this week.
              </div>
            ) : (
              weekEntries
                .filter((e) => e.endTime !== null)
                .map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      marginBottom: '2px',
                      background: 'var(--iron-dark)',
                      borderLeft: '2px solid var(--cogitator-gold)',
                    }}
                  >
                    <span style={{ fontSize: '9px', color: 'var(--parchment-dim)', minWidth: '55px' }}>
                      {new Date(entry.startTime).toISOString().slice(5, 10)}
                    </span>
                    <span style={{ flex: 1, fontSize: '10px', color: 'var(--parchment)' }}>{entry.taskName}</span>
                    <span style={{ fontSize: '8px', color: 'var(--parchment-dim)', background: 'var(--void-black)', padding: '1px 4px', border: '1px solid var(--iron-gray)' }}>
                      {entry.project}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--cogitator-gold)', fontVariantNumeric: 'tabular-nums', minWidth: '55px', textAlign: 'right' }}>
                      {formatDuration(entry.duration)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))
            )}
          </>
        )}

        {/* ── Report View ── */}
        {view === 'report' && (
          <>
            <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
              TIME BY PROJECT
            </span>
            {projectReport.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', marginTop: '20px', fontStyle: 'italic' }}>
                No data. Track some time to see reports.
              </div>
            ) : (
              projectReport.map(([proj, duration]) => {
                const maxDur = projectReport[0][1];
                const pct = (duration / maxDur) * 100;
                const hours = (duration / 3600).toFixed(1);
                return (
                  <div key={proj} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--parchment)' }}>{proj}</span>
                      <span style={{ fontSize: '10px', color: 'var(--cogitator-gold)', fontVariantNumeric: 'tabular-nums' }}>
                        {hours}h
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--iron-gray)', borderRadius: '1px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--noosphere-cyan)',
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {/* All entries summary */}
            {entries.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--iron-gray)', marginTop: '12px', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                    ALL ENTRIES ({entries.length})
                  </span>
                  {entries.slice(0, 20).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 6px',
                        marginBottom: '2px',
                        fontSize: '9px',
                        color: 'var(--parchment-dim)',
                      }}
                    >
                      <span style={{ minWidth: '55px' }}>{new Date(entry.startTime).toISOString().slice(0, 10)}</span>
                      <span style={{ flex: 1, color: 'var(--parchment)' }}>{entry.taskName}</span>
                      <span style={{ background: 'var(--void-black)', padding: '1px 4px', border: '1px solid var(--iron-gray)' }}>{entry.project}</span>
                      <span style={{ color: 'var(--cogitator-gold)', fontVariantNumeric: 'tabular-nums', minWidth: '50px', textAlign: 'right' }}>
                        {formatDuration(entry.duration)}
                      </span>
                    </div>
                  ))}
                  {entries.length > 20 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px', marginTop: '6px' }}>
                      ... and {entries.length - 20} more entries
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
