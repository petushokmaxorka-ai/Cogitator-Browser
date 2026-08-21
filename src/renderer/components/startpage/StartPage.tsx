// ═══ START PAGE ═══
// New tab — folders, compact layout, COGITATOR BROWSER branding.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, X, Cog, Zap } from 'lucide-react';
import QuickLinkTile from './QuickLinkTile';
import type { QuickLink } from './QuickLinkTile';

// ── Types ──────────────────────────────────────────────────

export interface StartPageProps {
  onNavigate: (url: string) => void;
  onSearch?: (query: string) => void;
}

type FolderId = 'heretic' | 'webForge' | 'forge' | 'quick';

// ── Constants ──────────────────────────────────────────────

const STORAGE_HERETIC = 'cogitator_heretic_links_v1';
const STORAGE_WEB_FORGE = 'cogitator_web_forge_links_v1';
const STORAGE_FORGE = 'cogitator_forge_links_v1';
const STORAGE_QUICK = 'cogitator_quicklinks_v4';

const OPEN_KEYS: Record<FolderId, string> = {
  heretic: 'cogitator_folder_open_heretic',
  webForge: 'cogitator_folder_open_webforge',
  forge: 'cogitator_folder_open_forge',
  quick: 'cogitator_folder_open_quick',
};

const DEFAULT_HERETIC: QuickLink[] = [
  { id: 'oracle', title: 'Anathemetron', url: 'http://127.0.0.1:8765', favicon: '☉' },
  { id: 'forge', title: 'Heretic Forge', url: 'http://127.0.0.1:9091', favicon: '⚒' },
  { id: 'dashboard', title: 'Dashboard', url: 'http://127.0.0.1:7777', favicon: '' },
  { id: 'noosphere', title: 'Noosphere', url: 'cogitator://noosphere', favicon: '' },
  { id: 'mens', title: 'Mens Machinae', url: 'http://127.0.0.1:8000', favicon: '⚙' },
];

const DEFAULT_FORGE: QuickLink[] = [
  { id: 'forge-web', title: 'Forge Web UI', url: 'http://127.0.0.1:9091', favicon: '⚒' },
  { id: 'forge-llm', title: 'LLM Swarm', url: 'http://127.0.0.1:11436/v1/models', favicon: '☉' },
  { id: 'forge-tui', title: 'Forge TUI', url: 'cogitator://forge-tui', favicon: '⚙' },
];

const DEFAULT_WEB_FORGE: QuickLink[] = [
  { id: 'github', title: 'GitHub', url: 'https://github.com', favicon: '' },
  { id: 'reddit', title: 'Reddit', url: 'https://reddit.com', favicon: '' },
  { id: 'ollama', title: 'Ollama', url: 'https://ollama.com', favicon: '' },
  { id: 'huggingface', title: 'HuggingFace', url: 'https://huggingface.co', favicon: '' },
  { id: 'cloudflare', title: 'Cloudflare', url: 'https://cloudflare.com', favicon: '' },
];

const DEFAULT_QUICK: QuickLink[] = [
  { id: 'youtube', title: 'YouTube', url: 'https://youtube.com', favicon: '' },
  { id: 'protonmail', title: 'ProtonMail', url: 'https://mail.proton.me', favicon: '' },
  { id: 'protonpass', title: 'Proton Pass', url: 'https://pass.proton.me', favicon: '' },
  { id: 'libretranslate', title: 'LibreTranslate', url: 'https://libretranslate.com', favicon: '' },
  { id: 'archive', title: 'Internet Archive', url: 'https://archive.org', favicon: '' },
];

const NOOSPHERE_URL = 'cogitator://noosphere';

const FOLDER_META: Record<FolderId, { label: string; accent: string }> = {
  heretic: { label: 'Heretic OS', accent: 'var(--cogitator-gold, #C8A84B)' },
  webForge: { label: 'Web & Forge', accent: 'var(--noosphere-cyan, #00BCD4)' },
  forge: { label: 'Forge', accent: 'var(--omnissiah-red, #DC2626)' },
  quick: { label: 'Quick Links', accent: 'var(--parchment-dim, #B8B8B8)' },
};

