// ═══ BOOKMARKS PANEL ═══
// Sacred repository of saved Noosphere addresses.
// Organized by folders, searchable, deletable.

import React, { useState, useMemo } from 'react';
import { Star, X, Folder, Search, Globe } from 'lucide-react';
import { type Bookmark } from '../../hooks/useBookmarks';

// ── Types ───────────────────────────────────────────────────

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  folders: string[];
  onRemove: (id: string) => void;
  onNavigate: (url: string) => void;
}

// ── Component ──────────────────────────────────────────────

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  bookmarks,
  folders,
  onRemove,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // ── Filtered bookmarks ──────────────────────────────────

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bm) => {
      const matchesFolder =
        selectedFolder === 'all' || bm.folder === selectedFolder;
      const matchesSearch =
        !searchQuery.trim() ||
        bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bm.url.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [bookmarks, selectedFolder, searchQuery]);

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
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '8px',
            textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
          }}
        >
          <Star size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Sacred Bookmarks
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
            marginBottom: '8px',
          }}
        >
          <Search size={12} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter bookmarks..."
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

        {/* Folder filter */}
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            padding: '4px 8px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Folders</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>

      {/* ── Bookmarks List ────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {filteredBookmarks.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <Star size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>No bookmarks found.</div>
            <div style={{ marginTop: '4px', opacity: 0.6 }}>
              Save pages with the star button in the address bar.
            </div>
          </div>
        ) : (
          filteredBookmarks.map((bm) => (
            <BookmarkItem
              key={bm.id}
              bookmark={bm}
              onRemove={onRemove}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>

      {/* ── Footer: count ─────────────────────────────────── */}
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
        {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
        {selectedFolder !== 'all' ? ` in "${selectedFolder}"` : ''}
      </div>
    </div>
  );
};

// ── Bookmark Item ───────────────────────────────────────────

interface BookmarkItemProps {
  bookmark: Bookmark;
  onRemove: (id: string) => void;
  onNavigate: (url: string) => void;
}

const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  onRemove,
  onNavigate,
}) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    onNavigate(bookmark.url);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(bookmark.id);
  };

  return (
    <div
      onClick={handleClick}
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
        position: 'relative',
      }}
    >
      {/* Favicon */}
      <div style={{ flexShrink: 0, width: '16px', height: '16px' }}>
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
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
          {bookmark.title || bookmark.url}
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
          {bookmark.url}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '2px',
          }}
        >
          <Folder size={9} color="var(--cogitator-gold-dim)" />
          <span
            style={{
              color: 'var(--cogitator-gold-dim)',
              fontSize: '9px',
              textTransform: 'uppercase',
            }}
          >
            {bookmark.folder}
          </span>
        </div>
      </div>

      {/* Delete button */}
      {hovered && (
        <button
          onClick={handleRemove}
          title="Remove bookmark"
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: '1px solid var(--omnissiah-red-dim)',
            color: 'var(--omnissiah-red-dim)',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '10px',
            lineHeight: 1,
            transition: 'all 150ms ease',
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
          <X size={12} />
        </button>
      )}
    </div>
  );
};

export default BookmarksPanel;
