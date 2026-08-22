// ═══ OMNISIAH FEED ═══
// RSS/Atom Reader with AI Summarization — Dark Mechanicus Interface
// The sacred data-feeds of the Noosphere, parsed by the Machine Spirit.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Rss,
  Plus,
  RefreshCw,
  Star,
  ExternalLink,
  Sparkles,
  Trash2,
  Check,
  Circle,
  Hash,
  Newspaper,
  Cpu,
  FlaskConical,
  Palette,
  BookOpen,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface RSSFeed {
  id: string;
  title: string;
  url: string;
  category: string;
  lastUpdate: number;
}

interface RSSArticle {
  id: string;
  feedId: string;
  title: string;
  link: string;
  description: string;
  pubDate: number;
  read: boolean;
  favorite: boolean;
}

type CategoryKey = 'all' | 'tech' | 'news' | 'science' | 'culture' | 'blogs';

interface AISummary {
  articleId: string;
  summary: string;
  loading: boolean;
}

// ═══════════════════════════════════════════════════════════
// Default Feeds
// ═══════════════════════════════════════════════════════════

const DEFAULT_FEEDS: Omit<RSSFeed, 'id' | 'lastUpdate'>[] = [
  { title: 'HackerNews', url: 'https://news.ycombinator.com/rss', category: 'tech' },
  { title: 'Reddit r/programming', url: 'https://reddit.com/r/programming/.rss', category: 'tech' },
  { title: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'tech' },
  { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'news' },
  { title: 'Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'news' },
];

const CATEGORIES: { key: CategoryKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'ALL', icon: <Hash size={10} /> },
  { key: 'tech', label: 'TECH', icon: <Cpu size={10} /> },
  { key: 'news', label: 'NEWS', icon: <Newspaper size={10} /> },
  { key: 'science', label: 'SCIENCE', icon: <FlaskConical size={10} /> },
  { key: 'culture', label: 'CULTURE', icon: <Palette size={10} /> },
  { key: 'blogs', label: 'BLOGS', icon: <BookOpen size={10} /> },
];

const STORAGE_KEY = 'cogitator_rss';
const STORAGE_ARTICLES_KEY = 'cogitator_rss_articles';
const STORAGE_SUMMARIES_KEY = 'cogitator_rss_summaries';

// ═══════════════════════════════════════════════════════════
// RSS Parsing
// ═══════════════════════════════════════════════════════════

