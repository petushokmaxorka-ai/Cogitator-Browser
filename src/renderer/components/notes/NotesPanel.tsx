// ═══ COGITATOR MEMORIA ═══
// Embedded notebook with markdown support — Dark Mechanicus
// Pray to the Omnissiah before each note.

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { storeGet, storeSet } from '../../lib/toolstore';
import { askAnathemetron } from '../../lib/anathemetron-chat';
import {
  Plus,
  Save,
  Trash2,
  Download,
  Search,
  Sparkles,
  FileText,
  Edit3,
  Eye,
  Columns2,
  Globe,
  FolderOpen,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  content: string;
  folder: 'general' | 'research' | 'code' | 'ideas';
  sourceUrl?: string;
  createdAt: number;
  modifiedAt: number;
}

type ViewMode = 'edit' | 'preview' | 'split';

const FOLDERS: Note['folder'][] = ['general', 'research', 'code', 'ideas'];
const FOLDER_LABELS: Record<Note['folder'], string> = {
  general: 'General',
  research: 'Research',
  code: 'Code',
  ideas: 'Ideas',
};
const STORAGE_KEY = 'cogitator_notes';

// ── Markdown Renderer (no library) ──────────────────────────

function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (triple backticks)
    .replace(/```([\s\S]*?)```/g, (_match, code) => {
      const clean = code.replace(/^\n/, '').replace(/\n$/, '');
      return `<pre style="background:#1a1a1a;border:1px solid #2A2A2A;padding:10px;overflow-x:auto;margin:8px 0;border-radius:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#E8E8E8;"><code>${clean}</code></pre>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="color:#C8A84B;font-size:14px;margin:10px 0 6px;font-weight:bold;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#C8A84B;font-size:16px;margin:12px 0 6px;font-weight:bold;border-bottom:1px solid #2A2A2A;padding-bottom:4px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#C8A84B;font-size:18px;margin:14px 0 8px;font-weight:bold;border-bottom:1px solid #FF0000;padding-bottom:4px;">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E8E8E8;font-weight:bold;">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#D4C5A0;">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;border:1px solid #2A2A2A;padding:1px 4px;font-family:\'Courier New\',monospace;font-size:12px;color:#00BFBF;">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00BFBF;text-decoration:underline;" target="_blank" rel="noopener">$1</a>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:2px solid #FF0000;margin:6px 0;padding:4px 12px;color:#8B7D6B;background:rgba(255,0,0,0.05);">$1</blockquote>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #2A2A2A;margin:12px 0;" />')
    // Ordered list
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:2px 0;"><span style="color:#C8A84B;">$1.</span> $2</li>')
    // Unordered list
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;"><span style="color:#FF0000;">†</span> $1</li>');

  // Wrap adjacent <li> elements in <ul> or <ol>
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (match) => {
    if (match.includes('</span>')) {
      const hasNumbers = /<span[^>]*>\d+\.<\/span>/.test(match);
      if (hasNumbers) {
        return `<ol style="margin:6px 0;padding-left:20px;">${match}</ol>`;
      }
    }
    return `<ul style="margin:6px 0;padding-left:16px;list-style:none;">${match}</ul>`;
  });

  // Line breaks for remaining text (but not inside pre/code)
  const blocks = html.split(/(<pre[\s\S]*?<\/pre>)/g);
  html = blocks.map((block, i) => {
    if (i % 2 === 1) return block; // keep pre blocks as-is
    return block
      .split('\n')
      .map((line) => (line.trim() ? `<p style="margin:4px 0;line-height:1.6;">${line}</p>` : ''))
      .join('');
  }).join('');

  return html;
}

// ── Storage helpers ─────────────────────────────────────────

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silence */ }
  return [];
}

function saveNotes(notes: Note[]) {
  void storeSet(STORAGE_KEY, notes);
}

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Component ───────────────────────────────────────────────

export default function NotesPanel() {
  // ── State
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  const hydrated = useRef(false);

  // Hydrate from the file-backed store (one-time localStorage migration)
  useEffect(() => {
    void (async () => {
      const stored = await storeGet<Note[]>(STORAGE_KEY);
      if (stored) {
        setNotes(stored);
      } else {
        const local = loadNotes();
        if (local.length) {
          await storeSet(STORAGE_KEY, local);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      hydrated.current = true;
    })();
  }, []);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  // ── Persist on change
  useEffect(() => {
    if (!hydrated.current) return;
    saveNotes(notes);
  }, [notes]);

  // ── Filtered notes
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [notes, searchQuery]);

  // ── Handlers

  const createNote = useCallback(() => {
    const newNote: Note = {
      id: generateId(),
      title: `Note ${notes.length + 1}`,
      content: '',
      folder: 'general',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setViewMode('edit');
  }, [notes.length]);

  const savePageAsNote = useCallback(async () => {
    try {
      const pageInfo = await window.electronAPI.page.getInfo();
      const newNote: Note = {
        id: generateId(),
        title: pageInfo.title || 'Untitled Page',
        content: pageInfo.content
          ? `## ${pageInfo.title}\n\n**Source:** [${pageInfo.url}](${pageInfo.url})\n\n---\n\n${pageInfo.content.slice(0, 5000)}`
          : `## ${pageInfo.title}\n\n**Source:** [${pageInfo.url}](${pageInfo.url})\n\n---\n\n_Page content unavailable_`,
        folder: 'research',
        sourceUrl: pageInfo.url,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
    } catch (err) {
      console.error('[Notes] Failed to save page:', err);
      const newNote: Note = {
        id: generateId(),
        title: 'Saved Page',
        content: '## Saved Page\n\n_Unable to fetch page content_',
        folder: 'research',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
    }
  }, []);

  const updateNote = useCallback(
    (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...updates, modifiedAt: Date.now() } : n
        )
      );
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setActiveNoteId((prev) => (prev === id ? null : prev));
    setShowDeleteConfirm(null);
  }, []);

  const askAI = useCallback(async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setAiLoading(true);
    setAiInsight('');
    try {
      const reply = await askAnathemetron(
        `Analyze this note briefly (summary + 2 actionable suggestions):\n\nTitle: ${activeNote.title}\n\n${activeNote.content}`
      );
      setAiInsight(reply || 'No response from Anathemetron.');
    } catch (err) {
      console.error('[Notes] AI request failed:', err);
      setAiInsight('AI communion failed.');
    } finally {
      setAiLoading(false);
    }
  }, [activeNote]);

  const exportNote = useCallback(() => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeNote]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── Styles

  const sBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid var(--iron-gray)',
    color: 'var(--parchment)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  };

  const sBtnHoverRed = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
    e.currentTarget.style.color = 'var(--omnissiah-red)';
    e.currentTarget.style.boxShadow = 'var(--glow-red)';
  };

  const sBtnHoverGold = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
    e.currentTarget.style.color = 'var(--cogitator-gold)';
    e.currentTarget.style.boxShadow = 'var(--glow-gold)';
  };

  const sBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = 'var(--iron-gray)';
    e.currentTarget.style.color = 'var(--parchment)';
    e.currentTarget.style.boxShadow = 'none';
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ── Toolbar ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={createNote}
          style={sBtn}
          onMouseEnter={sBtnHoverRed}
          onMouseLeave={sBtnLeave}
          title="New Note"
        >
          <Plus size={12} />
          <span>NEW</span>
        </button>

        <button
          onClick={savePageAsNote}
          style={sBtn}
          onMouseEnter={sBtnHoverGold}
          onMouseLeave={sBtnLeave}
          title="Save current page as note"
        >
          <Globe size={12} />
          <span>SAVE PAGE</span>
        </button>

        {activeNote && (
          <>
            <button
              onClick={askAI}
              style={sBtn}
              onMouseEnter={sBtnHoverRed}
              onMouseLeave={sBtnLeave}
              title="Ask Anathemetron AI"
            >
              <Sparkles size={12} />
              <span>ASK AI</span>
            </button>

            <button
              onClick={exportNote}
              style={sBtn}
              onMouseEnter={sBtnHoverGold}
              onMouseLeave={sBtnLeave}
              title="Export as .md"
            >
              <Download size={12} />
              <span>EXPORT</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(activeNote.id)}
              style={{ ...sBtn, marginLeft: 'auto' }}
              onMouseEnter={sBtnHoverRed}
              onMouseLeave={sBtnLeave}
              title="Delete note"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {/* ── Main Content: List + Editor ───────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Note List ─────────────────────────────────── */}
        <div
          style={{
            width: '180px',
            minWidth: '180px',
            borderRight: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--iron-dark)',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid var(--iron-gray)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              style={{
                flex: 1,
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 6px',
                outline: 'none',
              }}
            />
          </div>

          {/* Note count */}
          <div
            style={{
              padding: '4px 10px',
              fontSize: '10px',
              color: 'var(--parchment-dim)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--iron-gray)',
            }}
          >
            {filteredNotes.length} ENTRIES
          </div>

          {/* List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
            className="scrollbar-mechanicus"
          >
            {filteredNotes.length === 0 && (
              <div
                style={{
                  padding: '20px 10px',
                  textAlign: 'center',
                  color: 'var(--parchment-dim)',
                  fontSize: '11px',
                }}
              >
                {searchQuery ? 'No matches found' : 'No notes. Create one.'}
              </div>
            )}
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  background:
                    activeNoteId === note.id
                      ? 'rgba(255,0,0,0.08)'
                      : 'transparent',
                  border: 'none',
                  borderLeft:
                    activeNoteId === note.id
                      ? '2px solid var(--omnissiah-red)'
                      : '2px solid transparent',
                  borderBottom: '1px solid var(--iron-gray)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  fontFamily: 'var(--font-mono)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (activeNoteId !== note.id) {
                    e.currentTarget.style.background = 'var(--steel-gray)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeNoteId !== note.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '2px',
                  }}
                >
                  {note.sourceUrl ? (
                    <Globe size={10} style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }} />
                  ) : (
                    <FileText size={10} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      color:
                        activeNoteId === note.id
                          ? 'var(--omnissiah-red)'
                          : 'var(--sacred-white)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {note.title || 'Untitled'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--parchment-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: '14px',
                  }}
                >
                  {note.content.slice(0, 60).replace(/[#*_`]/g, '') || 'Empty'}
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    paddingLeft: '14px',
                    marginTop: '2px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{FOLDER_LABELS[note.folder]}</span>
                  <span>{formatDate(note.modifiedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor Area ───────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--void-black)',
          }}
        >
          {!activeNote ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--parchment-dim)',
                gap: '12px',
              }}
            >
              <FileText size={32} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '12px', letterSpacing: '0.15em' }}>
                SELECT OR CREATE A NOTE
              </div>
            </div>
          ) : (
            <>
              {/* Editor toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--iron-gray)',
                  flexShrink: 0,
                  background: 'var(--iron-dark)',
                }}
              >
                {/* Title input */}
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) =>
                    updateNote(activeNote.id, { title: e.target.value })
                  }
                  style={{
                    flex: 1,
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    padding: '4px 8px',
                    outline: 'none',
                    fontWeight: 'bold',
                  }}
                />

                {/* Folder select */}
                <select
                  value={activeNote.folder}
                  onChange={(e) =>
                    updateNote(activeNote.id, {
                      folder: e.target.value as Note['folder'],
                    })
                  }
                  style={{
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    padding: '4px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {FOLDER_LABELS[f].toUpperCase()}
                    </option>
                  ))}
                </select>

                {/* View mode toggles */}
                <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                  {([
                    { mode: 'edit' as ViewMode, icon: Edit3, label: 'EDIT' },
                    { mode: 'preview' as ViewMode, icon: Eye, label: 'VIEW' },
                    { mode: 'split' as ViewMode, icon: Columns2, label: 'SPLIT' },
                  ]).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 6px',
                        background:
                          viewMode === mode
                            ? 'rgba(255,0,0,0.15)'
                            : 'transparent',
                        border:
                          viewMode === mode
                            ? '1px solid var(--omnissiah-red)'
                            : '1px solid var(--iron-gray)',
                        color:
                          viewMode === mode
                            ? 'var(--omnissiah-red)'
                            : 'var(--parchment-dim)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Icon size={11} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Source URL badge */}
              {activeNote.sourceUrl && (
                <div
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    color: 'var(--noosphere-cyan)',
                    borderBottom: '1px solid var(--iron-gray)',
                    background: 'rgba(0,191,191,0.05)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Globe size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {activeNote.sourceUrl}
                </div>
              )}

              {(aiLoading || aiInsight) && (
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: 'var(--parchment)',
                    borderBottom: '1px solid var(--iron-gray)',
                    background: 'rgba(255,0,0,0.05)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Sparkles size={10} style={{ display: 'inline', marginRight: '4px', color: 'var(--cogitator-gold)' }} />
                  {aiLoading ? 'Communing with Anathemetron…' : aiInsight}
                </div>
              )}

              {/* Editor / Preview / Split */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Edit pane */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                  <div
                    style={{
                      flex: viewMode === 'split' ? 1 : 'none',
                      width: viewMode === 'edit' ? '100%' : undefined,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRight:
                        viewMode === 'split'
                          ? '1px solid var(--iron-gray)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px 10px',
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.1em',
                        borderBottom: '1px solid var(--iron-gray)',
                        background: 'var(--iron-dark)',
                      }}
                    >
                      MARKDOWN SOURCE
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={activeNote.content}
                      onChange={(e) =>
                        updateNote(activeNote.id, { content: e.target.value })
                      }
                      placeholder="Pray to the Omnissiah and write your thoughts..."
                      style={{
                        flex: 1,
                        width: '100%',
                        resize: 'none',
                        background: 'var(--void-black)',
                        border: 'none',
                        color: 'var(--sacred-white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        padding: '10px',
                        outline: 'none',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                      }}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Preview pane */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div
                    style={{
                      flex: viewMode === 'split' ? 1 : 'none',
                      width: viewMode === 'preview' ? '100%' : undefined,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px 10px',
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.1em',
                        borderBottom: '1px solid var(--iron-gray)',
                        background: 'var(--iron-dark)',
                      }}
                    >
                      RENDERED PREVIEW
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: '10px',
                        overflowY: 'auto',
                        color: 'var(--sacred-white)',
                        fontSize: '13px',
                        lineHeight: 1.6,
                      }}
                      className="scrollbar-mechanicus"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(activeNote.content),
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation ───────────────────────────── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--omnissiah-red)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 100,
            boxShadow: 'var(--glow-red)',
            minWidth: '200px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--omnissiah-red)' }}>
            DELETE THIS NOTE?
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              style={sBtn}
              onMouseEnter={sBtnHoverGold}
              onMouseLeave={sBtnLeave}
            >
              CANCEL
            </button>
            <button
              onClick={() => deleteNote(showDeleteConfirm)}
              style={{ ...sBtn, color: 'var(--omnissiah-red)', borderColor: 'var(--omnissiah-red)' }}
              onMouseEnter={sBtnHoverRed}
              onMouseLeave={sBtnLeave}
            >
              DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
