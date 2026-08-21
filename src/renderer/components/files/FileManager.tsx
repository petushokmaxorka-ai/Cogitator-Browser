// ═══ ARCHIVE OF MARS ═══
// File Manager — Local filesystem navigator
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home,
  Download,
  Monitor,
  FileText,
  Image,
  Folder,
  FolderOpen,
  File,
  ChevronUp,
  Trash2,
  Copy,
  ExternalLink,
  Edit3,
  Check,
  X,
  Plus,
  Search,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { IPC_CHANNELS } from '../../../shared/types';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
}

type SortField = 'name' | 'size' | 'modified';
type SortDir = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getFileIcon(isDirectory: boolean, name: string) {
  if (isDirectory) {
    return <FolderOpen size={16} style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }} />;
  }
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    return <Image size={16} style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }} />;
  }
  if (['txt', 'md', 'json', 'js', 'ts', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml', 'log'].includes(ext)) {
    return <FileText size={16} style={{ color: 'var(--parchment)', flexShrink: 0 }} />;
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return <FileText size={16} style={{ color: 'var(--omnissiah-red)', flexShrink: 0 }} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <Folder size={16} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />;
  }
  return <File size={16} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [homePath, setHomePath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<FileEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Quick folders ───────────────────────────────────────
  const quickFolders = useMemo(
    () => [
      { id: 'home', label: 'HOME', icon: <Home size={14} /> },
      { id: 'downloads', label: 'DL', icon: <Download size={14} /> },
      { id: 'desktop', label: 'DSK', icon: <Monitor size={14} /> },
      { id: 'documents', label: 'DOC', icon: <FileText size={14} /> },
      { id: 'pictures', label: 'PIC', icon: <Image size={14} /> },
    ],
    []
  );

  // ── Load directory ──────────────────────────────────────
  const loadDirectory = useCallback(async (dirPath: string) => {
    if (!dirPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const files = await window.electronAPI.fs.listDir(dirPath);
      setEntries(files);
      setCurrentPath(dirPath);
      setSelectedEntry(null);
      setRenameTarget(null);
      setDeleteConfirm(null);
      setNewFolderMode(false);
    } catch (err) {
      setError(`Access denied: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Initialize with home directory ──────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const home = await window.electronAPI.fs.getHome();
        setHomePath(home);
        await loadDirectory(home);
      } catch {
        setError('Failed to initialize file system access');
      }
    };
    init();
  }, [loadDirectory]);

  // ── Navigate to quick folder ────────────────────────────
  const navigateToQuickFolder = useCallback(
    async (id: string) => {
      try {
        let path = '';
        switch (id) {
          case 'home':
            path = await window.electronAPI.fs.getHome();
            break;
          case 'downloads':
            path = await window.electronAPI.fs.getDownloads();
            break;
          case 'desktop':
            path = await window.electronAPI.fs.getDesktop();
            break;
          case 'documents':
            path = await window.electronAPI.fs.getDocuments();
            break;
          case 'pictures':
            path = await window.electronAPI.fs.getPictures();
            break;
        }
        if (path) await loadDirectory(path);
      } catch {
        setError(`Failed to open ${id}`);
      }
    },
    [loadDirectory]
  );

  // ── Navigate up ─────────────────────────────────────────
  const navigateUp = useCallback(() => {
    if (!currentPath || currentPath === homePath) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    // On Windows, handle backslash paths
    const parentPath = parent.replace(/\\/g, '/');
    loadDirectory(parentPath || homePath);
  }, [currentPath, homePath, loadDirectory]);

  // ── Navigate into directory ─────────────────────────────
  const navigateInto = useCallback(
    (entry: FileEntry) => {
      if (entry.isDirectory) {
        loadDirectory(entry.path);
      }
    },
    [loadDirectory]
  );

  // ── Sort entries ────────────────────────────────────────
  const sortedEntries = useMemo(() => {
    const filtered = searchQuery
      ? entries.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : [...entries];

    filtered.sort((a, b) => {
      // Directories always first
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'size':
          return (a.size - b.size) * dir;
        case 'modified':
          return (a.modifiedAt - b.modifiedAt) * dir;
        default:
          return 0;
      }
    });
    return filtered;
  }, [entries, sortField, sortDir, searchQuery]);

  // ── Toggle sort ─────────────────────────────────────────
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField]
  );

  // ── Open file with default app ──────────────────────────
  const openFile = useCallback(async (entry: FileEntry) => {
    try {
      await window.electronAPI.fs.openPath(entry.path);
    } catch {
      setError(`Failed to open: ${entry.name}`);
    }
  }, []);

  // ── Copy path to clipboard ──────────────────────────────
  const copyPath = useCallback((entry: FileEntry) => {
    navigator.clipboard.writeText(entry.path).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = entry.path;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }, []);

  // ── Delete file/folder ──────────────────────────────────
  const handleDelete = useCallback(
    async (entry: FileEntry) => {
      try {
        await window.electronAPI.fs.delete(entry.path);
        await loadDirectory(currentPath);
        setDeleteConfirm(null);
      } catch {
        setError(`Failed to delete: ${entry.name}`);
      }
    },
    [currentPath, loadDirectory]
  );

  // ── Rename file/folder ──────────────────────────────────
  const handleRename = useCallback(
    async (entry: FileEntry, newName: string) => {
      if (!newName || newName === entry.name) {
        setRenameTarget(null);
        return;
      }
      try {
        const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'));
        const newPath = `${parentPath}/${newName}`;
        await window.electronAPI.fs.rename(entry.path, newPath);
        await loadDirectory(currentPath);
        setRenameTarget(null);
      } catch {
        setError(`Failed to rename: ${entry.name}`);
      }
    },
    [currentPath, loadDirectory]
  );

  // ── Create new folder ───────────────────────────────────
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setNewFolderMode(false);
      return;
    }
    try {
      const newPath = `${currentPath}/${newFolderName.trim()}`;
      await window.electronAPI.fs.mkdir(newPath);
      await loadDirectory(currentPath);
      setNewFolderMode(false);
      setNewFolderName('');
    } catch {
      setError(`Failed to create folder: ${newFolderName}`);
    }
  }, [currentPath, newFolderName, loadDirectory]);

  // ── Handle entry double click ───────────────────────────
  const handleEntryDoubleClick = useCallback(
    (entry: FileEntry) => {
      if (entry.isDirectory) {
        navigateInto(entry);
      } else {
        // Check if image for preview
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
          setPreviewImage(`file://${entry.path}`);
        } else {
          openFile(entry);
        }
      }
    },
    [navigateInto, openFile]
  );

  // ── Breadcrumb path ─────────────────────────────────────
  const breadcrumbParts = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split('/').filter(Boolean);
    return parts;
  }, [currentPath]);

  // ── Breadcrumb click ────────────────────────────────────
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const parts = currentPath.split('/').filter(Boolean);
      const newPath = '/' + parts.slice(0, index + 1).join('/');
      loadDirectory(newPath);
    },
    [currentPath, loadDirectory]
  );

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
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
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
            fontSize: '12px',
            letterSpacing: '0.15em',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          📁 ARCHIVE OF MARS
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            marginTop: '2px',
          }}
        >
          FILE SYSTEM NAVIGATOR v1.0
        </div>
      </div>

      {/* ═══ Quick Folders ═══ */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {quickFolders.map((qf) => (
          <button
            key={qf.id}
            onClick={() => navigateToQuickFolder(qf.id)}
            title={qf.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.color = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {qf.icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setNewFolderMode(true)}
          title="New Folder"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
            e.currentTarget.style.color = 'var(--noosphere-cyan)';
            e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.color = 'var(--parchment-dim)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* ═══ Breadcrumb ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          overflowX: 'auto',
          background: 'var(--iron-dark)',
          minHeight: '28px',
        }}
      >
        {currentPath !== homePath && (
          <button
            onClick={navigateUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px 4px',
              background: 'transparent',
              border: 'none',
              color: 'var(--noosphere-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <ChevronUp size={10} />
            ..
          </button>
        )}
        <span style={{ color: 'var(--parchment-dim)', fontSize: '10px' }}>/</span>
        {breadcrumbParts.map((part, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              style={{
                padding: '2px 4px',
                background: 'transparent',
                border: 'none',
                color: idx === breadcrumbParts.length - 1 ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: idx === breadcrumbParts.length - 1 ? 'bold' : 'normal',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {part}
            </button>
            {idx < breadcrumbParts.length - 1 && (
              <span style={{ color: 'var(--parchment-dim)', fontSize: '10px' }}>/</span>
            )}
          </span>
        ))}
      </div>

      {/* ═══ Search Bar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--void-black)',
        }}
      >
        <Search size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter files..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            outline: 'none',
            padding: '2px 0',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              color: 'var(--parchment-dim)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={10} />
          </button>
        )}
        <span style={{ color: 'var(--parchment-dim)', fontSize: '9px', whiteSpace: 'nowrap' }}>
          {sortedEntries.length} items
        </span>
      </div>

      {/* ═══ Sort Headers ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 70px',
          gap: '4px',
          padding: '4px 10px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {[
          { field: 'name' as SortField, label: 'NAME' },
          { field: 'size' as SortField, label: 'SIZE' },
          { field: 'modified' as SortField, label: 'MODIFIED' },
        ].map((col) => (
          <button
            key={col.field}
            onClick={() => toggleSort(col.field)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              color: sortField === col.field ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textAlign: 'left',
              padding: '2px',
            }}
          >
            {col.label}
            <ArrowUpDown
              size={9}
              style={{
                opacity: sortField === col.field ? 1 : 0.3,
                transform: sortField === col.field && sortDir === 'desc' ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            />
          </button>
        ))}
      </div>

      {/* ═══ File List ═══ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
        }}
        className="scrollbar-mechanicus"
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--parchment-dim)',
              fontSize: '11px',
              letterSpacing: '0.1em',
            }}
          >
            <span style={{ animation: 'pulse 1s infinite' }}>SCANNING SECTOR...</span>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '16px',
              color: 'var(--omnissiah-red)',
              fontSize: '11px',
              textAlign: 'center',
            }}
          >
            ⚠ {error}
          </div>
        ) : (
          <>
            {/* New folder input */}
            {newFolderMode && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 70px',
                  gap: '4px',
                  padding: '4px 10px',
                  borderBottom: '1px solid var(--iron-gray)',
                  alignItems: 'center',
                  background: 'rgba(0, 191, 191, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderOpen size={16} style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }} />
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setNewFolderMode(false);
                    }}
                    placeholder="folder-name"
                    style={{
                      flex: 1,
                      background: 'var(--void-black)',
                      border: '1px solid var(--noosphere-cyan)',
                      color: 'var(--sacred-white)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '2px 6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleCreateFolder}
                    style={{ color: '#00FF00', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setNewFolderMode(false)}
                    style={{ color: 'var(--omnissiah-red)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <span />
                <span />
              </div>
            )}

            {/* Entries */}
            {sortedEntries.map((entry) => {
              const isSelected = selectedEntry?.path === entry.path;
              const isRenaming = renameTarget?.path === entry.path;

              return (
                <div
                  key={entry.path}
                  onClick={() => setSelectedEntry(entry)}
                  onDoubleClick={() => handleEntryDoubleClick(entry)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 70px',
                    gap: '4px',
                    padding: '4px 10px',
                    borderBottom: '1px solid var(--iron-gray)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                    transition: 'all 100ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Name column */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {getFileIcon(entry.isDirectory, entry.name)}
                    {isRenaming ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(entry, renameValue);
                          if (e.key === 'Escape') setRenameTarget(null);
                        }}
                        onBlur={() => handleRename(entry, renameValue)}
                        style={{
                          flex: 1,
                          background: 'var(--void-black)',
                          border: '1px solid var(--omnissiah-red)',
                          color: 'var(--sacred-white)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '1px 4px',
                          outline: 'none',
                          minWidth: 0,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        style={{
                          color: entry.isDirectory ? 'var(--noosphere-cyan)' : 'var(--parchment)',
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.02em',
                        }}
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                    )}
                  </div>

                  {/* Size column */}
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      fontSize: '9px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.isDirectory ? '--' : formatSize(entry.size)}
                  </span>

                  {/* Modified column */}
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      fontSize: '9px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatDate(entry.modifiedAt)}
                  </span>
                </div>
              );
            })}

            {sortedEntries.length === 0 && !newFolderMode && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--parchment-dim)',
                  fontSize: '11px',
                  fontStyle: 'italic',
                }}
              >
                {searchQuery ? 'No matching files found...' : 'Sector empty...'}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Action Bar ═══ */}
      {selectedEntry && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '6px 10px',
            borderTop: '1px solid var(--iron-gray)',
            flexShrink: 0,
            background: 'var(--iron-dark)',
            flexWrap: 'wrap',
          }}
        >
          {!selectedEntry.isDirectory && (
            <ActionButton
              icon={<ExternalLink size={11} />}
              label="OPEN"
              onClick={() => openFile(selectedEntry)}
            />
          )}
          {selectedEntry.isDirectory && (
            <ActionButton
              icon={<Eye size={11} />}
              label="ENTER"
              onClick={() => navigateInto(selectedEntry)}
            />
          )}
          <ActionButton
            icon={<Copy size={11} />}
            label="COPY PATH"
            onClick={() => copyPath(selectedEntry)}
          />
          <ActionButton
            icon={<Edit3 size={11} />}
            label="RENAME"
            onClick={() => {
              setRenameTarget(selectedEntry);
              setRenameValue(selectedEntry.name);
            }}
          />
          <div style={{ flex: 1 }} />
          <ActionButton
            icon={<Trash2 size={11} />}
            label="DELETE"
            variant="danger"
            onClick={() => setDeleteConfirm(selectedEntry)}
          />
        </div>
      )}

      {/* ═══ Delete Confirmation Dialog ═══ */}
      {deleteConfirm && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--iron-dark)',
            borderTop: '2px solid var(--omnissiah-red)',
            padding: '10px 12px',
            zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              marginBottom: '6px',
              fontWeight: 'bold',
            }}
          >
            ⚠ CONFIRM DELETION
          </div>
          <div style={{ color: 'var(--parchment)', fontSize: '10px', marginBottom: '8px' }}>
            {deleteConfirm.isDirectory ? 'Directory' : 'File'}: {deleteConfirm.name}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              style={{
                padding: '4px 12px',
                background: 'var(--omnissiah-red-dim)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--omnissiah-red-dim)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              CONFIRM DELETE
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{
                padding: '4px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--parchment-dim)';
                e.currentTarget.style.color = 'var(--parchment)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* ═══ Image Preview ═══ */}
      {previewImage && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 10, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            IMAGE PREVIEW — CLICK TO CLOSE
          </div>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100% - 30px)',
              border: '1px solid var(--iron-gray)',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Action Button Subcomponent
// ═══════════════════════════════════════════════════════════

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  const color = variant === 'danger' ? 'var(--omnissiah-red)' : 'var(--parchment-dim)';
  const hoverColor = variant === 'danger' ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)';
  const hoverBorder = variant === 'danger' ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: 'var(--void-black)',
        border: '1px solid var(--iron-gray)',
        color: color,
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverBorder;
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.boxShadow = variant === 'danger' ? 'var(--glow-red)' : 'var(--glow-cyan)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--iron-gray)';
        e.currentTarget.style.color = color;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
