// ═══ DOWNLOADS PANEL ═══
// Monitor file transfers from the Noosphere.
// Progress bars, status indicators, file operations.

import React, { useState } from 'react';
import { Download, X, FolderOpen, FileText, Trash2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useDownloads, type DownloadItem, type DownloadStatus, formatBytes } from '../../hooks/useDownloads';

// ── Status icon mapping ─────────────────────────────────────

const StatusIcon: React.FC<{ status: DownloadStatus }> = ({ status }) => {
  switch (status) {
    case 'downloading':
      return <Loader size={12} className="animate-spin" style={{ animationDuration: '1s' }} color="var(--noosphere-cyan)" />;
    case 'completed':
      return <CheckCircle size={12} color="var(--noosphere-cyan)" />;
    case 'failed':
      return <AlertCircle size={12} color="var(--omnissiah-red)" />;
    case 'cancelled':
      return <X size={12} color="var(--parchment-dim)" />;
    case 'pending':
      return <Download size={12} color="var(--cogitator-gold)" />;
    default:
      return null;
  }
};

const statusLabel = (status: DownloadStatus): string => {
  switch (status) {
    case 'downloading':
      return 'DOWNLOADING';
    case 'completed':
      return 'COMPLETE';
    case 'failed':
      return 'FAILED';
    case 'cancelled':
      return 'CANCELLED';
    case 'pending':
      return 'PENDING';
    default:
      return (status as string).toUpperCase();
  }
};

const statusColor = (status: DownloadStatus): string => {
  switch (status) {
    case 'downloading':
      return 'var(--noosphere-cyan)';
    case 'completed':
      return 'var(--noosphere-cyan)';
    case 'failed':
      return 'var(--omnissiah-red)';
    case 'cancelled':
      return 'var(--parchment-dim)';
    case 'pending':
      return 'var(--cogitator-gold)';
    default:
      return 'var(--text-muted)';
  }
};

// ── Component ──────────────────────────────────────────────

const DownloadsPanel: React.FC = () => {
  const {
    downloads,
    clearCompleted,
    cancelDownload,
    openFile,
    showInFolder,
  } = useDownloads();
  // ── Derived state ───────────────────────────────────────

  const hasCompleted = downloads.some(
    (dl) => dl.status === 'completed' || dl.status === 'cancelled' || dl.status === 'failed'
  );

  const activeCount = downloads.filter(
    (dl) => dl.status === 'downloading' || dl.status === 'pending'
  ).length;

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
            <Download size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Data Transfers
          </div>

          {/* Clear completed */}
          {hasCompleted && (
            <button
              onClick={clearCompleted}
              title="Clear completed transfers"
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
              Clear
            </button>
          )}
        </div>

        {/* Active count */}
        {activeCount > 0 && (
          <div
            style={{
              color: 'var(--noosphere-cyan)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {activeCount} active transfer{activeCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Downloads List ────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {downloads.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <Download size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>No active data transfers.</div>
            <div style={{ marginTop: '4px', opacity: 0.6 }}>
              Downloaded files will appear here.
            </div>
          </div>
        ) : (
          downloads.map((dl) => (
            <DownloadItem
              key={dl.id}
              download={dl}
              onCancel={cancelDownload}
              onOpenFile={openFile}
              onShowInFolder={showInFolder}
            />
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
        {downloads.length} transfer{downloads.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// ── Download Item ───────────────────────────────────────────

interface DownloadItemProps {
  download: DownloadItem;
  onCancel: (id: string) => void;
  onOpenFile: (id: string) => void;
  onShowInFolder: (id: string) => void;
}

const DownloadItem: React.FC<DownloadItemProps> = ({
  download,
  onCancel: handleCancel,
  onOpenFile: handleOpen,
  onShowInFolder: handleShow,
}) => {
  const [hovered, setHovered] = useState(false);

  const progress =
    download.totalBytes > 0
      ? Math.round((download.receivedBytes / download.totalBytes) * 100)
      : 0;

  const isActive = download.status === 'downloading' || download.status === 'pending';
  const isDone = download.status === 'completed';
  const isFailed = download.status === 'failed' || download.status === 'cancelled';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--iron-gray)',
        transition: 'all 150ms ease',
        background: hovered ? 'rgba(255, 0, 0, 0.03)' : 'transparent',
        boxShadow: hovered ? 'inset 0 0 8px rgba(255, 0, 0, 0.05)' : 'none',
      }}
    >
      {/* Row 1: Icon + Filename + Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <StatusIcon status={download.status} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            color: 'var(--sacred-white)',
            fontSize: 'var(--font-size-xs)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {download.filename}
        </div>
        <span
          style={{
            flexShrink: 0,
            color: statusColor(download.status),
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {statusLabel(download.status)}
        </span>
      </div>

      {/* Row 2: Progress bar (for active downloads) */}
      {(isActive || download.status === 'downloading') && (
        <div style={{ marginBottom: '6px' }}>
          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--iron-dark)',
              borderRadius: '1px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--omnissiah-red)',
                boxShadow: '0 0 6px rgba(255, 0, 0, 0.6)',
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '3px',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
              {progress}%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
              {formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}
            </span>
          </div>
        </div>
      )}

      {/* Row 3: Actions */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {isDone && (
          <>
            <ActionButton
              onClick={() => handleOpen(download.id)}
              icon={<FileText size={10} />}
              label="Open"
            />
            <ActionButton
              onClick={() => handleShow(download.id)}
              icon={<FolderOpen size={10} />}
              label="Folder"
            />
          </>
        )}
        {isActive && (
          <ActionButton
            onClick={() => handleCancel(download.id)}
            icon={<X size={10} />}
            label="Cancel"
            danger
          />
        )}
        {isFailed && (
          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
            {formatBytes(download.receivedBytes)} downloaded
          </span>
        )}
      </div>
    </div>
  );
};

// ── Action Button ───────────────────────────────────────────

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label, danger }) => {
 const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        background: hovered
          ? danger
            ? 'rgba(255, 0, 0, 0.1)'
            : 'rgba(0, 191, 191, 0.1)'
          : 'transparent',
        border: `1px solid ${hovered ? (danger ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)') : 'var(--iron-gray)'}`,
        color: hovered
          ? danger
            ? 'var(--omnissiah-red)'
            : 'var(--noosphere-cyan)'
          : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '2px 6px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        transition: 'all 150ms ease',
        boxShadow: hovered && danger ? 'var(--glow-red)' : 'none',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default DownloadsPanel;
