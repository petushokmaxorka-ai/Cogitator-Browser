// ═══════════════════════════════════════════════════════════
// JOURNAL / DIARY — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Personal diary with AI mood analysis via Ollama
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { askAnathemetron } from '../../lib/anathemetron-chat';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  X,
  Sparkles,
  Bold,
  Italic,
  Tag,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'excited';
  content: string;
  tags: string[];
  wordCount: number;
  createdAt: number;
}

type MoodType = 'happy' | 'neutral' | 'sad' | 'angry' | 'excited';
type AIAnalysisState = 'idle' | 'loading' | 'done' | 'error';

const STORAGE_KEY = 'cogitator_journal';

const MOOD_CONFIG: Record<MoodType, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '\u263A', color: '#2ECC71', label: 'HAPPY' },
  neutral: { emoji: '\u25CB', color: '#8B7D6B', label: 'NEUTRAL' },
  sad: { emoji: '\u2639', color: '#00BFBF', label: 'SAD' },
  angry: { emoji: '\u26A1', color: '#FF0000', label: 'ANGRY' },
  excited: { emoji: '\u2605', color: '#C8A84B', label: 'EXCITED' },
};

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'jr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseTags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? [...new Set(matches.map((t) => t.slice(1)))] : [];
}

async function analyzeMoodOllama(entries: JournalEntry[]): Promise<string> {
  const recentEntries = entries.slice(-10);
  const prompt = `Analyze these journal entries and provide a brief mood analysis (2-3 sentences). Identify the dominant emotional tone, any recurring themes, and suggest one mindfulness tip.\n\nEntries:\n${recentEntries.map((e) => `[${e.date}] (${e.mood}) ${e.content.slice(0, 200)}${e.content.length > 200 ? '...' : ''}`).join('\n\n')}\n\nProvide a concise analysis.`;
  return askAnathemetron(prompt);
}

