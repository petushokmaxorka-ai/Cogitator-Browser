// ═══════════════════════════════════════════════════════════════════════════════
// STICKY NOTES — Floating Mnemonic Implants
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Overlay component — renders ON TOP of everything (z-index: 99999)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Minus, Maximize2, GripHorizontal } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  minimized: boolean;
}

interface StickyNoteItemProps {
  note: StickyNote;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
  containerSize: { width: number; height: number };
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_sticky_notes';

const NOTE_COLORS = [
  { name: 'yellow', value: 'rgba(200, 168, 75, 0.2)', border: 'rgba(200, 168, 75, 0.5)' },
  { name: 'red', value: 'rgba(255, 0, 0, 0.15)', border: 'rgba(255, 0, 0, 0.4)' },
  { name: 'cyan', value: 'rgba(0, 191, 191, 0.15)', border: 'rgba(0, 191, 191, 0.4)' },
  { name: 'green', value: 'rgba(0, 255, 0, 0.1)', border: 'rgba(0, 255, 0, 0.4)' },
];

// ── Storage Helpers ──────────────────────────────────────────────────────────

function loadNotes(): StickyNote[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveNotes(notes: StickyNote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Individual Note Component ────────────────────────────────────────────────

function StickyNoteItem({ note, onUpdate, onDelete, containerSize }: StickyNoteItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);

  const colorDef = NOTE_COLORS.find((c) => c.name === note.color) || NOTE_COLORS[0];

  // ── Drag Handlers ──────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-note-action]')) return;
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - note.x,
        y: e.clientY - note.y,
      };
      e.preventDefault();
    },
    [note.x, note.y]
  );

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.stopPropagation();
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, containerSize.width - note.width));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, containerSize.height - (note.minimized ? 32 : note.height)));
        onUpdate(note.id, { x: newX, y: newY });
      }
      if (isResizing) {
        const rect = itemRef.current?.getBoundingClientRect();
        if (rect) {
          const newWidth = Math.max(140, Math.min(e.clientX - rect.left, containerSize.width - note.x));
          const newHeight = Math.max(100, Math.min(e.clientY - rect.top, containerSize.height - note.y));
          onUpdate(note.id, { width: newWidth, height: newHeight });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, note.id, note.width, note.height, note.x, note.y, note.minimized, containerSize, onUpdate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={itemRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.minimized ? 160 : note.width,
        height: note.minimized ? 32 : note.height,
        background: colorDef.value,
        border: `1px solid ${colorDef.border}`,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 8px ${colorDef.border}`,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        zIndex: isDragging ? 100000 : 99999,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 150ms ease',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          background: colorDef.border,
          cursor: 'grab',
          flexShrink: 0,
          height: 32,
        }}
      >
        <GripHorizontal size={12} style={{ color: 'var(--parchment-dim)', opacity: 0.5 }} />
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            data-note-action
            onClick={() => onUpdate(note.id, { minimized: !note.minimized })}
            style={{
              padding: '2px',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              background: 'transparent',
            }}
            title={note.minimized ? 'Expand' : 'Minimize'}
          >
            {note.minimized ? <Maximize2 size={10} /> : <Minus size={10} />}
          </button>
          <button
            data-note-action
            onClick={() => onDelete(note.id)}
            style={{
              padding: '2px',
              color: 'var(--omnissiah-red)',
              cursor: 'pointer',
              background: 'transparent',
            }}
            title="Delete"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!note.minimized && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <textarea
            data-note-action
            value={note.text}
            onChange={(e) => onUpdate(note.id, { text: e.target.value })}
            placeholder="Enter mnemonic data..."
            style={{
              flex: 1,
              width: '100%',
              padding: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          {/* Color picker */}
          <div
            data-note-action
            style={{
              display: 'flex',
              gap: '4px',
              padding: '4px 6px',
              borderTop: `1px solid ${colorDef.border}`,
              flexShrink: 0,
            }}
          >
            {NOTE_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => onUpdate(note.id, { color: c.name })}
                style={{
                  width: 14,
                  height: 14,
                  background: c.value,
                  border: `2px solid ${note.color === c.name ? 'var(--sacred-white)' : c.border}`,
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={c.name}
              />
            ))}
          </div>
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 12,
              height: 12,
              cursor: 'nwse-resize',
              background: `linear-gradient(135deg, transparent 50%, ${colorDef.border} 50%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main StickyNotes Overlay Component ───────────────────────────────────────

interface StickyNotesOverlayProps {
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function StickyNotesOverlay({ containerRef }: StickyNotesOverlayProps) {
  const [notes, setNotes] = useState<StickyNote[]>(loadNotes);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // ── Container size tracking ────────────────────────────────────────────────

  useEffect(() => {
    const updateSize = () => {
      if (containerRef?.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      } else {
        setContainerSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const addNote = useCallback(() => {
    const newNote: StickyNote = {
      id: generateId(),
      text: '',
      x: 50 + (notes.length * 20) % 200,
      y: 50 + (notes.length * 20) % 200,
      width: 200,
      height: 160,
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length].name,
      minimized: false,
    };
    setNotes((prev) => [...prev, newNote]);
  }, [notes.length]);

  const updateNote = useCallback((id: string, updates: Partial<StickyNote>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Notes — pointerEvents: auto so they're interactive */}
      {notes.map((note) => (
        <div key={note.id} style={{ pointerEvents: 'auto' }}>
          <StickyNoteItem
            note={note}
            onUpdate={updateNote}
            onDelete={deleteNote}
            containerSize={containerSize}
          />
        </div>
      ))}

      {/* Add Button — fixed position */}
      <button
        onClick={addNote}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid var(--cogitator-gold-dim)',
          color: 'var(--cogitator-gold)',
          fontSize: '20px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          transition: 'all 150ms ease',
          zIndex: 100001,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 75, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--cogitator-gold-dim)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        }}
        title="Add Sticky Note"
      >
        <Plus size={20} />
      </button>

      {/* Note count indicator */}
      {notes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 64,
            padding: '4px 8px',
            background: 'rgba(10, 10, 10, 0.8)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            pointerEvents: 'none',
          }}
        >
          {notes.length} mnemonic implant{notes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ═══ Default export for standalone usage ═══
export default StickyNotesOverlay;
