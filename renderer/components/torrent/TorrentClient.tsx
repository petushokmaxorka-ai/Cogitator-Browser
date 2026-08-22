// ═══ TORRENT CLIENT — Data Swarm ═══
// Magnet link parser + WebTorrent UI with Dark Mechanicus styling

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Magnet,
  FilePlus,
  Play,
  Pause,
  Square,
  Trash2,
  ChevronRight,
  ChevronDown,
  Server,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  File,
  X,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface TorrentFile {
  name: string;
  size: number;
  downloaded: number;
  progress: number;
}

interface TorrentPeer {
  id: string;
  address: string;
  port: number;
  type: string;
  downloadSpeed: number;
  uploadSpeed: number;
}

interface TorrentItem {
  id: string;
  name: string;
  magnetUri: string;
  progress: number;
  downloadSpeed: number; // bytes/s
  uploadSpeed: number;
  peers: number;
  peerList: TorrentPeer[];
  size: number;
  downloaded: number;
  status: 'downloading' | 'seeding' | 'paused' | 'error';
  files: TorrentFile[];
}

interface SpeedPoint {
  time: number;
  down: number;
  up: number;
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_torrents';
const SPEED_HISTORY_LENGTH = 60;

const STATUS_COLORS: Record<string, string> = {
  downloading: 'var(--noosphere-cyan)',
  seeding: 'var(--cogitator-gold)',
  paused: 'var(--parchment-dim)',
  error: 'var(--omnissiah-red)',
};

const STATUS_LABELS: Record<string, string> = {
  downloading: 'DOWNLOADING',
  seeding: 'SEEDING',
  paused: 'PAUSED',
  error: 'ERROR',
};

// ── Magnet Link Parser ──────────────────────────────────────

function isValidMagnet(uri: string): boolean {
  return uri.startsWith('magnet:?');
}

// ── Format Helpers ──────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bps: number): string {
  return formatBytes(bps) + '/s';
}

// ── IPC Torrent Mapper ──────────────────────────────────────

function mapTorrentInfo(t: any): TorrentItem {
  const status: TorrentItem['status'] = t.paused
    ? 'paused'
    : t.done
      ? 'seeding'
      : 'downloading';
  return {
    id: t.infoHash,
    name: t.name,
    magnetUri: t.magnetURI,
    progress: t.progress,
    downloadSpeed: t.downloadSpeed,
    uploadSpeed: t.uploadSpeed,
    peers: t.numPeers,
    peerList: t.peers ?? [],
    size: t.length,
    downloaded: t.downloaded,
    status,
    files: t.files?.map((f: any) => ({
      name: f.name,
      size: f.length,
      downloaded: f.downloaded,
      progress: f.progress,
    })) || [],
  };
}

// ── Mock Speed History ──────────────────────────────────────

function generateMockHistory(): SpeedPoint[] {
  const history: SpeedPoint[] = [];
  const now = Date.now();
  for (let i = SPEED_HISTORY_LENGTH; i >= 0; i--) {
    history.push({
      time: now - i * 1000,
      down: Math.floor(Math.random() * 1024 * 1024 * 2) + 1024 * 100,
      up: Math.floor(Math.random() * 1024 * 256) + 1024 * 10,
    });
  }
  return history;
}

// ── Speed Graph ─────────────────────────────────────────────

