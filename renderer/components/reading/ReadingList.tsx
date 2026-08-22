// ═══════════════════════════════════════════════════════════════════════════════
// READING LIST — "Read Later" Archivum
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Check,
  Archive,
  Trash2,
  ExternalLink,
  Tag,
  Clock,
  X,
  Download,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReadingItem {
  id: string;
  title: string;
  url: string;
  addedAt: number;
  read: boolean;
  archived: boolean;
  tags: string[];
  estimatedReadTime?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_reading_list';

// ── Storage Helpers ──────────────────────────────────────────────────────────

function loadItems(): ReadingItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveItems(items: ReadingItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `read_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function estimateReadTime(_url: string, title: string): number {
  // Stub: estimate based on title length (very rough heuristic)
  const avgWpm = 200;
  const wordCount = title.split(/\s+/).length * 50; // assume ~50x more content
  return Math.max(1, Math.round(wordCount / avgWpm));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ReadingList() {
  const [items, setItems] = useState<ReadingItem[]>(loadItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // ── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveItems(items);
  }, [items]);

  // ── CRUD Operations ────────────────────────────────────────────────────────

  const addItem = useCallback((title: string, url: string, tags: string[] = []) => {
    if (!title.trim() || !url.trim()) return;
    const item: ReadingItem = {
      id: generateId(),
      title: title.trim(),
      url: url.trim(),
      addedAt: Date.now(),
      read: false,
      archived: false,
      tags,
      estimatedReadTime: estimateReadTime(url, title),
    };
    setItems((prev) => [item, ...prev]);
  }, []);

  const addCurrentPage = useCallback(async () => {
    try {
      // Try to get current page info via electron API
      const pageInfo = await window.electronAPI?.tabs?.getPageInfo?.();
      if (pageInfo) {
        addItem(pageInfo.title || 'Untitled', pageInfo.url, []);
      }
    } catch {
      // Fallback
      addItem('Current Page', 'https://example.com', []);
    }
  }, [addItem]);

  const toggleRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item
      )
    );
  }, []);

  const toggleArchive = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, archived: !item.archived } : item
      )
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddManual = useCallback(() => {
    const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean);
    addItem(newTitle, newUrl, tags);
    setNewTitle('');
    setNewUrl('');
    setNewTags('');
    setShowAddForm(false);
  }, [newTitle, newUrl, newTags, addItem]);

  const exportToBookmarks = useCallback(() => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogitator_reading_list_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    // Exclude archived by default
    result = result.filter((item) => !item.archived);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filterTag) {
      result = result.filter((item) => item.tags.includes(filterTag));
    }

    return result;
  }, [items, searchQuery, filterTag]);

  const archivedCount = items.filter((i) => i.archived).length;
  const readCount = items.filter((i) => i.read && !i.archived).length;
  const unreadCount = filteredItems.filter((i) => !i.read).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '10px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="mech-header">
        <BookOpen size={14} style={{ color: 'var(--cogitator-gold)' }} />
        <span>Read Later Archivum</span>
      </div>

      {/* ═══ Stats ═══ */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '6px 8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--noosphere-cyan)', fontWeight: 'bold' }}>{unreadCount}</div>
          <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '9px' }}>Unread</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '6px 8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--cogitator-gold)', fontWeight: 'bold' }}>{readCount}</div>
          <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '9px' }}>Read</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '6px 8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--parchment-dim)', fontWeight: 'bold' }}>{archivedCount}</div>
          <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '9px' }}>Archived</div>
        </div>
      </div>

      {/* ═══ Search + Actions ═══ */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            style={{
              width: '100%',
              padding: '6px 8px 6px 26px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={addCurrentPage}
          title="Add current page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--noosphere-cyan)',
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={12} />
        </button>
        <button
          onClick={() => setShowAddForm((p) => !p)}
          title="Add manually"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--cogitator-gold)',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} />
        </button>
        <button
          onClick={exportToBookmarks}
          title="Export"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
          }}
        >
          <Download size={12} />
        </button>
      </div>

      {/* ═══ Add Form ═══ */}
      {showAddForm && (
        <div
          style={{
            padding: '10px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--cogitator-gold-dim)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cogitator-gold)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
              Add Article
            </span>
            <button onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-muted)' }}>
              <X size={12} />
            </button>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            style={{
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL"
            style={{
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            style={{
              padding: '6px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAddManual}
            disabled={!newTitle.trim() || !newUrl.trim()}
            style={{
              padding: '6px',
              background: 'rgba(200, 168, 75, 0.15)',
              border: '1px solid var(--cogitator-gold)',
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Add to Archivum
          </button>
        </div>
      )}

      {/* ═══ Tag Filters ═══ */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              style={{
                padding: '2px 6px',
                background: 'rgba(255, 0, 0, 0.15)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--omnissiah-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                cursor: 'pointer',
              }}
            >
              <X size={9} style={{ display: 'inline', marginRight: '2px' }} />
              Clear
            </button>
          )}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? null : tag)}
              style={{
                padding: '2px 6px',
                background: filterTag === tag ? 'rgba(0, 191, 191, 0.15)' : 'var(--iron-dark)',
                border: `1px solid ${filterTag === tag ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
                color: filterTag === tag ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                cursor: 'pointer',
              }}
            >
              <Tag size={9} style={{ display: 'inline', marginRight: '2px' }} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ═══ List ═══ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {filteredItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textAlign: 'center',
            }}
          >
            <BookOpen size={32} style={{ opacity: 0.3 }} />
            <p>The Archivum is empty.</p>
            <p>Add articles to read later.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '10px',
                background: item.read ? 'rgba(30, 30, 30, 0.5)' : 'var(--iron-dark)',
                border: '1px solid',
                borderColor: item.read ? 'var(--iron-gray)' : 'var(--cogitator-gold-dim)',
                opacity: item.read ? 0.7 : 1,
                transition: 'all 150ms ease',
              }}
            >
              {/* Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.url}
                  style={{
                    flex: 1,
                    color: item.read ? 'var(--text-muted)' : 'var(--sacred-white)',
                    fontSize: 'var(--font-size-sm)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </a>
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleRead(item.id)}
                    title={item.read ? 'Mark unread' : 'Mark read'}
                    style={{
                      padding: '4px',
                      color: item.read ? 'var(--noosphere-cyan)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => toggleArchive(item.id)}
                    title="Archive"
                    style={{
                      padding: '4px',
                      color: 'var(--parchment-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <Archive size={12} />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                    style={{
                      padding: '4px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={9} />
                  {formatDate(item.addedAt)}
                </span>
                {item.estimatedReadTime && (
                  <span style={{ color: 'var(--cogitator-gold-dim)' }}>
                    ~{item.estimatedReadTime} min read
                  </span>
                )}
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '1px 4px',
                      background: 'rgba(0, 191, 191, 0.1)',
                      border: '1px solid var(--noosphere-cyan-dim)',
                      color: 'var(--noosphere-cyan)',
                      fontSize: '8px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* URL */}
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '9px',
                  color: 'var(--steel-gray)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.url}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
