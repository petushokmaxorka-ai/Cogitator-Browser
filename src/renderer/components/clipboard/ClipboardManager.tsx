// ═══════════════════════════════════════════════════════════
// Memory Cache — Clipboard Manager
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clipboard,
  Star,
  Trash2,
  Search,
  X,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'link' | 'code' | 'image';
  timestamp: number;
  favorite: boolean;
  source?: string;
}

// ── Helpers ─────────────────────────────────────────────────

const detectType = (text: string): ClipboardItem['type'] => {
  if (text.startsWith('http')) return 'link';
  if (
    text.includes('`') ||
    text.includes('{') ||
    text.includes('function') ||
    text.includes('const ') ||
    text.includes('let ') ||
    text.includes('var ') ||
    text.includes('=>') ||
    text.includes('import ') ||
    text.includes('class ') ||
    text.includes('<') && text.includes('>') && (text.includes('/') || text.includes('='))
  )
    return 'code';
  return 'text';
};

const getTypeColor = (type: ClipboardItem['type']): string => {
  switch (type) {
    case 'text':
      return 'var(--parchment)';
    case 'link':
      return 'var(--noosphere-cyan)';
    case 'code':
      return 'var(--cogitator-gold)';
    case 'image':
      return 'var(--omnissiah-red)';
    default:
      return 'var(--parchment)';
  }
};

const getTypeBg = (type: ClipboardItem['type']): string => {
  switch (type) {
    case 'text':
      return 'rgba(192, 181, 155, 0.12)';
    case 'link':
      return 'rgba(0, 168, 255, 0.12)';
    case 'code':
      return 'rgba(200, 168, 75, 0.12)';
    case 'image':
      return 'rgba(255, 0, 0, 0.12)';
    default:
      return 'rgba(192, 181, 155, 0.12)';
  }
};

const getTypeLabel = (type: ClipboardItem['type']): string => {
  return type.toUpperCase();
};

const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Hook ────────────────────────────────────────────────────

function useClipboardHistory() {
  const [history, setHistory] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('cogitator_clipboard');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [enabled, setEnabled] = useState(false);
  const lastTextRef = useRef('');

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastTextRef.current) {
          lastTextRef.current = text;
          addItem(text);
        }
      } catch {
        // Clipboard permission denied or empty
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  const addItem = useCallback((text: string) => {
    const trimmed = text.slice(0, 500);
    const type = detectType(trimmed);

    setHistory((prev) => {
      // Skip if duplicate content
      if (prev.some((p) => p.content === trimmed)) return prev;

      const newItem: ClipboardItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: trimmed,
        type,
        timestamp: Date.now(),
        favorite: false,
        source: 'COGITATOR',
      };
      const updated = [newItem, ...prev].slice(0, 100);
      try {
        localStorage.setItem('cogitator_clipboard', JSON.stringify(updated));
      } catch {
        // Storage full
      }
      return updated;
    });
  }, []);

  const copyToClipboard = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, favorite: !p.favorite } : p
      );
      localStorage.setItem('cogitator_clipboard', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('cogitator_clipboard', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('cogitator_clipboard');
  }, []);

  return {
    history,
    enabled,
    setEnabled,
    addItem,
    copyToClipboard,
    toggleFavorite,
    removeItem,
    clearAll,
  };
}

// ── Component ───────────────────────────────────────────────