// ── Helpers ────────────────────────────────────────────────

function loadLinks(key: string, defaults: QuickLink[]): QuickLink[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as QuickLink[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((l) => l.id));
        const merged = [...parsed];
        for (const defLink of defaults) {
          if (!existingIds.has(defLink.id)) merged.push(defLink);
        }
        return merged;
      }
    }
  } catch {
    // ignore
  }
  return defaults;
}

function saveLinks(key: string, links: QuickLink[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(links));
  } catch {
    // ignore
  }
}

function loadFolderOpen(id: FolderId, defaultOpen: boolean): boolean {
  try {
    const v = localStorage.getItem(OPEN_KEYS[id]);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    // ignore
  }
  return defaultOpen;
}

function saveFolderOpen(id: FolderId, open: boolean): void {
  try {
    localStorage.setItem(OPEN_KEYS[id], open ? '1' : '0');
  } catch {
    // ignore
  }
}

// ── Mechanicus folder icon ─────────────────────────────────

interface MechanicusFolderIconProps {
  open: boolean;
  accent: string;
}

const MechanicusFolderIcon: React.FC<MechanicusFolderIconProps> = ({ open, accent }) => (
  <div
    style={{
      width: 60,
      height: 48,
      position: 'relative',
      border: '1px solid var(--iron-gray, #3A3A3A)',
      background: 'linear-gradient(180deg, #121212 0%, #050505 100%)',
      flexShrink: 0,
      boxShadow: open ? `0 0 14px ${accent}44` : 'none',
    }}
  >
    <div style={{ height: 6, background: 'var(--omnissiah-red, #8B0000)', width: '100%' }} />
    <span
      style={{
        position: 'absolute',
        top: 3,
        right: 4,
        fontSize: 10,
        color: accent,
        lineHeight: 1,
      }}
    >
      ◆
    </span>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 38,
        color: open ? 'var(--omnissiah-red, #DC2626)' : accent,
        animation: open ? 'folder-cog-spin 2s linear infinite' : 'none',
      }}
    >
      <Cog size={24} strokeWidth={1.2} />
    </div>
  </div>
);

// ── Folder section ─────────────────────────────────────────

interface FolderSectionProps {
  folderId: FolderId;
  links: QuickLink[];
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onLinkClick: (url: string) => void;
  onRemove: (id: string) => void;
}

