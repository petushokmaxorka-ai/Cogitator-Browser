// ═══════════════════════════════════════════════════════════
// FindBar — In-Page Search Overlay
// ═══════════════════════════════════════════════════════════
//
// Ctrl+F to summon. Escape to dismiss.
// Glows with the sacred red of the Omnissiah.
//
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ───────────────────────────────────────────────

interface FindResult {
  activeMatchOrdinal: number;
  matches: number;
}

interface FindBarProps {
  activeTabId: string | null;
  visible: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

const FindBar: React.FC<FindBarProps> = ({ activeTabId, visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<FindResult>({ activeMatchOrdinal: 0, matches: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Find Action ─────────────────────────────────────────

  const performFind = useCallback(
    (text: string) => {
      if (!activeTabId || !text.trim()) {
        setResult({ activeMatchOrdinal: 0, matches: 0 });
        return;
      }

      if (window.electronAPI?.find?.inPage) {
        window.electronAPI.find.inPage(text);
      }
    },
    [activeTabId],
  );

  const stopFind = useCallback(() => {
    if (window.electronAPI?.find?.stop) {
      window.electronAPI.find.stop();
    }
    setResult({ activeMatchOrdinal: 0, matches: 0 });
  }, []);

  // ── Navigation ──────────────────────────────────────────

  const findNext = useCallback(() => {
    if (query.trim()) {
      performFind(query);
    }
  }, [query, performFind]);

  const findPrevious = useCallback(() => {
    if (!query.trim()) return;
    // Electron's findInPage with findNext: false goes to previous
    if (activeTabId && window.electronAPI?.find?.inPage) {
      // Re-send the same query to cycle forward (Electron cycles)
      window.electronAPI.find.inPage(query);
    }
  }, [query, activeTabId]);

  // ── Input Handling ──────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      performFind(value);
    } else {
      stopFind();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      findNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // ── Listen for Results ──────────────────────────────────

  useEffect(() => {
    if (!window.electronAPI?.find?.onResult) return;

    const handleResult = (data: FindResult & { tabId: string }) => {
      if (data.matches > 0) {
        setResult({
          activeMatchOrdinal: data.activeMatchOrdinal,
          matches: data.matches,
        });
      }
    };

    const unsubscribe = window.electronAPI.find.onResult(handleResult);
    return () => {
      unsubscribe?.();
    };
  }, []);

  // ── Global Ctrl+F Shortcut ──────────────────────────────

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        if (!visible) {
          // Parent should show us
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [visible]);

  // ── Focus Input on Show ─────────────────────────────────

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [visible]);

  // ── Clear on Close ──────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      stopFind();
      setQuery('');
      setResult({ activeMatchOrdinal: 0, matches: 0 });
    }
  }, [visible, stopFind]);

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  if (!visible) return null;

  const hasResults = result.matches > 0;

  return (
    <div
      className="find-bar-overlay"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        backgroundColor: '#1E1E1E', // --iron-dark
        border: '1px solid #8B0000', // --omnissiah-red dim
        borderRadius: 6,
        boxShadow: '0 0 12px rgba(139, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.6)',
        fontFamily: 'var(--font-mono, "Courier New", monospace)',
        fontSize: 13,
        minWidth: 340,
      }}
    >
      {/* Search Icon */}
      <span
        style={{
          color: '#8B0000',
          fontSize: 14,
          userSelect: 'none',
        }}
      >
        🔍
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Искать на странице..."
        style={{
          flex: 1,
          backgroundColor: '#2A2A2A',
          border: '1px solid #3A3A3A',
          borderRadius: 4,
          padding: '4px 8px',
          color: '#E8E8E8',
          fontFamily: 'inherit',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#FF0000';
          e.currentTarget.style.boxShadow = '0 0 6px rgba(255, 0, 0, 0.3)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#3A3A3A';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />

      {/* Counter */}
      {hasResults && (
        <span
          style={{
            color: '#C8A84B', // --cogitator-gold
            fontSize: 12,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {result.activeMatchOrdinal}/{result.matches}
        </span>
      )}

      {!hasResults && query.trim() && (
        <span
          style={{
            color: '#8B0000',
            fontSize: 12,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Не найдено
        </span>
      )}

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 20,
          backgroundColor: '#3A3A3A',
        }}
      />

      {/* Up Button */}
      <button
        onClick={findPrevious}
        disabled={!hasResults}
        title="Предыдущее совпадение (Enter)"
        style={{
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 4,
          color: hasResults ? '#E8E8E8' : '#3A3A3A',
          cursor: hasResults ? 'pointer' : 'not-allowed',
          padding: '2px 6px',
          fontSize: 14,
          lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (hasResults) {
            e.currentTarget.style.backgroundColor = '#3A3A3A';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ▲
      </button>

      {/* Down Button */}
      <button
        onClick={findNext}
        disabled={!hasResults}
        title="Следующее совпадение (Enter)"
        style={{
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 4,
          color: hasResults ? '#E8E8E8' : '#3A3A3A',
          cursor: hasResults ? 'pointer' : 'not-allowed',
          padding: '2px 6px',
          fontSize: 14,
          lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (hasResults) {
            e.currentTarget.style.backgroundColor = '#3A3A3A';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ▼
      </button>

      {/* Close Button */}
      <button
        onClick={onClose}
        title="Закрыть (Escape)"
        style={{
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 4,
          color: '#8B7D6B',
          cursor: 'pointer',
          padding: '2px 6px',
          fontSize: 14,
          lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#8B0000';
          e.currentTarget.style.color = '#E8E8E8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#8B7D6B';
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default FindBar;