export function ClipboardManager() {
  const {
    history,
    enabled,
    setEnabled,
    copyToClipboard,
    toggleFavorite,
    removeItem,
    clearAll,
  } = useClipboardHistory();

  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Filtered items ────────────────────────────────────────

  const filtered = history.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.content.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  });

  // Separate favorites
  const favorites = filtered.filter((i) => i.favorite);
  const regular = filtered.filter((i) => !i.favorite);
  const displayItems = [...favorites, ...regular];

  // ── Handlers ──────────────────────────────────────────────

  const handleCopy = async (item: ClipboardItem) => {
    await copyToClipboard(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
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
      {/* ── Header ──────────────────────────────────────────── */}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          <Clipboard size={16} />
          <span>MEMORY CACHE — Clipboard</span>
        </div>
      </div>

      {/* ── Toggle & Controls ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {/* Track toggle */}
        <button
          onClick={() => setEnabled(!enabled)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: enabled ? 'rgba(0, 168, 255, 0.12)' : 'var(--iron-dark)',
            border: enabled
              ? '1px solid var(--noosphere-cyan)'
              : '1px solid var(--iron-gray)',
            color: enabled ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = enabled
              ? 'var(--noosphere-cyan)'
              : 'var(--parchment)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = enabled
              ? 'var(--noosphere-cyan)'
              : 'var(--iron-gray)';
          }}
        >
          {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          <span>TRACK CLIPBOARD</span>
        </button>

        {/* Stats */}
        <div
          style={{
            fontSize: '10px',
            color: 'var(--parchment-dim)',
            letterSpacing: '0.06em',
          }}
        >
          {history.length}/100
        </div>

        {/* Clear all */}
        {history.length > 0 && (
          <button
            onClick={() =>
              showClearConfirm ? handleClearAll() : setShowClearConfirm(true)
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: showClearConfirm
                ? 'rgba(255, 0, 0, 0.15)'
                : 'transparent',
              border: showClearConfirm
                ? '1px solid var(--omnissiah-red)'
                : '1px solid var(--iron-gray)',
              color: showClearConfirm
                ? 'var(--omnissiah-red)'
                : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!showClearConfirm) {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showClearConfirm) {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }
            }}
          >
            {showClearConfirm ? (
              <>
                <AlertTriangle size={10} />
                <span>CONFIRM</span>
              </>
            ) : (
              <>
                <Trash2 size={10} />
                <span>CLEAR ALL</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Permission warning ──────────────────────────────── */}
      {enabled && (
        <div
          style={{
            padding: '6px 12px',
            background: 'rgba(0, 168, 255, 0.05)',
            borderBottom: '1px solid var(--iron-gray)',
            fontSize: '9px',
            color: 'var(--noosphere-cyan)',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          Clipboard tracking active — monitoring every second
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <Search size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clipboard history..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.04em',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* ── Items List ──────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {displayItems.length === 0 ? (
          <div
            style={{
              padding: '40px 12px',
              textAlign: 'center',
              color: 'var(--parchment-dim)',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Clipboard size={32} style={{ opacity: 0.3 }} />
            <div>
              {search
                ? 'No matching items'
                : enabled
                  ? 'Clipboard history is empty\nCopy something to begin tracking'
                  : 'Enable TRACK CLIPBOARD to start monitoring'}
            </div>
          </div>
        ) : (
          displayItems.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--iron-gray)',
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                  background: isCopied
                    ? 'rgba(0, 168, 255, 0.08)'
                    : 'transparent',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isCopied) {
                    e.currentTarget.style.background = 'var(--iron-dark)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCopied) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Copied indicator */}
                {isCopied && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '12px',
                      padding: '2px 6px',
                      background: 'var(--noosphere-cyan)',
                      color: 'var(--void-black)',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      letterSpacing: '0.1em',
                      borderRadius: '2px',
                      animation: 'fadeIn 150ms ease',
                    }}
                  >
                    COPIED!
                  </div>
                )}

                {/* Top row: preview + actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  {/* Content preview */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: isCopied
                        ? 'var(--noosphere-cyan)'
                        : 'var(--parchment)',
                      fontSize: '11px',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      fontFamily:
                        item.type === 'code'
                          ? 'var(--font-mono)'
                          : 'var(--font-mono)',
                    }}
                  >
                    {item.content}
                  </div>

                  {/* Action buttons */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Favorite */}
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      title={item.favorite ? 'Remove favorite' : 'Add favorite'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        color: item.favorite
                          ? 'var(--cogitator-gold)'
                          : 'var(--parchment-dim)',
                        transition: 'color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!item.favorite) {
                          e.currentTarget.style.color = 'var(--cogitator-gold)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!item.favorite) {
                          e.currentTarget.style.color = 'var(--parchment-dim)';
                        }
                      }}
                    >
                      <Star
                        size={13}
                        fill={item.favorite ? 'var(--cogitator-gold)' : 'none'}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => removeItem(item.id)}
                      title="Remove item"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        color: 'var(--parchment-dim)',
                        transition: 'color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--omnissiah-red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--parchment-dim)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Bottom row: meta */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  {/* Type badge */}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '2px',
                      background: getTypeBg(item.type),
                      color: getTypeColor(item.type),
                      fontSize: '8px',
                      letterSpacing: '0.08em',
                      fontWeight: 'bold',
                    }}
                  >
                    {getTypeLabel(item.type)}
                  </span>

                  {/* Timestamp */}
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      fontSize: '9px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formatTimestamp(item.timestamp)} · {timeAgo(item.timestamp)}
                  </span>

                  {/* Source */}
                  {item.source && (
                    <span
                      style={{
                        color: 'var(--parchment-dim)',
                        fontSize: '8px',
                        letterSpacing: '0.06em',
                        marginLeft: 'auto',
                      }}
                    >
                      via {item.source}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderTop: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          flexShrink: 0,
          fontSize: '9px',
          color: 'var(--parchment-dim)',
          letterSpacing: '0.06em',
        }}
      >
        <span>
          {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
        </span>
        {favorites.length > 0 && (
          <span style={{ color: 'var(--cogitator-gold)' }}>
            {favorites.length} ★ favorite
          </span>
        )}
      </div>
    </div>
  );
}

export default ClipboardManager;