const FolderSection: React.FC<FolderSectionProps> = ({
  folderId,
  links,
  open,
  onToggle,
  onAdd,
  onLinkClick,
  onRemove,
}) => {
  const meta = FOLDER_META[folderId];

  return (
    <section style={{ width: '100%', marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: meta.accent,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          ═══ {meta.label} ═══
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: 'transparent',
            border: '1px solid var(--cogitator-gold, #C8A84B)',
            color: 'var(--cogitator-gold, #C8A84B)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="dm-mech-panel"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 15,
          padding: '12px 15px',
          background: 'rgba(10, 10, 10, 0.85)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <MechanicusFolderIcon open={open} accent={meta.accent} />
        <span
          style={{
            color: 'var(--sacred-white, #E8E8E8)',
            fontSize: 16,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {meta.label}
        </span>
        <span style={{ marginLeft: 'auto', color: meta.accent, fontSize: 14, opacity: 0.7 }}>
          {open ? '▼' : '▶'}
        </span>
      </button>

      {open && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 9,
            paddingLeft: 3,
          }}
        >
          {links.map((link) => (
            <QuickLinkTile
              key={link.id}
              link={link}
              onClick={onLinkClick}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// ── Main component ─────────────────────────────────────────

const StartPage: React.FC<StartPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hereticLinks, setHereticLinks] = useState<QuickLink[]>(() =>
    loadLinks(STORAGE_HERETIC, DEFAULT_HERETIC)
  );
  const [webForgeLinks, setWebForgeLinks] = useState<QuickLink[]>(() =>
    loadLinks(STORAGE_WEB_FORGE, DEFAULT_WEB_FORGE)
  );
  const [forgeLinks, setForgeLinks] = useState<QuickLink[]>(() =>
    loadLinks(STORAGE_FORGE, DEFAULT_FORGE)
  );
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() =>
    loadLinks(STORAGE_QUICK, DEFAULT_QUICK)
  );
  const [openFolders, setOpenFolders] = useState<Record<FolderId, boolean>>(() => ({
    heretic: loadFolderOpen('heretic', true),
    webForge: loadFolderOpen('webForge', false),
    forge: loadFolderOpen('forge', false),
    quick: loadFolderOpen('quick', false),
  }));
  const [quote] = useState('Knowledge is the currency of the Omnissiah.');
  const [addTarget, setAddTarget] = useState<FolderId | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveLinks(STORAGE_HERETIC, hereticLinks);
  }, [hereticLinks]);

  useEffect(() => {
    saveLinks(STORAGE_WEB_FORGE, webForgeLinks);
  }, [webForgeLinks]);

  useEffect(() => {
    saveLinks(STORAGE_FORGE, forgeLinks);
  }, [forgeLinks]);

  useEffect(() => {
    saveLinks(STORAGE_QUICK, quickLinks);
  }, [quickLinks]);

  const toggleFolder = useCallback((id: FolderId) => {
    setOpenFolders((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveFolderOpen(id, next[id]);
      return next;
    });
  }, []);

  const handleSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;

    const urlPattern = /^(https?:\/\/|ftp:\/\/|file:\/\/|localhost|(?:[\w-]+\.)+[a-z]{2,})/i;
    if (urlPattern.test(query) || (query.includes('.') && !query.includes(' '))) {
      const url = query.startsWith('http') ? query : `https://${query}`;
      onNavigate(url);
    } else {
      onNavigate(`${NOOSPHERE_URL}?q=${encodeURIComponent(query)}`);
    }
  }, [searchQuery, onNavigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleQuickLinkClick = useCallback((url: string) => onNavigate(url), [onNavigate]);

  const setLinksForFolder = useCallback((folder: FolderId, updater: (prev: QuickLink[]) => QuickLink[]) => {
    if (folder === 'heretic') setHereticLinks(updater);
    else if (folder === 'webForge') setWebForgeLinks(updater);
    else if (folder === 'forge') setForgeLinks(updater);
    else setQuickLinks(updater);
  }, []);

  const handleAddLink = useCallback(() => {
    if (!addTarget) return;
    const title = newTitle.trim();
    let url = newUrl.trim();
    if (!title || !url) return;
    if (!url.startsWith('http') && !url.startsWith('cogitator://')) {
      url = `https://${url}`;
    }

    const newLink: QuickLink = {
      id: `custom_${Date.now()}`,
      title,
      url,
      favicon: '',
    };

    setLinksForFolder(addTarget, (prev) => [...prev, newLink]);
    setNewTitle('');
    setNewUrl('');
    setAddTarget(null);
  }, [addTarget, newTitle, newUrl, setLinksForFolder]);

  const handleRemove = useCallback(
    (folder: FolderId) => (id: string) => {
      setLinksForFolder(folder, (prev) => prev.filter((l) => l.id !== id));
    },
    [setLinksForFolder]
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        height: '100%',
        backgroundColor: 'var(--void-black)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div className="dm-bg-glow" />
      <div className="dm-bg-grid" />
      <div className="dm-scanline-overlay" />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: '10px 24px 16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              color: 'var(--cogitator-gold)',
              filter: 'drop-shadow(0 0 20px rgba(200, 168, 75, 0.4))',
              animation: 'folder-cog-spin 8s linear infinite',
              userSelect: 'none',
            }}
          >
            <Cog size={48} strokeWidth={1} />
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 'bold',
              color: 'var(--cogitator-gold)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              margin: 0,
              textAlign: 'center',
              textShadow: '0 0 20px rgba(200, 168, 75, 0.35), 0 0 40px rgba(139, 0, 0, 0.15)',
            }}
          >
            COGITATOR BROWSER
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--parchment-dim)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              margin: 0,
              opacity: 0.7,
            }}
          >
            Sacred Instrument of the Omnissiah
          </p>
          <p
            style={{
              fontSize: 10,
              color: 'var(--cogitator-gold)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              margin: 0,
              opacity: 0.55,
            }}
          >
            HereticArch v2.1
          </p>
        </div>

        <div style={{ width: '100%', marginTop: 2 }}>
          <div
            className="dm-mech-panel dm-mech-panel-clean"
            style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'var(--void-black)' }}
          >
            <Search size={16} style={{ marginLeft: 16, color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter the Noosphere..."
              className="dm-input"
              autoFocus
            />
            <button type="button" onClick={handleSearch} className="dm-btn-seek">
              <Zap size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Seek
            </button>
          </div>
        </div>

        <FolderSection
          folderId="heretic"
          links={hereticLinks}
          open={openFolders.heretic}
          onToggle={() => toggleFolder('heretic')}
          onAdd={() => setAddTarget('heretic')}
          onLinkClick={handleQuickLinkClick}
          onRemove={handleRemove('heretic')}
        />
        <FolderSection
          folderId="webForge"
          links={webForgeLinks}
          open={openFolders.webForge}
          onToggle={() => toggleFolder('webForge')}
          onAdd={() => setAddTarget('webForge')}
          onLinkClick={handleQuickLinkClick}
          onRemove={handleRemove('webForge')}
        />
        <FolderSection
          folderId="forge"
          links={forgeLinks}
          open={openFolders.forge}
          onToggle={() => toggleFolder('forge')}
          onAdd={() => setAddTarget('forge')}
          onLinkClick={handleQuickLinkClick}
          onRemove={handleRemove('forge')}
        />
        <FolderSection
          folderId="quick"
          links={quickLinks}
          open={openFolders.quick}
          onToggle={() => toggleFolder('quick')}
          onAdd={() => setAddTarget('quick')}
          onLinkClick={handleQuickLinkClick}
          onRemove={handleRemove('quick')}
        />
      </div>

      <footer
        style={{
          marginTop: 'auto',
          width: '100%',
          padding: '20px 24px 28px',
          textAlign: 'center',
          zIndex: 10,
          borderTop: '1px solid var(--iron-gray)',
          background: 'linear-gradient(180deg, transparent, rgba(139, 0, 0, 0.06))',
        }}
      >
        <div className="dm-divider-gold" style={{ width: 64, margin: '0 auto 12px' }} />
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--cogitator-gold)',
            fontStyle: 'italic',
            letterSpacing: '0.06em',
            margin: 0,
            textShadow: '0 0 12px rgba(200, 168, 75, 0.25)',
          }}
        >
          {quote}
        </p>
        <p
          style={{
            fontSize: 9,
            color: 'var(--parchment-dim)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '10px 0 0',
            opacity: 0.8,
          }}
        >
          — Omnissiah protects. Data flows. —
        </p>
      </footer>

      {addTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 10, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setAddTarget(null)}
        >
          <div
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              padding: 24,
              width: '100%',
              maxWidth: 400,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                ═══ Add to {FOLDER_META[addTarget].label} ═══
              </span>
              <button
                type="button"
                onClick={() => setAddTarget(null)}
                style={{ background: 'none', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              placeholder="Title"
              autoFocus
              className="dm-input"
              style={{ padding: 10, width: '100%' }}
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              placeholder="URL"
              className="dm-input"
              style={{ padding: 10, width: '100%' }}
            />
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!newTitle.trim() || !newUrl.trim()}
              className="dm-btn-primary"
              style={{ padding: 10 }}
            >
              <Plus size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Add Link
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes folder-cog-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StartPage;