async function fetchRSS(url: string): Promise<Omit<RSSArticle, 'feedId'>[]> {
  const xml = await window.electronAPI?.rss?.fetch?.(url);
  if (!xml) throw new Error('Main-process fetch unavailable');

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('XML parse error');

  const items = doc.querySelectorAll('item, entry');

  return Array.from(items).map((item, index) => {
    const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
    const linkEl = item.querySelector('link');
    const link =
      linkEl?.getAttribute('href')?.trim() ||
      linkEl?.textContent?.trim() ||
      '';

    // Try multiple content fields
    let description = '';
    const contentEncoded = item.getElementsByTagName('content:encoded')[0];
    const summary = item.querySelector('summary');
    const content = item.querySelector('content');
    const desc = item.querySelector('description');

    if (contentEncoded?.textContent) {
      description = contentEncoded.textContent.slice(0, 800);
    } else if (summary?.textContent) {
      description = summary.textContent.slice(0, 800);
    } else if (content?.textContent) {
      description = content.textContent.slice(0, 800);
    } else if (desc?.textContent) {
      description = desc.textContent.slice(0, 800);
    }

    // Strip HTML tags for preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    description = tempDiv.textContent || tempDiv.innerText || '';

    const dateText =
      item.querySelector('pubDate')?.textContent ||
      item.querySelector('published')?.textContent ||
      item.querySelector('updated')?.textContent ||
      '';

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      link,
      description: description.slice(0, 500),
      pubDate: dateText ? new Date(dateText).getTime() || Date.now() : Date.now(),
      read: false,
      favorite: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// LocalStorage Helpers
// ═══════════════════════════════════════════════════════════

function loadFeeds(): RSSFeed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Initialize with defaults
  const feeds = DEFAULT_FEEDS.map((f) => ({
    ...f,
    id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lastUpdate: 0,
  }));
  saveFeeds(feeds);
  return feeds;
}

function saveFeeds(feeds: RSSFeed[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
}

function loadArticles(): RSSArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_ARTICLES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveArticles(articles: RSSArticle[]) {
  // Keep only last 500 articles to avoid storage bloat
  const trimmed = articles
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 500);
  localStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(trimmed));
}

function loadSummaries(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_SUMMARIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveSummaries(summaries: Record<string, string>) {
  localStorage.setItem(STORAGE_SUMMARIES_KEY, JSON.stringify(summaries));
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function RSSReader() {
  // ── State ────────────────────────────────────────────────
  const [feeds, setFeeds] = useState<RSSFeed[]>(loadFeeds);
  const [articles, setArticles] = useState<RSSArticle[]>(loadArticles);
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>(loadSummaries);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const articleListRef = useRef<HTMLDivElement>(null);

  // ── Derived State ────────────────────────────────────────
  const selectedArticle = articles.find((a) => a.id === selectedArticleId) || null;

  const filteredArticles = articles
    .filter((a) => {
      // Feed filter
      if (selectedFeedId !== 'all' && a.feedId !== selectedFeedId) return false;
      // Category filter
      if (activeCategory !== 'all') {
        const feed = feeds.find((f) => f.id === a.feedId);
        if (feed?.category !== activeCategory) return false;
      }
      // Favorites filter
      if (showFavoritesOnly && !a.favorite) return false;
      return true;
    })
    .sort((a, b) => b.pubDate - a.pubDate);

  const unreadCount = (feedId?: string) => {
    return articles.filter((a) => {
      if (a.read) return false;
      if (feedId && a.feedId !== feedId) return false;
      if (!feedId && selectedFeedId !== 'all' && a.feedId !== selectedFeedId) return false;
      return true;
    }).length;
  };

  // ── Persistence ──────────────────────────────────────────
  useEffect(() => { saveFeeds(feeds); }, [feeds]);
  useEffect(() => { saveArticles(articles); }, [articles]);
  useEffect(() => { saveSummaries(aiSummaries); }, [aiSummaries]);

  // Focus add input when shown
  useEffect(() => {
    if (showAddInput) addInputRef.current?.focus();
  }, [showAddInput]);

  // ── Handlers ─────────────────────────────────────────────

  const handleRefreshFeed = useCallback(async (feed: RSSFeed) => {
    setRefreshing((prev) => new Set(prev).add(feed.id));
    setError(null);
    try {
      const fetched = await fetchRSS(feed.url);
      const newArticles = fetched.map((item) => ({
        ...item,
        feedId: feed.id,
      }));

      setArticles((prev) => {
        // Merge: keep existing read/favorite status for known articles
        const existingMap = new Map(prev.map((a) => [`${a.feedId}-${a.link}`, a]));
        const merged = newArticles.map((a) => {
          const key = `${a.feedId}-${a.link}`;
          const existing = existingMap.get(key);
          if (existing) {
            return {
              ...a,
              id: existing.id, // preserve ID
              read: existing.read,
              favorite: existing.favorite,
            };
          }
          return a;
        });
        // Add old articles that weren't in the new fetch
        const newIds = new Set(merged.map((m) => m.id));
        const keptOld = prev.filter((a) => !newIds.has(a.id) && a.feedId === feed.id);
        const otherFeeds = prev.filter((a) => a.feedId !== feed.id);
        return [...otherFeeds, ...keptOld, ...merged];
      });

      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feed.id ? { ...f, lastUpdate: Date.now() } : f
        )
      );
    } catch (err) {
      setError(`Failed to refresh "${feed.title}": ${(err as Error).message}`);
    } finally {
      setRefreshing((prev) => {
        const next = new Set(prev);
        next.delete(feed.id);
        return next;
      });
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    setError(null);
    for (const feed of feeds) {
      await handleRefreshFeed(feed);
    }
  }, [feeds, handleRefreshFeed]);

  const handleAddFeed = useCallback(() => {
    const url = newFeedUrl.trim();
    if (!url) return;
    // Validate URL
    try { new URL(url); } catch {
      setError('Invalid URL');
      return;
    }
    // Check duplicate
    if (feeds.some((f) => f.url === url)) {
      setError('Feed already subscribed');
      return;
    }
    const newFeed: RSSFeed = {
      id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: new URL(url).hostname,
      url,
      category: 'blogs',
      lastUpdate: 0,
    };
    setFeeds((prev) => [...prev, newFeed]);
    setNewFeedUrl('');
    setShowAddInput(false);
    // Auto-refresh
    setTimeout(() => handleRefreshFeed(newFeed), 100);
  }, [newFeedUrl, feeds, handleRefreshFeed]);

  const handleDeleteFeed = useCallback((feedId: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    setArticles((prev) => prev.filter((a) => a.feedId !== feedId));
    if (selectedFeedId === feedId) setSelectedFeedId('all');
  }, [selectedFeedId]);

  const handleMarkRead = useCallback((articleId: string, read: boolean) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, read } : a))
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setArticles((prev) =>
      prev.map((a) => {
        if (selectedFeedId !== 'all' && a.feedId !== selectedFeedId) return a;
        if (activeCategory !== 'all') {
          const feed = feeds.find((f) => f.id === a.feedId);
          if (feed?.category !== activeCategory) return a;
        }
        return { ...a, read: true };
      })
    );
  }, [selectedFeedId, activeCategory, feeds]);

  const handleToggleFavorite = useCallback((articleId: string) => {
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, favorite: !a.favorite } : a
      )
    );
  }, []);

  const handleSelectArticle = useCallback((articleId: string) => {
    setSelectedArticleId(articleId);
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, read: true } : a))
    );
  }, []);

  // ── AI Summarization ─────────────────────────────────────

  const handleSummarize = useCallback(async (article: RSSArticle) => {
    setAiLoading(article.id);
    setError(null);
    try {
      const ollamaConfig = await window.electronAPI?.ollama?.getConfig?.();
      if (!ollamaConfig?.model) {
        setError('Ollama not configured. Set up AI in Settings.');
        setAiLoading(null);
        return;
      }

      const promptText = `Summarize this article concisely:\n\nTitle: ${article.title}\n\nContent: ${article.description.slice(0, 2000)}`;

      const messages = [
        { role: 'system' as const, content: 'You are a helpful summarizer. Provide a brief, clear summary of the given article in 2-4 sentences.' },
        { role: 'user' as const, content: promptText },
      ];

      const response = await window.electronAPI?.ollama?.chat?.(messages, ollamaConfig.model);

      let summary = '';
      if (typeof response === 'string') {
        summary = response;
      } else if (response?.content) {
        summary = response.content;
      } else {
        summary = 'No summary generated.';
      }

      setAiSummaries((prev) => ({ ...prev, [article.id]: summary }));
    } catch (err) {
      setError(`AI summary failed: ${(err as Error).message}`);
    } finally {
      setAiLoading(null);
    }
  }, []);

  // ── Open in new tab ──────────────────────────────────────

  const handleReadOriginal = useCallback((article: RSSArticle) => {
    if (article.link) {
      window.electronAPI?.tabs?.create?.(article.link);
    }
  }, []);

  // ── Auto-refresh on mount ────────────────────────────────

  useEffect(() => {
    // Refresh feeds that haven't been updated in 10 minutes
    const TEN_MIN = 10 * 60 * 1000;
    feeds.forEach((feed) => {
      if (Date.now() - feed.lastUpdate > TEN_MIN) {
        handleRefreshFeed(feed);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Render Helpers
  // ═══════════════════════════════════════════════════════════

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
          padding: '8px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Rss size={14} style={{ color: 'var(--omnissiah-red)' }} />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Omnissiah Feed
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
            ({articles.filter((a) => !a.read).length} unread)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Refresh All */}
          <button
            onClick={handleRefreshAll}
            title="Refresh all feeds"
            style={mechButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
          >
            <RefreshCw size={11} />
          </button>
          {/* Add Feed */}
          <button
            onClick={() => setShowAddInput((p) => !p)}
            title="Add feed"
            style={mechButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* ═══ Add Feed Input ═══ */}
      {showAddInput && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '6px 10px',
            borderBottom: '1px solid var(--iron-gray)',
            flexShrink: 0,
          }}
        >
          <input
            ref={addInputRef}
            type="text"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddFeed(); if (e.key === 'Escape') { setShowAddInput(false); setNewFeedUrl(''); } }}
            placeholder="Enter RSS feed URL..."
            style={{
              flex: 1,
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 8px',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
          />
          <button
            onClick={handleAddFeed}
            style={{
              ...mechButtonStyle,
              padding: '4px 12px',
              fontSize: '9px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
          >
            Subscribe
          </button>
        </div>
      )}

      {/* ═══ Error Banner ═══ */}
      {error && (
        <div
          style={{
            padding: '6px 10px',
            background: 'rgba(255, 0, 0, 0.05)',
            borderBottom: '1px solid var(--omnissiah-red)',
            color: 'var(--omnissiah-red)',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--omnissiah-red)', cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ═══ Main Content — 3 Columns ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ Column 1: Feeds List ═══ */}
        <div
          style={{
            width: '180px',
            minWidth: '180px',
            background: 'var(--void-black)',
            borderRight: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Category Filter */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2px',
              padding: '6px',
              borderBottom: '1px solid var(--iron-gray)',
              flexShrink: 0,
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                title={cat.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 6px',
                  background: activeCategory === cat.key ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                  border: activeCategory === cat.key ? '1px solid var(--omnissiah-red)' : '1px solid var(--iron-gray)',
                  color: activeCategory === cat.key ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textTransform: 'uppercase' as const,
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Feed List */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {/* ALL Feeds item */}
            <div
              onClick={() => setSelectedFeedId('all')}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--iron-gray)',
                background: selectedFeedId === 'all' ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: selectedFeedId === 'all' ? 'var(--omnissiah-red)' : 'var(--parchment)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Hash size={10} />
                All Feeds
              </span>
              {unreadCount() > 0 && (
                <span style={badgeStyle}>{unreadCount()}</span>
              )}
            </div>

            {/* Favorites filter */}
            <div
              onClick={() => setShowFavoritesOnly((p) => !p)}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--iron-gray)',
                background: showFavoritesOnly ? 'rgba(200, 168, 75, 0.05)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: showFavoritesOnly ? 'var(--cogitator-gold)' : 'var(--parchment)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={10} />
                Favorites
              </span>
              <span style={{ ...badgeStyle, background: 'var(--cogitator-gold)', color: 'var(--void-black)' }}>
                {articles.filter((a) => a.favorite).length}
              </span>
            </div>

            {/* Individual feeds */}
            {feeds
              .filter((f) => activeCategory === 'all' || f.category === activeCategory)
              .map((feed) => {
                const isActive = selectedFeedId === feed.id;
                const isRefreshing = refreshing.has(feed.id);
                const feedUnread = articles.filter((a) => a.feedId === feed.id && !a.read).length;

                return (
                  <div
                    key={feed.id}
                    onClick={() => setSelectedFeedId(feed.id)}
                    style={{
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--iron-gray)',
                      background: isActive ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 100ms ease',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                      <span style={{ color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment)', fontSize: '10px' }}>
                        {isRefreshing ? <Loader2 size={10} className="loading-cog" /> : <ChevronRight size={10} />}
                      </span>
                      <span
                        style={{
                          color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment)',
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={feed.title}
                      >
                        {feed.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {feedUnread > 0 && <span style={badgeStyle}>{feedUnread}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRefreshFeed(feed); }}
                        title="Refresh"
                        style={{ background: 'none', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                      >
                        <RefreshCw size={9} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFeed(feed.id); }}
                        title="Unsubscribe"
                        style={{ background: 'none', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ═══ Column 2: Articles List ═══ */}
        <div
          ref={articleListRef}
          style={{
            width: '220px',
            minWidth: '220px',
            background: 'var(--iron-dark)',
            borderRight: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Articles header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderBottom: '1px solid var(--iron-gray)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              Articles ({filteredArticles.length})
            </span>
            <button
              onClick={handleMarkAllRead}
              title="Mark all read"
              style={{ background: 'none', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
            >
              <Check size={10} />
            </button>
          </div>

          {/* Articles */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredArticles.length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>
                No articles found.
                <br />
                Refresh feeds to load content.
              </div>
            ) : (
              filteredArticles.map((article) => {
                const isSelected = selectedArticleId === article.id;
                const feed = feeds.find((f) => f.id === article.feedId);

                return (
                  <div
                    key={article.id}
                    onClick={() => handleSelectArticle(article.id)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--iron-gray)',
                      background: isSelected ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
                      transition: 'all 100ms ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      {!article.read && (
                        <Circle
                          size={6}
                          fill="var(--noosphere-cyan)"
                          color="var(--noosphere-cyan)"
                          style={{ marginTop: '4px', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '10px',
                            lineHeight: 1.4,
                            color: article.read ? 'var(--parchment-dim)' : 'var(--sacred-white)',
                            fontWeight: article.read ? 'normal' : 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {article.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                            {feed?.title || 'Unknown'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                            {formatDate(article.pubDate)}
                          </span>
                          {article.favorite && (
                            <Star size={9} fill="var(--cogitator-gold)" color="var(--cogitator-gold)" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ Column 3: Content Reader ═══ */}
        <div
          style={{
            flex: 1,
            background: 'var(--void-black)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedArticle ? (
            <>
              {/* Article header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--iron-gray)',
                  flexShrink: 0,
                }}
              >
                <h2
                  style={{
                    color: 'var(--sacred-white)',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    lineHeight: 1.4,
                    margin: 0,
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedArticle.title}
                </h2>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--parchment-dim)', fontSize: '10px' }}>
                    {feeds.find((f) => f.id === selectedArticle.feedId)?.title || 'Unknown'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    {new Date(selectedArticle.pubDate).toLocaleString()}
                  </span>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                    <button
                      onClick={() => handleToggleFavorite(selectedArticle.id)}
                      title={selectedArticle.favorite ? 'Unfavorite' : 'Favorite'}
                      style={{
                        ...mechButtonStyle,
                        color: selectedArticle.favorite ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
                    >
                      <Star size={11} fill={selectedArticle.favorite ? 'var(--cogitator-gold)' : 'none'} />
                    </button>

                    <button
                      onClick={() => handleReadOriginal(selectedArticle)}
                      title="Read original"
                      style={mechButtonStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                    >
                      <ExternalLink size={11} />
                      <span style={{ fontSize: '9px', textTransform: 'uppercase' as const }}>Read</span>
                    </button>

                    <button
                      onClick={() => handleSummarize(selectedArticle)}
                      disabled={aiLoading === selectedArticle.id}
                      title="Summarize with AI"
                      style={{
                        ...mechButtonStyle,
                        color: aiSummaries[selectedArticle.id] ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; e.currentTarget.style.color = 'var(--cogitator-gold)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = aiSummaries[selectedArticle.id] ? 'var(--cogitator-gold)' : 'var(--parchment-dim)'; }}
                    >
                      {aiLoading === selectedArticle.id ? (
                        <Loader2 size={11} className="loading-cog" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      <span style={{ fontSize: '9px', textTransform: 'uppercase' as const }}>
                        {aiLoading === selectedArticle.id ? 'Thinking...' : aiSummaries[selectedArticle.id] ? 'Re-Summarize' : 'Summarize'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Article content */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                }}
              >
                {/* AI Summary */}
                {aiSummaries[selectedArticle.id] && (
                  <div
                    style={{
                      borderLeft: '2px solid var(--cogitator-gold)',
                      paddingLeft: '12px',
                      marginBottom: '16px',
                      fontStyle: 'italic',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--cogitator-gold)',
                        fontSize: '9px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={10} />
                      Machine Spirit Summary
                    </div>
                    <div
                      style={{
                        color: 'var(--parchment)',
                        fontSize: '11px',
                        lineHeight: 1.6,
                      }}
                      className="terminal-message"
                    >
                      {aiSummaries[selectedArticle.id]}
                    </div>
                  </div>
                )}

                {/* Article text */}
                <div
                  style={{
                    color: 'var(--parchment)',
                    fontSize: '12px',
                    lineHeight: 1.7,
                    wordBreak: 'break-word',
                  }}
                  className="terminal-message"
                >
                  {selectedArticle.description || (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No preview available. Click "Read" to open the original article.
                    </span>
                  )}
                </div>

                {/* Link at bottom */}
                {selectedArticle.link && (
                  <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid var(--iron-gray)' }}>
                    <button
                      onClick={() => handleReadOriginal(selectedArticle)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--noosphere-cyan)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'underline',
                      }}
                    >
                      <ExternalLink size={10} />
                      {selectedArticle.link}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '12px',
              }}
            >
              <Rss size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                Select an article to read
              </span>
              <span style={{ fontSize: '9px', color: 'var(--steel-gray)' }}>
                The Noosphere awaits your command
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const mechButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: 'var(--iron-dark)',
  border: '1px solid var(--iron-gray)',
  color: 'var(--parchment-dim)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  background: 'var(--noosphere-cyan)',
  color: 'var(--void-black)',
  fontSize: '9px',
  fontWeight: 'bold',
  padding: '1px 5px',
  borderRadius: '8px',
  minWidth: '16px',
  textAlign: 'center',
  flexShrink: 0,
};