function SpeedGraph({ history }: { history: SpeedPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(30, 30, 30, 0.5)';
    ctx.fillRect(0, 0, w, h);

    if (history.length < 2) return;

    const maxDown = Math.max(...history.map((p) => p.down), 1024);

    // Draw download line
    ctx.strokeStyle = '#00BFBF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((point, i) => {
      const x = (i / (SPEED_HISTORY_LENGTH - 1)) * w;
      const y = h - (point.down / maxDown) * h * 0.9 - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw upload line
    ctx.strokeStyle = '#C8A84B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    history.forEach((point, i) => {
      const x = (i / (SPEED_HISTORY_LENGTH - 1)) * w;
      const y = h - (point.up / maxDown) * h * 0.9 - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = 'rgba(42, 42, 42, 0.8)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [history]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '80px',
        borderRadius: '4px',
        border: '1px solid var(--iron-gray)',
      }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────

export function TorrentClient() {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);

  const [magnetInput, setMagnetInput] = useState('');
  const [selectedTorrent, setSelectedTorrent] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [webtorrentAvailable] = useState<boolean | null>(true);

  // Speed history for each torrent
  const [speedHistories, setSpeedHistories] = useState<Record<string, SpeedPoint[]>>({});

  // ── IPC: Listen for torrent updates from main process ─────

  useEffect(() => {
    const unsub = window.electronAPI?.torrent?.onUpdate?.((data: any[]) => {
      const mapped = data.map((t) => mapTorrentInfo(t));
      setTorrents(mapped);
    });
    // Initial load
    window.electronAPI?.torrent?.getList?.().then((data: any[]) => {
      const mapped = data.map((t) => mapTorrentInfo(t));
      setTorrents(mapped);
    }).catch(() => {});
    return () => { unsub?.(); };
  }, []);

  // ── Persist magnet URIs to localStorage for session restore ─

  useEffect(() => {
    const magnets = torrents.map((t) => t.magnetUri);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(magnets));
  }, [torrents]);

  // ── Speed history from IPC torrent stats (no mock simulation) ─

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedHistories((prev) => {
        const next: Record<string, SpeedPoint[]> = { ...prev };
        torrents.forEach((torrent) => {
          if (torrent.status !== 'downloading' && torrent.status !== 'seeding') return;
          const hist = [...(next[torrent.id] || [])];
          hist.push({
            time: Date.now(),
            down: torrent.downloadSpeed,
            up: torrent.uploadSpeed,
          });
          if (hist.length > SPEED_HISTORY_LENGTH) hist.shift();
          next[torrent.id] = hist;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [torrents]);

  // ── Handlers ──────────────────────────────────────────────

  const handleAddMagnet = useCallback(() => {
    if (!magnetInput.trim()) return;
    if (!isValidMagnet(magnetInput.trim())) {
      alert('Invalid magnet URI. Must start with magnet:?');
      return;
    }
    window.electronAPI?.torrent?.add?.(magnetInput.trim()).catch((err: any) => {
      console.error('[TorrentClient] Add failed:', err);
      alert('Failed to add torrent: ' + (err?.message || 'Unknown error'));
    });
    setMagnetInput('');
    setShowAddPanel(false);
  }, [magnetInput]);

  const handleAddTorrentFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] as (File & { path?: string }) | undefined;
      if (!file?.path) return;
      window.electronAPI?.torrent?.addFile?.(file.path).catch((err: unknown) => {
        console.error('[TorrentClient] Add file failed:', err);
        alert('Failed to add torrent: ' + (err instanceof Error ? err.message : 'Unknown error'));
      });
      e.target.value = '';
      setShowAddPanel(false);
    },
    [],
  );

  const handlePlay = useCallback((id: string) => {
    window.electronAPI?.torrent?.resume?.(id).catch(() => {});
  }, []);

  const handlePause = useCallback((id: string) => {
    window.electronAPI?.torrent?.pause?.(id).catch(() => {});
  }, []);

  const handleStop = useCallback((id: string) => {
    window.electronAPI?.torrent?.pause?.(id).catch(() => {});
  }, []);

  const handleDelete = useCallback((id: string) => {
    window.electronAPI?.torrent?.remove?.(id).catch(() => {});
    setSpeedHistories((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedTorrent((prev) => (prev === id ? null : prev));
    setDeleteConfirm(null);
  }, []);

  // ── Render ────────────────────────────────────────────────

  const selectedTorrentData = torrents.find((t) => t.id === selectedTorrent) || null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
        background: 'var(--void-black)',
        color: 'var(--parchment)',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <Magnet size={16} style={{ color: 'var(--omnissiah-red)', flexShrink: 0 }} />
          <div>
            <div
              style={{
                color: 'var(--cogitator-gold)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
              }}
            >
              DATA SWARM
            </div>
            <div style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)', marginTop: '1px' }}>
              {webtorrentAvailable === true
                ? '◉ WebTorrent Engine Active'
                : webtorrentAvailable === false
                  ? '○ WebTorrent Not Available — Simulation Mode'
                  : '◉ Detecting WebTorrent...'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--omnissiah-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 150ms ease',
            textTransform: 'uppercase' as const,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <FilePlus size={12} />
          ADD TORRENT
        </button>
      </div>

      {/* ── Add Panel ─────────────────────────────────────── */}
      {showAddPanel && (
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--iron-dark)',
            flexShrink: 0,
          }}
        >
          {/* Magnet Input */}
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--parchment-dim)',
                fontSize: 'var(--font-size-xs)',
                marginBottom: '4px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
              }}
            >
              Magnet URI
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={magnetInput}
                onChange={(e) => setMagnetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMagnet()}
                placeholder="magnet:?xt=urn:btih:..."
                style={{
                  flex: 1,
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
                onClick={handleAddMagnet}
                style={{
                  padding: '6px 12px',
                  background: 'var(--omnissiah-red)',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  textTransform: 'uppercase' as const,
                  fontWeight: 'bold',
                }}
              >
                ADD TO SWARM
              </button>
            </div>
          </div>

          {/* File Input */}
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--parchment-dim)',
                fontSize: 'var(--font-size-xs)',
                marginBottom: '4px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
              }}
            >
              .torrent File
            </label>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid var(--noosphere-cyan)',
                color: 'var(--noosphere-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                textTransform: 'uppercase' as const,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <FilePlus size={12} />
              SELECT .TORRENT FILE
              <input type="file" accept=".torrent" onChange={handleAddTorrentFile} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* ── Torrent List ──────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
        className="scrollbar-thin"
      >
        {torrents.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--parchment-dim)',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <Magnet size={32} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 'var(--font-size-xs)', letterSpacing: '0.15em' }}>
              NO ACTIVE SWARMS
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6 }}>
              Add a magnet link or .torrent file to begin
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {torrents.map((torrent) => (
              <TorrentRow
                key={torrent.id}
                torrent={torrent}
                isSelected={selectedTorrent === torrent.id}
                isDeleting={deleteConfirm === torrent.id}
                onSelect={() => setSelectedTorrent(torrent.id === selectedTorrent ? null : torrent.id)}
                onPlay={() => handlePlay(torrent.id)}
                onPause={() => handlePause(torrent.id)}
                onStop={() => handleStop(torrent.id)}
                onDelete={() => setDeleteConfirm(torrent.id)}
                onConfirmDelete={() => handleDelete(torrent.id)}
                onCancelDelete={() => setDeleteConfirm(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Panel ──────────────────────────────────── */}
      {selectedTorrentData && (
        <TorrentDetailPanel
          torrent={selectedTorrentData}
          speedHistory={speedHistories[selectedTorrentData.id] || []}
          onClose={() => setSelectedTorrent(null)}
        />
      )}

      {/* ── Footer Stats ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderTop: '1px solid var(--iron-gray)',
          flexShrink: 0,
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={10} />
            {torrents.length} SWARMS
          </span>
          <span style={{ color: 'var(--iron-gray)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--noosphere-cyan)' }}>
            <ArrowDown size={10} />
            {formatSpeed(torrents.reduce((s, t) => s + t.downloadSpeed, 0))}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cogitator-gold)' }}>
            <ArrowUp size={10} />
            {formatSpeed(torrents.reduce((s, t) => s + t.uploadSpeed, 0))}
          </span>
        </div>
        <span>
          TOTAL: {formatBytes(torrents.reduce((s, t) => s + t.size, 0))}
        </span>
      </div>
    </div>
  );
}

// ── Torrent Row ─────────────────────────────────────────────

function TorrentRow({
  torrent,
  isSelected,
  isDeleting,
  onSelect,
  onPlay,
  onPause,
  onStop,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  torrent: TorrentItem;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const progressPercent = Math.round(torrent.progress * 100);

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? 'rgba(255, 0, 0, 0.05)' : 'var(--iron-dark)',
        border: `1px solid ${isSelected ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
        borderLeft: isSelected ? '3px solid var(--omnissiah-red)' : '1px solid var(--iron-gray)',
        borderRadius: '2px',
        padding: '8px 10px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
    >
      {/* Name + Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          {isSelected ? (
            <ChevronDown size={12} style={{ color: 'var(--omnissiah-red)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
          )}
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sacred-white)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={torrent.name}
          >
            {torrent.name}
          </span>
        </div>
        <StatusBadge status={torrent.status} />
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--iron-gray)',
          borderRadius: '1px',
          marginBottom: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: torrent.status === 'error' ? 'var(--omnissiah-red)' : 'var(--omnissiah-red)',
            boxShadow: '0 0 6px var(--omnissiah-red-glow)',
            transition: 'width 300ms ease',
          }}
        />
      </div>

      {/* Info Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--noosphere-cyan)' }}>
            <ArrowDown size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
            {formatSpeed(torrent.downloadSpeed)}
          </span>
          <span style={{ color: 'var(--cogitator-gold)' }}>
            <ArrowUp size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
            {formatSpeed(torrent.uploadSpeed)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--parchment)' }}>
            <Server size={10} />
            {torrent.peers}
          </span>
        </div>
        <span style={{ color: 'var(--parchment-dim)' }}>
          {formatBytes(torrent.downloaded)} / {formatBytes(torrent.size)} ({progressPercent}%)
        </span>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid var(--iron-gray)',
        }}
      >
        {torrent.status === 'paused' || torrent.status === 'error' ? (
          <ActionButton onClick={onPlay} color="var(--noosphere-cyan)" title="Resume">
            <Play size={12} />
          </ActionButton>
        ) : (
          <ActionButton onClick={onPause} color="var(--cogitator-gold)" title="Pause">
            <Pause size={12} />
          </ActionButton>
        )}
        <ActionButton onClick={onStop} color="var(--parchment-dim)" title="Stop">
          <Square size={12} />
        </ActionButton>

        {isDeleting ? (
          <>
            <span style={{ color: 'var(--omnissiah-red)', fontSize: 'var(--font-size-xs)', marginLeft: '4px' }}>
              CONFIRM?
            </span>
            <ActionButton onClick={onConfirmDelete} color="var(--omnissiah-red)" title="Confirm Delete">
              <CheckCircle2 size={12} />
            </ActionButton>
            <ActionButton onClick={onCancelDelete} color="var(--parchment-dim)" title="Cancel">
              <X size={12} />
            </ActionButton>
          </>
        ) : (
          <ActionButton onClick={onDelete} color="var(--omnissiah-red)" title="Remove">
            <Trash2 size={12} />
          </ActionButton>
        )}
      </div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────

function StatusBadge({ status }: { status: TorrentItem['status'] }) {
  const icon =
    status === 'downloading' ? (
      <ArrowDown size={10} />
    ) : status === 'seeding' ? (
      <ArrowUp size={10} />
    ) : status === 'paused' ? (
      <Pause size={10} />
    ) : (
      <AlertTriangle size={10} />
    );

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 6px',
        borderRadius: '2px',
        fontSize: '9px',
        letterSpacing: '0.1em',
        background: `${STATUS_COLORS[status]}15`,
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}40`,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Action Button ───────────────────────────────────────────

function ActionButton({
  onClick,
  color,
  title,
  children,
}: {
  onClick: () => void;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        background: 'transparent',
        border: `1px solid ${color}40`,
        color,
        cursor: 'pointer',
        borderRadius: '2px',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}20`;
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = `${color}40`;
      }}
    >
      {children}
    </button>
  );
}

// ── Torrent Detail Panel ────────────────────────────────────

function TorrentDetailPanel({
  torrent,
  speedHistory,
  onClose,
}: {
  torrent: TorrentItem;
  speedHistory: SpeedPoint[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'files' | 'speed' | 'peers'>('files');

  return (
    <div
      style={{
        borderTop: '1px solid var(--omnissiah-red)',
        background: 'var(--iron-dark)',
        flexShrink: 0,
        maxHeight: '45%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--omnissiah-red)', fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>
            ◊
          </span>
          <span
            style={{
              color: 'var(--sacred-white)',
              fontSize: 'var(--font-size-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
            }}
          >
            {torrent.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        {(['files', 'speed', 'peers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: activeTab === tab ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
            }}
          >
            {tab === 'files' && <File size={10} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />}
            {tab === 'speed' && <ActivityIcon />}
            {tab === 'peers' && <Server size={10} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
        }}
        className="scrollbar-thin"
      >
        {activeTab === 'files' && <FileList files={torrent.files} />}
        {activeTab === 'speed' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              <span style={{ color: 'var(--noosphere-cyan)' }}>
                ▼ {formatSpeed(torrent.downloadSpeed)}
              </span>
              <span style={{ color: 'var(--cogitator-gold)' }}>
                ▲ {formatSpeed(torrent.uploadSpeed)}
              </span>
            </div>
            <SpeedGraph history={speedHistory.length > 1 ? speedHistory : generateMockHistory()} />
          </div>
        )}
        {activeTab === 'peers' && <PeersList peers={torrent.peers} peerList={torrent.peerList} />}
      </div>
    </div>
  );
}

// ── Activity Icon ───────────────────────────────────────────

function ActivityIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// ── File List ───────────────────────────────────────────────

function FileList({ files }: { files: TorrentFile[] }) {
  if (files.length === 0) {
    return (
      <div style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)', textAlign: 'center', padding: '16px' }}>
        No files available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {files.map((file, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            <File size={10} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <span
              style={{
                color: 'var(--sacred-white)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={file.name}
            >
              {file.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Mini progress */}
            <div
              style={{
                width: '60px',
                height: '4px',
                background: 'var(--iron-gray)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(file.progress * 100)}%`,
                  height: '100%',
                  background: 'var(--noosphere-cyan)',
                }}
              />
            </div>
            <span style={{ color: 'var(--parchment-dim)', minWidth: '50px', textAlign: 'right' }}>
              {formatBytes(file.size)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Peers List ──────────────────────────────────────────────

function PeersList({ peers, peerList }: { peers: number; peerList: TorrentPeer[] }) {
  const shown = peerList.slice(0, 50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
          borderBottom: '1px solid var(--iron-gray)',
          marginBottom: '4px',
        }}
      >
        <span>{peers} CONNECTED PEERS</span>
        <span style={{ color: 'var(--noosphere-cyan)' }}>SHOWING {shown.length}</span>
      </div>
      {shown.length === 0 && (
        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--parchment-dim)', fontSize: '11px' }}>
          No peers connected — DHT/tracker discovery in progress
        </div>
      )}
      {shown.map((peer) => (
        <div
          key={peer.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            background: 'var(--void-black)',
            borderRadius: '2px',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <Server size={9} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <span style={{ color: 'var(--sacred-white)' }}>{peer.address}</span>
            {peer.port > 0 && <span style={{ color: 'var(--parchment-dim)' }}>:{peer.port}</span>}
          </div>
          <span style={{ color: 'var(--cogitator-gold)', marginRight: '8px' }}>{peer.type}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ color: 'var(--noosphere-cyan)' }}>
              <ArrowDown size={9} style={{ display: 'inline' }} /> {formatSpeed(peer.downloadSpeed)}
            </span>
            <span style={{ color: 'var(--cogitator-gold)' }}>
              <ArrowUp size={9} style={{ display: 'inline' }} /> {formatSpeed(peer.uploadSpeed)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TorrentClient;
