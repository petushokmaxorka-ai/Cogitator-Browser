// ═══ SEARCH PANEL ═══
// Noosphere search interface with IMAGE SEARCH tab.
// Drag & drop, paste, or enter URL to search by image.

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  Loader2,
  ExternalLink,
  Image,
  Upload,
  Link2,
  Trash2,
  MousePointerClick,
  FileCode2,
} from 'lucide-react';
import { isEditableVaultPath, requestOpenInEditor } from '../../lib/editor-bridge';

// ── Constants ───────────────────────────────────────────────────

const NOOSPHERE_URL = 'cogitator://noosphere';

// Reverse image search endpoints
const REVERSE_SEARCH = {
  google: (url: string) =>
    `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(url)}`,
  yandex: (url: string) =>
    `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`,
  tineye: (url: string) =>
    `https://tineye.com/search?url=${encodeURIComponent(url)}`,
};

// ── Image Upload → Data URL ─────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Tab Type ────────────────────────────────────────────────────

type SearchTab = 'search' | 'image';

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function SearchPanel() {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('search');
  const [mensOnline, setMensOnline] = useState<boolean | null>(null);
  const [vaultHits, setVaultHits] = useState<
    Array<{ title?: string; file_path?: string; snippet?: string; score?: number }>
  >([]);
  const [vaultSearching, setVaultSearching] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultMethod, setVaultMethod] = useState<string | null>(null);
  const [vaultHint, setVaultHint] = useState<string | null>(null);

  useEffect(() => {
    void window.electronAPI?.mens?.checkStatus?.().then(setMensOnline).catch(() => setMensOnline(false));
  }, []);

  // ── Image Search State ──────────────────────────────────
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ───────────────────────────────────────────────────

  /** Open a URL in a new browser tab via Electron API */
  const openInNewTab = useCallback((url: string) => {
    try {
      // Try Electron API first (creates a new webview tab)
      window.electronAPI?.tabs?.create?.(url);
    } catch {
      // Fallback: open in system browser
      window.open(url, '_blank');
    }
  }, []);

  // ── Tab Handlers ──────────────────────────────────────────

  const switchTab = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
    setUploadError(null);
  }, []);

  // ── Search Tab Handlers ─────────────────────────────────

  const fetchVaultMatches = useCallback(async (q: string) => {
    if (!q.trim() || !window.electronAPI?.mens?.semanticSearch) return;
    setVaultSearching(true);
    setVaultError(null);
    setVaultHint(null);
    setVaultMethod(null);
    try {
      const res = await window.electronAPI.mens.semanticSearch(q.trim(), 8);
      setMensOnline(res.online);
      setVaultHits(res.results ?? []);
      setVaultMethod(res.method ?? null);
      setVaultHint(res.hint ?? null);
      if (!res.online) {
        setVaultError('Mens offline — semantic search unavailable');
      } else if (res.hint && (res.results?.length ?? 0) === 0) {
        setVaultError(res.hint);
      } else if (res.fallback && (res.results?.length ?? 0) > 0) {
        setVaultHint(res.hint ?? 'Hybrid unavailable — semantic fallback');
      }
    } catch (err) {
      setVaultError(err instanceof Error ? err.message : 'Vault search failed');
      setVaultHits([]);
    } finally {
      setVaultSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setVaultHits([]);
      setVaultError(null);
      setVaultHint(null);
      setVaultMethod(null);
      return;
    }
    const timer = setTimeout(() => {
      void fetchVaultMatches(trimmed);
    }, 450);
    return () => clearTimeout(timer);
  }, [query, fetchVaultMatches]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setIsSearching(true);
    void fetchVaultMatches(query);

    // Open SearXNG search in a new browser tab
    const searchUrl = `${NOOSPHERE_URL}?q=${encodeURIComponent(query.trim())}`;
    openInNewTab(searchUrl);

    // Reset after brief delay (visual feedback)
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  }, [query, openInNewTab, fetchVaultMatches]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleOpenSearXNG = () => {
    openInNewTab(NOOSPHERE_URL);
  };

  // ── Image Search Handlers ───────────────────────────────

  const handleImageUrlSearch = useCallback(() => {
    if (!imagePreview) return;
    setUploadError(null);
  }, [imagePreview]);

  const handleSearchByImage = useCallback(
    (engine: 'google' | 'yandex' | 'tineye') => {
      if (!imagePreview) return;

      let searchUrl: string;

      if (imagePreview.startsWith('http')) {
        // Direct URL
        searchUrl = REVERSE_SEARCH[engine](imagePreview);
      } else if (imagePreview.startsWith('data:')) {
        // For uploaded images, use Google Lens data URI approach
        // Note: Google doesn't accept data URIs directly, so we use
        // the Google Lens upload page as a fallback
        setUploadError(
          'For local images, use the "Upload to Google Lens" option or save to an image host first.'
        );
        // Open Google Lens for manual upload
        openInNewTab('https://lens.google.com');
        return;
      } else {
        setUploadError('Invalid image source');
        return;
      }

      openInNewTab(searchUrl);
    },
    [imagePreview, openInNewTab]
  );

  const handleImageFromUrl = useCallback(() => {
    const url = imageUrl.trim();
    if (!url) return;
    setImagePreview(url);
    setUploadError(null);
  }, [imageUrl]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);
      try {
        if (!file.type.startsWith('image/')) {
          setUploadError('File must be an image (PNG, JPG, GIF, etc.)');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('Image too large (max 10MB)');
          return;
        }
        const dataUrl = await readFileAsDataURL(file);
        setImagePreview(dataUrl);
      } catch (err) {
        setUploadError('Failed to read image file');
        console.error('[SearchPanel] Image read error:', err);
      }
    },
    []
  );

  // ── Drag & Drop ─────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // ── Clipboard Paste ─────────────────────────────────────

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (activeTab !== 'image') return;

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFileSelect(file);
          return;
        }
      }
    },
    [activeTab, handleFileSelect]
  );

  // Global paste listener for image tab
  useEffect(() => {
    if (activeTab !== 'image') return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) handleFileSelect(file);
          return;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeTab, handleFileSelect]);

  const handleClearImage = useCallback(() => {
    setImagePreview(null);
    setImageUrl('');
    setUploadError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Render — Tab Headers
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
      onPaste={handlePaste}
    >
      {/* Tab Headers */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
        }}
      >
        <button
          onClick={() => switchTab('search')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'search' ? 'var(--iron-dark)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'search' ? '2px solid var(--cogitator-gold)' : '2px solid transparent',
            color: activeTab === 'search' ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Search size={12} />
          Search
        </button>
        <button
          onClick={() => switchTab('image')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'image' ? 'var(--iron-dark)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'image' ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
            color: activeTab === 'image' ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Image size={12} />
          Image
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'search' ? (
          <SearchTabContent
            query={query}
            setQuery={setQuery}
            isSearching={isSearching}
            handleSearch={handleSearch}
            handleKeyDown={handleKeyDown}
            handleOpenSearXNG={handleOpenSearXNG}
            mensOnline={mensOnline}
            vaultHits={vaultHits}
            vaultSearching={vaultSearching}
            vaultError={vaultError}
            vaultMethod={vaultMethod}
            vaultHint={vaultHint}
            onVaultOnlySearch={() => void fetchVaultMatches(query)}
          />
        ) : (
          <ImageSearchTabContent
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            imagePreview={imagePreview}
            isDragging={isDragging}
            uploadError={uploadError}
            dropRef={dropRef}
            imageInputRef={imageInputRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            onImageUrlSubmit={handleImageFromUrl}
            onSearchByImage={handleSearchByImage}
            onClearImage={handleClearImage}
            onUrlKeyDown={(e) => {
              if (e.key === 'Enter') handleImageFromUrl();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Search Tab Sub-component
// ═══════════════════════════════════════════════════════════

interface SearchTabContentProps {
  query: string;
  setQuery: (q: string) => void;
  isSearching: boolean;
  handleSearch: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleOpenSearXNG: () => void;
  mensOnline: boolean | null;
  vaultHits: Array<{ title?: string; file_path?: string; snippet?: string; score?: number }>;
  vaultSearching: boolean;
  vaultError: string | null;
  vaultMethod: string | null;
  vaultHint: string | null;
  onVaultOnlySearch: () => void;
}

function SearchTabContent({
  query,
  setQuery,
  isSearching,
  handleSearch,
  handleKeyDown,
  handleOpenSearXNG,
  mensOnline,
  vaultHits,
  vaultSearching,
  vaultError,
  vaultMethod,
  vaultHint,
  onVaultOnlySearch,
}: SearchTabContentProps) {
  return (
    <>
      {/* Header */}
      <div className="mech-header">
        <Globe size={14} style={{ color: 'var(--noosphere-cyan)' }} />
        <span>Query the Noosphere</span>
      </div>

      {/* SearXNG Status Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--parchment-dim)',
          cursor: 'pointer',
        }}
        onClick={handleOpenSearXNG}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
          e.currentTarget.style.boxShadow = 'var(--glow-red)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--iron-gray)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="Open SearXNG homepage"
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--omnissiah-red)',
            boxShadow: '0 0 6px rgba(255, 0, 0, 0.5)',
          }}
        />
        <span style={{ flex: 1 }}>
          <span style={{ color: 'var(--sacred-white)' }}>Noosphere Engine</span>{' '}
          <span style={{ color: 'var(--parchment-dim)' }}>@</span>{' '}
          <span style={{ color: 'var(--noosphere-cyan)' }}>{NOOSPHERE_URL}</span>
        </span>
        <ExternalLink size={12} style={{ color: 'var(--parchment-dim)' }} />
      </div>

      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--parchment-dim)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Query the Noosphere..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="dm-btn-seek"
          style={{
            opacity: isSearching ? 0.6 : 1,
            cursor: isSearching ? 'not-allowed' : 'pointer',
          }}
        >
          {isSearching ? (
            <Loader2 size={14} className="loading-cog" />
          ) : (
            <Search size={14} />
          )}
          <span>Seek</span>
        </button>

        <button
          onClick={onVaultOnlySearch}
          disabled={vaultSearching || !query.trim()}
          style={{
            padding: '8px 10px',
            background: 'rgba(0, 191, 191, 0.08)',
            border: '1px solid var(--noosphere-cyan)',
            color: 'var(--noosphere-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            cursor: vaultSearching || !query.trim() ? 'not-allowed' : 'pointer',
            opacity: !query.trim() ? 0.4 : 1,
          }}
          title="Semantic search in bibliotheca (Mens :8000)"
        >
          {vaultSearching ? <Loader2 size={14} className="loading-cog" /> : 'Vault'}
        </button>
      </div>

      {/* Bibliotheca semantic matches */}
      <div
        style={{
          padding: '10px',
          border: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            color: 'var(--cogitator-gold)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: mensOnline ? 'var(--noosphere-cyan)' : 'var(--steel-gray)',
            }}
          />
          Bibliotheca Vault
          {vaultMethod && (
            <span style={{ color: 'var(--parchment-dim)', textTransform: 'none' }}>
              ({vaultMethod}{vaultHint ? ' · fallback' : ''})
            </span>
          )}
          {mensOnline === false && (
            <span style={{ color: 'var(--parchment-dim)', textTransform: 'none' }}>(Mens offline)</span>
          )}
        </div>
        {vaultHint && !vaultError && (
          <div style={{ color: 'var(--cogitator-gold)', marginBottom: '6px', fontSize: '10px' }}>{vaultHint}</div>
        )}
        {vaultError && (
          <div style={{ color: 'var(--omnissiah-red)', marginBottom: '6px' }}>{vaultError}</div>
        )}
        {vaultSearching && vaultHits.length === 0 && (
          <div style={{ color: 'var(--parchment-dim)' }}>Searching embeddings…</div>
        )}
        {!vaultSearching && vaultHits.length === 0 && !vaultError && (
          <div style={{ color: 'var(--parchment-dim)' }}>
            Seek or Vault — semantic matches from bibliotheca appear here.
          </div>
        )}
        {vaultHits.map((hit, i) => (
          <div
            key={`${hit.file_path ?? hit.title ?? i}`}
            style={{
              padding: '6px 0',
              borderTop: i > 0 ? '1px solid var(--iron-gray)' : undefined,
              cursor: hit.file_path ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (!hit.file_path) return;
              if (isEditableVaultPath(hit.file_path)) {
                requestOpenInEditor(hit.file_path);
              } else {
                void window.electronAPI?.fs?.reveal?.(hit.file_path);
              }
            }}
            title={
              hit.file_path
                ? isEditableVaultPath(hit.file_path)
                  ? `Open in Editor: ${hit.file_path}`
                  : hit.file_path
                : undefined
            }
          >
            <div style={{ color: 'var(--sacred-white)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {hit.file_path && isEditableVaultPath(hit.file_path) && (
                <FileCode2 size={12} style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hit.title ?? hit.file_path?.split('/').pop() ?? 'Note'}
              </span>
              {hit.score !== undefined && (
                <span style={{ color: 'var(--parchment-dim)', flexShrink: 0 }}>
                  {(hit.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
            {hit.snippet && (
              <div
                style={{
                  color: 'var(--parchment-dim)',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hit.snippet}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mech-divider" style={{ fontSize: 'var(--font-size-xs)' }}>
        <span style={{ color: 'var(--steel-gray)' }}>&#x25C8;</span>
      </div>

      {/* Info Panel */}
      <div
        style={{
          padding: '12px',
          border: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            marginBottom: '8px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
          }}
        >
          ═══ Noosphere Interface ═══
        </div>
        <p style={{ marginBottom: '8px' }}>
          <span style={{ color: 'var(--omnissiah-red)' }}>Seek</span> opens SearXNG;{' '}
          <span style={{ color: 'var(--noosphere-cyan)' }}>Vault</span> queries Mens hybrid
          search (semantic + keyword via RRF).
        </p>
        <p>
          SearXNG meta-search:{' '}
          <span style={{ color: 'var(--omnissiah-red)' }}>{NOOSPHERE_URL}</span>
        </p>
      </div>

      {/* Search Prefixes */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          border: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '8px',
          }}
        >
          ═══ Search Prefixes ═══
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--parchment-dim)',
          }}
        >
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!g</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> Google
          </div>
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!d</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> DuckDuckGo
          </div>
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!b</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> Brave
          </div>
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!w</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> Wikipedia
          </div>
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!gh</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> GitHub
          </div>
          <div>
            <span style={{ color: 'var(--noosphere-cyan)' }}>!so</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>&#x2014;</span> StackOverflow
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Image Search Tab Sub-component
// ═══════════════════════════════════════════════════════════

interface ImageSearchTabContentProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  imagePreview: string | null;
  isDragging: boolean;
  uploadError: string | null;
  dropRef: React.RefObject<HTMLDivElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  onImageUrlSubmit: () => void;
  onSearchByImage: (engine: 'google' | 'yandex' | 'tineye') => void;
  onClearImage: () => void;
  onUrlKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function ImageSearchTabContent({
  imageUrl,
  setImageUrl,
  imagePreview,
  isDragging,
  uploadError,
  dropRef,
  imageInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onImageUrlSubmit,
  onSearchByImage,
  onClearImage,
  onUrlKeyDown,
}: ImageSearchTabContentProps) {
  return (
    <>
      {/* Header */}
      <div className="mech-header">
        <Image size={14} style={{ color: 'var(--omnissiah-red)' }} />
        <span>Search by Image</span>
      </div>

      {/* Description */}
      <div
        style={{
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: 'var(--cogitator-gold)' }}>
          ═══ Visual Inquiry ═══
        </span>
        <p style={{ marginTop: '6px' }}>
          Drag &amp; drop an image, paste from clipboard, or enter an image URL
          to perform a reverse visual search through the datasphere.
        </p>
      </div>

      {/* Image URL Input */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Link2
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--parchment-dim)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={onUrlKeyDown}
            placeholder="Paste image URL..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <button
          onClick={onImageUrlSubmit}
          disabled={!imageUrl.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            background: imageUrl.trim()
              ? 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))'
              : 'var(--iron-gray)',
            border: '1px solid var(--omnissiah-red)',
            color: imageUrl.trim() ? 'var(--sacred-white)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            cursor: imageUrl.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (imageUrl.trim()) {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }
          }}
          onMouseLeave={(e) => {
            if (imageUrl.trim()) {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <ExternalLink size={12} />
          Load
        </button>
      </div>

      {/* Drag & Drop Zone */}
      {!imagePreview && (
        <div
          ref={dropRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => imageInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
            background: isDragging
              ? 'rgba(255, 0, 0, 0.05)'
              : 'var(--iron-dark)',
            padding: '32px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.background = 'rgba(200, 168, 75, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.background = 'var(--iron-dark)';
            }
          }}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
            style={{ display: 'none' }}
          />
          <Upload
            size={28}
            style={{
              color: isDragging ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              transition: 'color 0.2s',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                color: isDragging ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: 0,
                transition: 'color 0.2s',
              }}
            >
              {isDragging ? 'Release to upload' : 'Drag & drop image here'}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                margin: '4px 0 0 0',
              }}
            >
              Or click to browse — paste from clipboard
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(255, 0, 0, 0.08)',
            border: '1px solid var(--omnissiah-red-dim)',
            color: 'var(--omnissiah-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          ⚠ {uploadError}
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Preview header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--parchment-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              <MousePointerClick size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Preview
            </span>
            <button
              onClick={onClearImage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>

          {/* Image */}
          <div
            style={{
              width: '100%',
              maxHeight: '200px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
            }}
          >
            <img
              src={imagePreview}
              alt="Search preview"
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Search engine buttons */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <SearchEngineButton
              label="Google"
              color="#4285F4"
              onClick={() => onSearchByImage('google')}
            />
            <SearchEngineButton
              label="Yandex"
              color="#FFCC00"
              onClick={() => onSearchByImage('yandex')}
            />
            <SearchEngineButton
              label="TinEye"
              color="#4B8DFE"
              onClick={() => onSearchByImage('tineye')}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mech-divider" style={{ fontSize: 'var(--font-size-xs)' }}>
        <span style={{ color: 'var(--steel-gray)' }}>&#x25C8;</span>
      </div>

      {/* Info Panel */}
      <div
        style={{
          padding: '12px',
          border: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            marginBottom: '8px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
          }}
        >
          ═══ Reverse Image Search ═══
        </div>
        <p style={{ marginBottom: '8px' }}>
          Upload an image or provide a URL to search for visually similar
          images across the datasphere.
        </p>
        <p>
          For local images, <span style={{ color: 'var(--omnissiah-red)' }}>Google Lens</span>{' '}
          provides the most accurate results.
        </p>
      </div>
    </>
  );
}

// ── Search Engine Button ───────────────────────────────────

interface SearchEngineButtonProps {
  label: string;
  color: string;
  onClick: () => void;
}

function SearchEngineButton({ label, color, onClick }: SearchEngineButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '70px',
        padding: '8px 10px',
        background: 'var(--void-black)',
        border: '1px solid var(--iron-gray)',
        color: 'var(--sacred-white)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-xs)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 8px ${color}40`;
        e.currentTarget.style.color = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--iron-gray)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.color = 'var(--sacred-white)';
      }}
    >
      <Search size={10} />
      {label}
    </button>
  );
}
