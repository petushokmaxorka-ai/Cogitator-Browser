// ═══ HISTORY PANEL ═══
// Chronicle of navigations through the Noosphere.
// Grouped by date, searchable, purgeable.

import React, { useState, useMemo } from 'react';
import { Clock, Search, Globe, Trash2 } from 'lucide-react';
import { type HistoryEntry } from '../../hooks/useHistory';

// ── Types ───────────────────────────────────────────────────

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClear: () => void;
  onNavigate: (url: string) => void;
}

// ── Date grouping helpers ───────────────────────────────────

interface GroupedEntries {
  label: string;
  entries: HistoryEntry[];
}

const groupByDate = (entries: HistoryEntry[]): GroupedEntries[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const groups: Record<string, HistoryEntry[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const entry of entries) {
    const diff = now - entry.timestamp;
    if (diff < oneDay) {
      groups.today.push(entry);
    } else if (diff < 2 * oneDay) {
      groups.yesterday.push(entry);
    } else if (diff < 7 * oneDay) {
      groups.week.push(entry);
    } else {
      groups.earlier.push(entry);
    }
  }

  const result: GroupedEntries[] = [];
  if (groups.today.length) {
    result.push({ label: 'TODAY', entries: groups.today });
  }
  if (groups.yesterday.length) {
    result.push({ label: 'YESTERDAY', entries: groups.yesterday });
  }
  if (groups.week.length) {
    result.push({ label: 'PAST WEEK', entries: groups.week });
  }
  if (groups.earlier.length) {
    result.push({ label: 'EARLIER', entries: groups.earlier });
  }

  return result;
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Component ──────────────────────────────────────────────

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onClear,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Filtered history ────────────────────────────────────

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const lower = searchQuery.toLowerCase().trim();
    return history.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lower) ||
        entry.url.toLowerCase().includes(lower)
    );
  }, [history, searchQuery]);

  const grouped = useMemo(
    () => groupByDate(filteredEntries),
    [filteredEntries]
  );

  // ── Handlers ────────────────────────────────────────────

  const handlePurge = () => {
    setShowConfirm(false);
    onClear();
  };

  // ── Render ────────────────────────────────────────────────

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
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
            }}
          >
            <Clock size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Navigation Chronicle
          </div>

          {/* Purge button */}
          {history.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              title="Purge all history"
              style={{
                background: 'transparent',
                border: '1px solid var(--omnissiah-red-dim)',
                color: 'var(--omnissiah-red-dim)',
                cursor: 'pointer',
                padding: '3px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red-dim)';
                e.currentTarget.style.color = 'var(--omnissiah-red-dim)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Trash2 size={10} />
              Purge
            </button>
          )}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            padding: '4px 8px',
          }}
        >
          <Search size={12} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chronicle..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
            }}
          />
        </div>
      </div>

      {/* ── Confirm purge dialog ──────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(255, 0, 0, 0.05)',
            borderBottom: '1px solid var(--omnissiah-red-dim)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: 'var(--font-size-xs)',
              marginBottom: '8px',
            }}
          >
            Purge all {history.length} chronicle entries? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePurge}
              style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--omnissiah-red)',
                cursor: 'pointer',
                padding: '3px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                boxShadow: 'var(--glow-red)',
              }}
            >
              Confirm Purge
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
                padding: '3px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── History List ──────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {filteredEntries.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <Clock size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>{searchQuery.trim() ? 'No matches found.' : 'No chronicle entries.'}</div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <div
                style={{
                  padding: '6px 12px',
                  background: 'var(--iron-dark)',
                  color: 'var(--cogitator-gold)',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  borderBottom: '1px solid var(--iron-gray)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {group.label}
              </div>
              {/* Entries */}
              {group.entries.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--iron-gray)',
          color: 'var(--text-muted)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}
      >
        {filteredEntries.length} entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
        {searchQuery.trim() ? ' (filtered)' : ''}
      </div>
    </div>
  );
};

// ── History Item ────────────────────────────────────────────

interface HistoryItemProps {
  entry: HistoryEntry;
  onNavigate: (url: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, onNavigate }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onNavigate(entry.url)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--iron-gray)',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        background: hovered ? 'rgba(255, 0, 0, 0.03)' : 'transparent',
        boxShadow: hovered ? 'inset 0 0 8px rgba(255, 0, 0, 0.05)' : 'none',
      }}
    >
      {/* Favicon */}
      <div style={{ flexShrink: 0, width: '16px', height: '16px' }}>
        {entry.favicon ? (
          <img
            src={entry.favicon}
            alt=""
            style={{ width: '16px', height: '16px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Globe size={14} color="var(--text-muted)" />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: 'var(--sacred-white)',
            fontSize: 'var(--font-size-xs)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entry.title || entry.url}
        </div>
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: '2px',
          }}
        >
          {entry.url}
        </div>
      </div>

      {/* Time */}
      <div
        style={{
          flexShrink: 0,
          color: hovered ? 'var(--noosphere-cyan)' : 'var(--text-muted)',
          fontSize: '10px',
          transition: 'color 150ms ease',
        }}
      >
        {formatTime(entry.timestamp)}
      </div>
    </div>
  );
};

export default HistoryPanel;
