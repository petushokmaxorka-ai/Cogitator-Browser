// ═══ ARCHIVE MANAGER ═══
// Sacred Archive Engine — extract, inspect, and forge data-vaults.
// Supports: .zip, .tar.gz (via main-process CLI)

import React, { useState, useCallback, useRef } from 'react';
import { Folder, File, Archive, Download, Upload, FileText, Lock, Zap, Eye } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ArchiveEntry {
  name: string;
  type: 'folder' | 'file';
  size: string;
  compressed?: string;
}

interface ArchiveInfo {
  name: string;
  size: string;
  uncompressed: string;
  ratio: string;
  files: ArchiveEntry[];
}

interface SelectedFile {
  name: string;
  content: string;
}

function formatBytes(raw: string): string {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return raw;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function entryType(name: string): 'folder' | 'file' {
  return name.endsWith('/') ? 'folder' : 'file';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const ArchiveManager: React.FC = () => {
  const [archive, setArchive] = useState<ArchiveInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inspect' | 'create'>('inspect');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'zip' | 'tar.gz' | '7z'>('zip');
  const [archiveName, setArchiveName] = useState('archive');
  const [createFiles, setCreateFiles] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [archivePath, setArchivePath] = useState('');
  const [loadError, setLoadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const loadArchiveAtPath = useCallback(async (path: string) => {
    setLoadError('');
    try {
      const entries = await window.electronAPI.archive.list(path);
      const files: ArchiveEntry[] = entries.map((e) => ({
        name: e.name,
        type: entryType(e.name),
        size: formatBytes(e.size),
      }));
      const totalBytes = entries.reduce((sum, e) => sum + (parseInt(e.size, 10) || 0), 0);
      const baseName = path.split('/').pop() || path;
      setArchivePath(path);
      setArchive({
        name: baseName,
        size: formatBytes(String(totalBytes)),
        uncompressed: formatBytes(String(totalBytes)),
        ratio: '—',
        files,
      });
      setSelectedEntries(new Set());
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setLoadError((err as Error).message);
      setArchive(null);
      setArchivePath('');
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────

  const handleOpenArchive = useCallback(async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Open Archive',
      filters: [
        { name: 'Archives', extensions: ['zip', 'tar', 'gz', 'tgz'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    if (path) await loadArchiveAtPath(path);
  }, [loadArchiveAtPath]);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] as (File & { path?: string }) | undefined;
      if (!file?.path) return;
      void loadArchiveAtPath(file.path);
    },
    [loadArchiveAtPath]
  );

  const handleSelectEntry = useCallback(
    (name: string) => {
      setSelectedEntries((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      });
    },
    []
  );

  const handlePreview = useCallback(
    (entry: ArchiveEntry) => {
      if (entry.type === 'folder') return;
      setSelectedFile(entry.name);
      if (!archivePath) {
        setPreview('Open an archive first.');
        return;
      }
      const textLike = /\.(md|txt|json|ts|tsx|js|jsx|html|css|xml|yaml|yml|toml|rs|go|py|sh|log)$/i.test(
        entry.name
      );
      if (!textLike) {
        setPreview(`Binary file: ${entry.name}\nSize: ${entry.size}`);
        return;
      }
      void window.electronAPI.archive
        .readEntry(archivePath, entry.name)
        .then((text) => setPreview(text.slice(0, 8000)))
        .catch((err) => setPreview(`Preview failed: ${(err as Error).message}`));
    },
    [archivePath]
  );

  const handleExtractSelected = useCallback(async () => {
    if (selectedEntries.size === 0 || !archivePath) return;
    setIsExtracting(true);
    try {
      const dest = await window.electronAPI.fs.getDownloads();
      await window.electronAPI.archive.extractEntries(archivePath, dest, Array.from(selectedEntries));
      void window.electronAPI.fs.reveal(dest);
    } catch (err) {
      alert(`Extract failed: ${(err as Error).message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [selectedEntries, archivePath]);

  const handleExtractAll = useCallback(async () => {
    if (!archive || !archivePath) return;
    setIsExtracting(true);
    try {
      const dest = await window.electronAPI.fs.getDownloads();
      await window.electronAPI.archive.extract(archivePath, dest);
      void window.electronAPI.fs.reveal(dest);
    } catch (err) {
      alert(`Extract failed: ${(err as Error).message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [archive, archivePath]);

  const handleCreateArchive = useCallback(async () => {
    if (createFiles.length === 0) return;
    const ext = format === 'zip' ? '.zip' : format === '7z' ? '.7z' : '.tar.gz';
    const defaultPath = `${archiveName}${ext}`;
    const filters =
      format === 'zip'
        ? [{ name: 'ZIP', extensions: ['zip'] }]
        : format === '7z'
          ? [{ name: '7z', extensions: ['7z'] }]
          : [{ name: 'tar.gz', extensions: ['tar.gz', 'tgz'] }];
    const outputPath = await window.electronAPI.sigil.saveFileDialog({
      title: 'Save archive',
      defaultPath,
      filters,
    });
    if (!outputPath) return;
    setIsCreating(true);
    try {
      await window.electronAPI.archive.create(outputPath, createFiles, format);
      void window.electronAPI.fs.reveal(outputPath);
      setCreateFiles([]);
    } catch (err) {
      alert(`Create failed: ${(err as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  }, [createFiles, format, archiveName]);

  const handleSelectCreateFiles = useCallback(async () => {
    const paths = await window.electronAPI.sigil.openFilesDialog({
      title: 'Select files to archive',
    });
    if (paths.length > 0) {
      setCreateFiles((prev) => [...new Set([...prev, ...paths])]);
    }
  }, []);

  const handleCreateFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const paths = Array.from(files)
        .map((f) => (f as File & { path?: string }).path)
        .filter((p): p is string => Boolean(p));
      if (paths.length) {
        setCreateFiles((prev) => [...new Set([...prev, ...paths])]);
      }
      e.target.value = '';
    },
    [],
  );

  // ── Render Helpers ────────────────────────────────────────

  const renderFileTree = (entries: ArchiveEntry[]) => {
    return entries.map((entry) => {
      const isSelected = selectedEntries.has(entry.name);
      const isPreviewing = selectedFile === entry.name;
      return (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            cursor: 'pointer',
            background: isPreviewing ? 'rgba(0, 191, 191, 0.1)' : isSelected ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
            borderLeft: isPreviewing ? '2px solid var(--noosphere-cyan)' : isSelected ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
            transition: 'all 0.1s',
          }}
          onClick={() => handleSelectEntry(entry.name)}
          onDoubleClick={() => handlePreview(entry)}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectEntry(entry.name);
            }}
            style={{ cursor: 'pointer' }}
          />
          {entry.type === 'folder' ? (
            <Folder size={14} style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }} />
          ) : (
            <File size={14} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
          )}
          <span
            style={{
              flex: 1,
              fontSize: 'var(--font-size-xs)',
              color: entry.type === 'folder' ? 'var(--cogitator-gold)' : 'var(--sacred-white)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--parchment-dim)', minWidth: '50px', textAlign: 'right' }}>
            {entry.size}
          </span>
          {entry.compressed && (
            <span style={{ fontSize: '10px', color: 'var(--noosphere-cyan)', minWidth: '50px', textAlign: 'right' }}>
              {entry.compressed}
            </span>
          )}
          {entry.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(entry);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '10px',
              }}
              title="Preview"
            >
              <Eye size={12} />
            </button>
          )}
        </div>
      );
    });
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
      {/* Header */}
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
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          <Archive size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ═══ Archive Manager ═══
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '2px' }}>
          EXTRACT // INSPECT // FORGE DATA-VAULTS
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--iron-gray)', flexShrink: 0 }}>
        {(['inspect', 'create'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              textShadow: activeTab === tab ? '0 0 8px rgba(255, 0, 0, 0.4)' : 'none',
            }}
          >
            {tab === 'inspect' ? (
              <><Upload size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />OPEN</>
            ) : (
              <><Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />CREATE</>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeTab === 'inspect' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Open Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.tar.gz,.7z"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleOpenArchive}
              style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--omnissiah-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Upload size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              OPEN ARCHIVE
            </button>

            {archive && (
              <>
                {/* Archive Info */}
                <div
                  style={{
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  <div><span style={{ color: 'var(--parchment-dim)' }}>Name:</span> <span style={{ color: 'var(--sacred-white)' }}>{archive.name}</span></div>
                  <div><span style={{ color: 'var(--parchment-dim)' }}>Size:</span> <span style={{ color: 'var(--noosphere-cyan)' }}>{archive.size}</span></div>
                  <div><span style={{ color: 'var(--parchment-dim)' }}>Uncompressed:</span> <span style={{ color: 'var(--cogitator-gold)' }}>{archive.uncompressed}</span></div>
                  <div><span style={{ color: 'var(--parchment-dim)' }}>Ratio:</span> <span style={{ color: 'var(--omnissiah-red)' }}>{archive.ratio}</span></div>
                </div>

                {/* File Count */}
                <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <Zap size={10} style={{ display: 'inline', marginRight: '4px' }} />
                  {archive.files.length} entries ({archive.files.filter((f) => f.type === 'file').length} files)
                </div>

                {/* File Tree */}
                <div
                  style={{
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  {renderFileTree(archive.files)}
                </div>

                {/* Extract Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleExtractSelected}
                    disabled={selectedEntries.size === 0 || isExtracting}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: selectedEntries.size > 0 ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                      border: '1px solid var(--omnissiah-red)',
                      color: selectedEntries.size > 0 ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      cursor: selectedEntries.size > 0 ? 'pointer' : 'not-allowed',
                      textTransform: 'uppercase',
                      opacity: selectedEntries.size > 0 ? 1 : 0.4,
                    }}
                  >
                    <Download size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    EXTRACT SELECTED ({selectedEntries.size})
                  </button>
                  <button
                    onClick={handleExtractAll}
                    disabled={isExtracting}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(200, 168, 75, 0.1)',
                      border: '1px solid var(--cogitator-gold)',
                      color: 'var(--cogitator-gold)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Archive size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    EXTRACT ALL
                  </button>
                </div>

                {isExtracting && (
                  <div style={{ color: 'var(--omnissiah-red)', fontSize: '10px', textAlign: 'center', letterSpacing: '0.1em' }}>
                    ▓▓▓ EXTRACTING SACRED DATA ▓▓▓
                  </div>
                )}

                {/* Preview */}
                {preview && (
                  <div
                    style={{
                      background: 'var(--iron-dark)',
                      border: '1px solid var(--noosphere-cyan)',
                      padding: '10px',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--noosphere-cyan)',
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileText size={12} />
                      PREVIEW: {selectedFile}
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        color: 'var(--sacred-white)',
                        fontSize: '11px',
                        lineHeight: 1.5,
                        maxHeight: '180px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {preview}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Create Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Select Files */}
            <input
              ref={createFileInputRef}
              type="file"
              multiple
              onChange={handleCreateFilesSelected}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => void handleSelectCreateFiles()}
              style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid var(--cogitator-gold)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 75, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Folder size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              SELECT FILES
            </button>

            {/* File List */}
            {createFiles.length > 0 && (
              <div
                style={{
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  padding: '8px',
                  maxHeight: '150px',
                  overflow: 'auto',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  {createFiles.length} files selected
                </div>
                {createFiles.map((path) => (
                  <div key={path} style={{ fontSize: '11px', color: 'var(--sacred-white)', padding: '2px 0' }}>
                    <File size={10} style={{ display: 'inline', marginRight: '4px', color: 'var(--noosphere-cyan)' }} />
                    {path.split('/').pop() ?? path}
                  </div>
                ))}
              </div>
            )}

            {/* Archive Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Archive Name
              </label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                style={{
                  padding: '8px 10px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
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

            {/* Format Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Format
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['zip', 'tar.gz', '7z'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: format === f ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
                      border: format === f ? '1px solid var(--noosphere-cyan)' : '1px solid var(--iron-gray)',
                      color: format === f ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={() => void handleCreateArchive()}
              disabled={createFiles.length === 0 || isCreating}
              style={{
                padding: '10px',
                background: createFiles.length > 0 ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
                border: '1px solid var(--noosphere-cyan)',
                color: createFiles.length > 0 ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.15em',
                cursor: createFiles.length > 0 ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                opacity: createFiles.length > 0 ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (createFiles.length > 0) {
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 191, 191, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              CREATE ARCHIVE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveManager;
