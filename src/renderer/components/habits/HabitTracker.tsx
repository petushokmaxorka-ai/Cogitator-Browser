// ═══════════════════════════════════════════════════════════
// HABIT TRACKER — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Heatmap-style habit tracking with streaks
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storeGet, storeSet } from '../../lib/toolstore';
import {
  Plus,
  Trash2,
  Flame,
  TrendingUp,
  X,
  Check,
  Target,
  Archive,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface Habit {
  id: string;
  name: string;
  color: string;
  frequency: 'daily' | 'weekly';
  completions: Record<string, boolean>; // YYYY-MM-DD -> true/false
  createdAt: number;
  archived?: boolean;
}

const STORAGE_KEY = 'cogitator_habits';

const HABIT_COLORS = [
  '#FF0000', // omnissiah-red
  '#00BFBF', // noosphere-cyan
  '#C8A84B', // cogitator-gold
  '#FF6B35', // forge-orange
  '#9B59B6', // warp-purple
  '#2ECC71', // plasma-green
];

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'hb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHabits(habits: Habit[]) {
  void storeSet(STORAGE_KEY, habits);
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

function computeStreak(habit: Habit): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = getDateOffset(-i);
    if (habit.completions[dateStr]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeCompletionRate(habit: Habit, days: number): number {
  let completed = 0;
  for (let i = 0; i < days; i++) {
    if (habit.completions[getDateOffset(-i)]) completed++;
  }
  return days > 0 ? Math.round((completed / days) * 100) : 0;
}

// ── Component ───────────────────────────────────────────────

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);

  const hydrated = useRef(false);

  // Hydrate from the file-backed store (one-time localStorage migration)
  useEffect(() => {
    void (async () => {
      const stored = await storeGet<Habit[]>(STORAGE_KEY);
      if (stored) {
        setHabits(stored);
      } else {
        const local = loadHabits();
        if (local.length) {
          await storeSet(STORAGE_KEY, local);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      hydrated.current = true;
    })();
  }, []);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(HABIT_COLORS[0]);
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly'>('daily');

  // Persist
  useEffect(() => {
    if (!hydrated.current) return;
    saveHabits(habits);
  }, [habits]);

  // ── CRUD ──────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    if (!formName.trim()) return;
    const newHabit: Habit = {
      id: generateId(),
      name: formName.trim(),
      color: formColor,
      frequency: formFrequency,
      completions: {},
      createdAt: Date.now(),
    };
    setHabits((prev) => [...prev, newHabit]);
    setFormName('');
    setShowAdd(false);
  }, [formName, formColor, formFrequency]);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, completions: { ...h.completions, [dateStr]: !h.completions[dateStr] } }
          : h
      )
    );
  }, []);

  const handleArchive = useCallback((habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, archived: !h.archived } : h))
    );
  }, []);

  const handleDelete = useCallback((habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    if (selectedHabit === habitId) setSelectedHabit(null);
  }, [selectedHabit]);

  // ── Heatmap Data ──────────────────────────────────────────

  const heatmapDays = useMemo(() => {
    // 4 weeks = 28 days, columns = days of week (Mon-Sun)
    const days: { dateStr: string; dayLabel: string }[] = [];
    for (let i = -27; i <= 0; i++) {
      const dateStr = getDateOffset(i);
      days.push({ dateStr, dayLabel: getDayLabel(dateStr) });
    }
    return days;
  }, []);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

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
          <Target size={14} style={{ color: 'var(--noosphere-cyan)' }} />
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            HABITS
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {activeHabits.length} ACTIVE
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: 'var(--omnissiah-red-dim)',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <Plus size={12} /> ADD
        </button>
      </div>

      {/* ═══ Habits List ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} className="scrollbar-thin">
        {activeHabits.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', marginTop: '40px', fontStyle: 'italic' }}>
            <Target size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <br />
            No habits tracked. Create one to begin.
          </div>
        ) : (
          activeHabits.map((habit) => {
            const streak = computeStreak(habit);
            const rate30 = computeCompletionRate(habit, 30);
            return (
              <div
                key={habit.id}
                style={{
                  marginBottom: '12px',
                  background: 'var(--iron-dark)',
                  border: `1px solid ${selectedHabit === habit.id ? habit.color : 'var(--iron-gray)'}`,
                  padding: '10px',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Habit Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: habit.color, boxShadow: `0 0 6px ${habit.color}44` }} />
                    <span style={{ color: 'var(--parchment)', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                      {habit.name}
                    </span>
                    <span style={{ fontSize: '8px', color: 'var(--parchment-dim)', background: 'var(--void-black)', padding: '1px 5px', border: '1px solid var(--iron-gray)', letterSpacing: '0.05em' }}>
                      {habit.frequency.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Streak */}
                    {streak > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#FF6B35', fontSize: '10px' }}>
                        <Flame size={12} /> {streak}
                      </span>
                    )}
                    {/* Rate */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--noosphere-cyan)', fontSize: '10px' }}>
                      <TrendingUp size={12} /> {rate30}%
                    </span>
                    {/* Actions */}
                    <button
                      onClick={() => handleArchive(habit.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cogitator-gold)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                      title="Archive"
                    >
                      <Archive size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {heatmapDays.map(({ dateStr }) => {
                    const isDone = !!habit.completions[dateStr];
                    const isToday = dateStr === getTodayStr();
                    const intensity = isDone ? 1 : 0;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleCompletion(habit.id, dateStr)}
                        title={dateStr}
                        style={{
                          aspectRatio: '1',
                          border: isToday ? `1px solid ${habit.color}` : '1px solid var(--iron-gray)',
                          background: isDone ? habit.color : 'var(--void-black)',
                          opacity: isDone ? 0.7 + intensity * 0.3 : 1,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          minWidth: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (!isDone) e.currentTarget.style.background = `${habit.color}33`;
                        }}
                        onMouseLeave={(e) => {
                          if (!isDone) e.currentTarget.style.background = 'var(--void-black)';
                        }}
                      >
                        {isDone && <Check size={10} color="#000" />}
                      </button>
                    );
                  })}
                </div>

                {/* Day labels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginTop: '2px' }}>
                  {heatmapDays.slice(-7).map(({ dayLabel }, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--text-muted)' }}>
                      {dayLabel}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Archived section */}
        {habits.filter((h) => h.archived).length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--iron-gray)', paddingTop: '10px' }}>
            <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em' }}>
              ARCHIVED ({habits.filter((h) => h.archived).length})
            </span>
            {habits
              .filter((h) => h.archived)
              .map((habit) => (
                <div
                  key={habit.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px',
                    marginTop: '4px',
                    background: 'var(--void-black)',
                    opacity: 0.5,
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: habit.color }} />
                  <span style={{ flex: 1, fontSize: '10px', color: 'var(--parchment)', textDecoration: 'line-through' }}>
                    {habit.name}
                  </span>
                  <button
                    onClick={() => handleArchive(habit.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', fontSize: '9px', letterSpacing: '0.1em' }}
                  >
                    RESTORE
                  </button>
                  <button
                    onClick={() => handleDelete(habit.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ═══ Add Habit Modal ═══ */}
      {showAdd && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                NEW HABIT
              </span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {/* Name */}
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Habit name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                marginBottom: '10px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />

            {/* Color */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>COLOR</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '3px',
                      background: c,
                      border: formColor === c ? '2px solid var(--sacred-white)' : '2px solid transparent',
                      cursor: 'pointer',
                      opacity: formColor === c ? 1 : 0.6,
                      transition: 'all 150ms ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
              {(['daily', 'weekly'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormFrequency(f)}
                  style={{
                    flex: 1,
                    padding: '5px',
                    background: formFrequency === f ? `${formColor}22` : 'transparent',
                    border: `1px solid ${formFrequency === f ? formColor : 'var(--iron-gray)'}`,
                    color: formFrequency === f ? formColor : 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textTransform: 'uppercase',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  padding: '5px 12px',
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
                onClick={handleAdd}
                disabled={!formName.trim()}
                style={{
                  padding: '5px 12px',
                  background: 'var(--omnissiah-red-dim)',
                  border: '1px solid var(--omnissiah-red)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: formName.trim() ? 'pointer' : 'not-allowed',
                  opacity: formName.trim() ? 1 : 0.4,
                  boxShadow: 'var(--glow-red)',
                }}
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