// ── Component ───────────────────────────────────────────────

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries);
  const [showEditor, setShowEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiState, setAiState] = useState<AIAnalysisState>('idle');
  const [aiResult, setAiResult] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  // Editor state
  const [editDate, setEditDate] = useState(getTodayStr());
  const [editMood, setEditMood] = useState<MoodType>('neutral');
  const [editContent, setEditContent] = useState('');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Persist
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  // ── CRUD ──────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (!editContent.trim()) return;
    const tags = parseTags(editContent);
    const wc = countWords(editContent);

    // Check if entry exists for this date
    const existing = entries.find((e) => e.date === editDate);
    if (existing) {
      setEntries((prev) =>
        prev.map((e) =>
          e.date === editDate
            ? { ...e, mood: editMood, content: editContent, tags, wordCount: wc, createdAt: Date.now() }
            : e
        )
      );
    } else {
      const newEntry: JournalEntry = {
        id: generateId(),
        date: editDate,
        mood: editMood,
        content: editContent,
        tags,
        wordCount: wc,
        createdAt: Date.now(),
      };
      setEntries((prev) => [newEntry, ...prev.sort((a, b) => b.date.localeCompare(a.date))]);
    }
    setShowEditor(false);
    setEditContent('');
    setEditMood('neutral');
  }, [editDate, editMood, editContent, entries]);

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedEntry === id) setSelectedEntry(null);
  }, [selectedEntry]);

  const openEditor = useCallback((entry?: JournalEntry) => {
    if (entry) {
      setEditDate(entry.date);
      setEditMood(entry.mood);
      setEditContent(entry.content);
    } else {
      setEditDate(getTodayStr());
      setEditMood('neutral');
      setEditContent('');
    }
    setShowEditor(true);
  }, []);

  // ── AI Analysis ───────────────────────────────────────────

  const handleAIAnalyze = useCallback(async () => {
    if (entries.length === 0) return;
    setAiState('loading');
    setAiResult('');
    try {
      const result = await analyzeMoodOllama(entries);
      if (result) {
        setAiResult(result);
        setAiState('done');
      } else {
        setAiState('error');
      }
    } catch {
      setAiState('error');
    }
  }, [entries]);

  // ── Search ────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries.sort((a, b) => b.date.localeCompare(a.date));
    const q = searchQuery.toLowerCase();
    return entries
      .filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          e.date.includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, searchQuery]);

  // Calendar data
  const datesWithEntries = useMemo(() => {
    const map = new Map<string, MoodType>();
    entries.forEach((e) => map.set(e.date, e.mood));
    return map;
  }, [entries]);

  // Stats
  const totalWords = useMemo(() => entries.reduce((sum, e) => sum + e.wordCount, 0), [entries]);
  const totalEntries = entries.length;
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const dominantMood = useMemo(() => {
    const entries_ = Object.entries(moodCounts);
    if (entries_.length === 0) return null;
    return entries_.sort((a, b) => b[1] - a[1])[0][0] as MoodType;
  }, [moodCounts]);

  // ── Export ────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const data = entries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (e) =>
          `--- ${e.date} [${e.mood.toUpperCase()}] ---\nTags: ${e.tags.join(', ') || 'none'}\nWords: ${e.wordCount}\n\n${e.content}\n`
      )
      .join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogitator-journal-${getTodayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  // ── Insert formatting ─────────────────────────────────────

  const insertFormat = useCallback((prefix: string, suffix: string) => {
    const textarea = document.getElementById('journal-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = editContent.slice(0, start);
    const selected = editContent.slice(start, end);
    const after = editContent.slice(end);
    setEditContent(before + prefix + (selected || 'text') + suffix + after);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + (selected || 'text').length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [editContent]);

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
          <BookOpen size={14} style={{ color: 'var(--cogitator-gold)' }} />
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            JOURNAL
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {totalEntries} ENTRIES | {totalWords} WORDS
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleExport} style={{ ...btnBase, padding: '4px 8px' }} title="Export">
            <Download size={12} />
          </button>
          <button onClick={handleAIAnalyze} disabled={aiState === 'loading' || entries.length === 0} style={{ ...btnBase, borderColor: 'var(--cogitator-gold)', color: 'var(--cogitator-gold)', opacity: aiState === 'loading' ? 0.6 : 1 }}>
            {aiState === 'loading' ? <span className="loading-cog">◆</span> : <Sparkles size={12} />}
            {aiState === 'loading' ? ' ANALYZING...' : ' ANALYZE'}
          </button>
          <button
            onClick={() => openEditor()}
            style={{ ...btnBase, background: 'var(--omnissiah-red-dim)', borderColor: 'var(--omnissiah-red)', color: 'var(--sacred-white)' }}
          >
            <Plus size={12} /> WRITE
          </button>
        </div>
      </div>

      {/* ═══ AI Analysis Result ═══ */}
      {aiState === 'done' && aiResult && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(200, 168, 75, 0.08)',
            borderBottom: '1px solid var(--cogitator-gold-dim)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={10} style={{ color: 'var(--cogitator-gold)' }} />
            <span style={{ color: 'var(--cogitator-gold)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              AI MOOD ANALYSIS
            </span>
          </div>
          <div style={{ color: 'var(--parchment)', fontSize: '10px', lineHeight: 1.6, fontStyle: 'italic' }}>
            {aiResult}
          </div>
        </div>
      )}
      {aiState === 'error' && (
        <div style={{ padding: '6px 12px', color: 'var(--omnissiah-red)', fontSize: '9px', borderBottom: '1px solid var(--iron-gray)' }}>
          ✗ OLLAMA CONNECTION FAILED — IS THE SERVER RUNNING?
        </div>
      )}

      {/* ═══ Search Bar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <Search size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries by text, date, or #tag..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* ═══ Mood Stats ═══ */}
      {entries.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px',
            borderBottom: '1px solid var(--iron-gray)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em' }}>MOODS:</span>
          {(Object.entries(moodCounts) as [MoodType, number][]).map(([mood, count]) => {
            const mc = MOOD_CONFIG[mood];
            return (
              <span key={mood} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: mc.color }}>
                {mc.emoji} {count}
              </span>
            );
          })}
          {dominantMood && (
            <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--parchment-dim)', letterSpacing: '0.1em' }}>
              DOMINANT: <span style={{ color: MOOD_CONFIG[dominantMood].color }}>{MOOD_CONFIG[dominantMood].label}</span>
            </span>
          )}
        </div>
      )}

      {/* ═══ Entries List ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} className="scrollbar-thin">
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px', marginTop: '40px', fontStyle: 'italic' }}>
            <BookOpen size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <br />
            {searchQuery ? 'No entries match your search.' : 'No journal entries. Write your first entry.'}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const mc = MOOD_CONFIG[entry.mood];
            const isSelected = selectedEntry === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(isSelected ? null : entry.id)}
                style={{
                  marginBottom: '6px',
                  background: isSelected ? 'var(--iron-dark)' : 'var(--iron-dark)',
                  border: `1px solid ${isSelected ? mc.color : 'var(--iron-gray)'}`,
                  borderLeft: `3px solid ${mc.color}`,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Entry Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: mc.color, fontSize: '14px' }}>{mc.emoji}</span>
                    <span style={{ color: 'var(--parchment)', fontSize: '11px', fontWeight: 'bold' }}>{entry.date}</span>
                    <span style={{ color: mc.color, fontSize: '8px', letterSpacing: '0.1em' }}>{mc.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{entry.wordCount}w</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(entry);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px', fontSize: '8px', letterSpacing: '0.1em' }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.id);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <div
                  style={{
                    color: 'var(--parchment)',
                    fontSize: isSelected ? '11px' : '10px',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: isSelected ? 999 : 2,
                    WebkitBoxOrient: 'vertical',
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: entry.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--sacred-white)">$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em style="color:var(--cogitator-gold)">$1</em>')
                      .replace(/#(\w+)/g, '<span style="color:var(--noosphere-cyan)">#$1</span>'),
                  }}
                />

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '8px',
                          color: 'var(--noosphere-cyan)',
                          background: 'var(--void-black)',
                          padding: '1px 5px',
                          border: '1px solid var(--noosphere-cyan-dim)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Entry Editor Modal ═══ */}
      {showEditor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 10, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--omnissiah-red)',
              padding: '14px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--glow-red)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
              <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                JOURNAL ENTRY
              </span>
              <button onClick={() => setShowEditor(false)} style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {/* Date + Mood */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>DATE</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>MOOD</label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {(Object.entries(MOOD_CONFIG) as [MoodType, typeof MOOD_CONFIG.happy][]).map(([m, config]) => (
                    <button
                      key={m}
                      onClick={() => setEditMood(m)}
                      title={config.label}
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editMood === m ? `${config.color}33` : 'var(--void-black)',
                        border: `1px solid ${editMood === m ? config.color : 'var(--iron-gray)'}`,
                        color: config.color,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {config.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexShrink: 0 }}>
              <button
                onClick={() => insertFormat('**', '**')}
                style={{
                  padding: '3px 8px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
                title="Bold"
              >
                <Bold size={10} />
              </button>
              <button
                onClick={() => insertFormat('*', '*')}
                style={{
                  padding: '3px 8px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontStyle: 'italic',
                }}
                title="Italic"
              >
                <Italic size={10} />
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '8px', marginLeft: '8px', alignSelf: 'center', letterSpacing: '0.1em' }}>
                USE #TAG FOR TAGS | **BOLD** | *ITALIC*
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '9px', alignSelf: 'center' }}>
                {countWords(editContent)} words
              </span>
            </div>

            {/* Textarea */}
            <textarea
              id="journal-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your thoughts..."
              style={{
                flex: 1,
                minHeight: '120px',
                padding: '8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                marginBottom: '10px',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={() => setShowEditor(false)}
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
                onClick={handleSave}
                disabled={!editContent.trim()}
                style={{
                  padding: '6px 14px',
                  background: 'var(--omnissiah-red-dim)',
                  border: '1px solid var(--omnissiah-red)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: editContent.trim() ? 'pointer' : 'not-allowed',
                  opacity: editContent.trim() ? 1 : 0.4,
                  boxShadow: 'var(--glow-red)',
                }}
              >
                SAVE ENTRY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
