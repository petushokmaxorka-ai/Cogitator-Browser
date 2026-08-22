// ═══════════════════════════════════════════════════════════
// CALENDAR VIEW — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Bell,
  X,
  Check,
  Trash2,
  Grid3X3,
  Columns3,
  List,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  color: string; // --omnissiah-red, --noosphere-cyan, --cogitator-gold
  description?: string;
  reminder?: boolean;
}

type CalendarViewMode = 'month' | 'week' | 'day';

const STORAGE_KEY = 'cogitator_calendar';

const COLOR_MAP: Record<string, string> = {
  '--omnissiah-red': '#FF0000',
  '--noosphere-cyan': '#00BFBF',
  '--cogitator-gold': '#C8A84B',
};

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatMonthYear(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ── Component ───────────────────────────────────────────────

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formColor, setFormColor] = useState('--omnissiah-red');
  const [formDescription, setFormDescription] = useState('');
  const [formReminder, setFormReminder] = useState(false);

  // Persist events
  useEffect(() => {
    saveEvents(events);
  }, [events]);

  // ── Navigation ────────────────────────────────────────────

  const goToPrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(getTodayStr());
  }, []);

  // ── Event CRUD ────────────────────────────────────────────

  const openAddModal = useCallback((dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormTime('12:00');
    setFormColor('--omnissiah-red');
    setFormDescription('');
    setFormReminder(false);
    if (dateStr) setSelectedDate(dateStr);
    setShowAddModal(true);
  }, []);

  const openEditModal = useCallback((evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormTime(evt.time || '');
    setFormColor(evt.color);
    setFormDescription(evt.description || '');
    setFormReminder(evt.reminder || false);
    setSelectedDate(evt.date);
    setShowAddModal(true);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!formTitle.trim()) return;
    const eventData: CalendarEvent = {
      id: editingEvent?.id || generateId(),
      title: formTitle.trim(),
      date: selectedDate,
      time: formTime || undefined,
      color: formColor,
      description: formDescription.trim() || undefined,
      reminder: formReminder || undefined,
    };
    setEvents((prev) => {
      if (editingEvent) {
        return prev.map((e) => (e.id === editingEvent.id ? eventData : e));
      }
      return [...prev, eventData];
    });
    setShowAddModal(false);
  }, [editingEvent, formTitle, formTime, formColor, formDescription, formReminder, selectedDate]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (editingEvent?.id === id) setShowAddModal(false);
  }, [editingEvent]);

  // ── Derived data ──────────────────────────────────────────

  const eventsForSelectedDate = useMemo(() => {
    return events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [events, selectedDate]);

  const getEventsForDate = useCallback((dateStr: string) => {
    return events.filter((e) => e.date === dateStr);
  }, [events]);

  // ── Month Grid ────────────────────────────────────────────

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = getTodayStr();

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // ── Render Month View ─────────────────────────────────────

  const renderMonthGrid = () => {
    const cells: JSX.Element[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          style={{ background: 'transparent', minHeight: '64px' }}
        />
      );
    }
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const dayEvents = getEventsForDate(dateStr);

      cells.push(
        <button
          key={dateStr}
          onClick={() => {
            setSelectedDate(dateStr);
          }}
          onDoubleClick={() => openAddModal(dateStr)}
          style={{
            position: 'relative',
            background: isSelected ? 'var(--iron-dark)' : 'transparent',
            border: isToday ? '1px solid var(--omnissiah-red)' : '1px solid transparent',
            minHeight: '64px',
            padding: '4px',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-mono)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'rgba(42, 42, 42, 0.5)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Day number */}
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isToday ? '50%' : '0',
              background: isToday ? 'var(--omnissiah-red)' : 'transparent',
              color: isToday ? '#000' : 'var(--parchment)',
              fontSize: '11px',
              fontWeight: isToday ? 'bold' : 'normal',
              marginBottom: '2px',
            }}
          >
            {day}
          </div>
          {/* Event dots */}
          {dayEvents.length > 0 && (
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '2px' }}>
              {dayEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: COLOR_MAP[evt.color] || evt.color,
                    flexShrink: 0,
                  }}
                />
              ))}
              {dayEvents.length > 4 && (
                <span style={{ fontSize: '7px', color: 'var(--text-muted)', marginLeft: '2px' }}>
                  +{dayEvents.length - 4}
                </span>
              )}
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  // ── Styles ────────────────────────────────────────────────

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid var(--iron-gray)',
    flexShrink: 0,
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={14} style={{ color: 'var(--cogitator-gold)' }} />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            {formatMonthYear(currentDate)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* View mode toggles */}
          <div style={{ display: 'flex', border: '1px solid var(--iron-gray)', marginRight: '6px' }}>
            {([
              ['month', Grid3X3],
              ['week', Columns3],
              ['day', List],
            ] as [CalendarViewMode, typeof Grid3X3][]).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '4px 6px',
                  background: viewMode === mode ? 'var(--omnissiah-red-dim)' : 'transparent',
                  border: 'none',
                  borderRight: '1px solid var(--iron-gray)',
                  color: viewMode === mode ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                title={mode}
              >
                <Icon size={12} />
              </button>
            ))}
          </div>
          <button onClick={goToPrev} style={{ ...btnStyle, padding: '4px 6px' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={goToToday} style={btnStyle}>
            TODAY
          </button>
          <button onClick={goToNext} style={{ ...btnStyle, padding: '4px 6px' }}>
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => openAddModal(selectedDate)}
            style={{
              ...btnStyle,
              background: 'var(--omnissiah-red-dim)',
              borderColor: 'var(--omnissiah-red)',
              color: 'var(--sacred-white)',
            }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* ═══ Week Day Headers ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        {weekDays.map((d) => (
          <div
            key={d}
            style={{
              padding: '6px 4px',
              textAlign: 'center',
              color: 'var(--parchment-dim)',
              fontSize: '9px',
              letterSpacing: '0.15em',
              borderRight: '1px solid var(--iron-gray)',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ═══ Month Grid ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          flex: 1,
          overflowY: 'auto',
        }}
        className="scrollbar-thin"
      >
        {renderMonthGrid()}
      </div>

      {/* ═══ Selected Day Events Panel ═══ */}
      <div
        style={{
          borderTop: '1px solid var(--iron-gray)',
          padding: '8px 12px',
          maxHeight: '160px',
          overflowY: 'auto',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
        className="scrollbar-thin"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '10px', letterSpacing: '0.15em' }}>
            {selectedDate} — {eventsForSelectedDate.length} EVENT{eventsForSelectedDate.length !== 1 ? 'S' : ''}
          </span>
        </div>
        {eventsForSelectedDate.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontStyle: 'italic' }}>
            No events scheduled. Double-click a date to add one.
          </div>
        ) : (
          eventsForSelectedDate.map((evt) => (
            <div
              key={evt.id}
              onClick={() => openEditModal(evt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px',
                marginBottom: '3px',
                background: 'var(--void-black)',
                borderLeft: `3px solid ${COLOR_MAP[evt.color] || evt.color}`,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {evt.time && (
                <span style={{ color: 'var(--noosphere-cyan)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={10} /> {evt.time}
                </span>
              )}
              <span style={{ color: 'var(--parchment)', fontSize: '11px', flex: 1 }}>{evt.title}</span>
              {evt.reminder && <Bell size={10} style={{ color: 'var(--cogitator-gold)' }} />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEvent(evt.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ═══ Add/Edit Event Modal ═══ */}
      {showAddModal && (
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
              maxWidth: '360px',
              boxShadow: 'var(--glow-red)',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {editingEvent ? 'EDIT EVENT' : 'ADD EVENT'} — {selectedDate}
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Title */}
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Event title..."
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                marginBottom: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />

            {/* Time */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>TIME</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['--omnissiah-red', '--noosphere-cyan', '--cogitator-gold'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '3px',
                        background: COLOR_MAP[c],
                        border: formColor === c ? '2px solid var(--sacred-white)' : '2px solid transparent',
                        cursor: 'pointer',
                        opacity: formColor === c ? 1 : 0.6,
                        transition: 'all 150ms ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description..."
              rows={2}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                marginBottom: '8px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            {/* Reminder toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', cursor: 'pointer' }}>
              <div
                onClick={() => setFormReminder(!formReminder)}
                style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid var(--iron-gray)',
                  background: formReminder ? 'var(--cogitator-gold)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {formReminder && <Check size={12} color="#000" />}
              </div>
              <Bell size={10} style={{ color: 'var(--cogitator-gold)' }} />
              <span style={{ color: 'var(--parchment-dim)', fontSize: '10px', letterSpacing: '0.1em' }}>REMINDER</span>
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {editingEvent && (
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  style={{
                    ...btnStyle,
                    background: 'transparent',
                    color: 'var(--omnissiah-red)',
                  }}
                >
                  <Trash2 size={12} /> DELETE
                </button>
              )}
              <button
                onClick={() => setShowAddModal(false)}
                style={{ ...btnStyle, background: 'transparent' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveEvent}
                style={{
                  ...btnStyle,
                  background: 'var(--omnissiah-red-dim)',
                  borderColor: 'var(--omnissiah-red)',
                  color: 'var(--sacred-white)',
                }}
              >
                <Check size={12} /> {editingEvent ? 'UPDATE' : 'CREATE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
