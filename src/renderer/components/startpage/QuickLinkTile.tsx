// ═══ QUICK LINK TILE ═══
// A single quick link tile on the Start Page — displays favicon
// and title with Dark Mechanicus hover glow effect.

import React from 'react';
import { X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  favicon: string;
}

export interface QuickLinkTileProps {
  link: QuickLink;
  onClick: (url: string) => void;
  onRemove?: (id: string) => void;
}

// ── Helpers ────────────────────────────────────────────────

function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Component ──────────────────────────────────────────────

const QuickLinkTile: React.FC<QuickLinkTileProps> = ({ link, onClick, onRemove }) => {
  const faviconUrl = link.favicon || getFaviconUrl(link.url);
  const domain = getDomain(link.url);

  return (
    <div
      className="dm-mech-panel dm-tile"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 8px',
        cursor: 'pointer',
        minHeight: '80px',
        userSelect: 'none',
      }}
      onClick={() => onClick(link.url)}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(link.id);
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px',
            opacity: 0,
            transition: 'opacity 0.15s',
            fontSize: '10px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--omnissiah-red)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
          className="quicklink-remove-btn"
        >
          <X size={10} />
        </button>
      )}

      {/* Favicon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          background: 'var(--void-black)',
          border: '1px solid var(--iron-gray)',
          overflow: 'hidden',
        }}
      >
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            style={{ width: '16px', height: '16px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span style={{ fontSize: '14px', color: 'var(--cogitator-gold)' }}>\u26A1</span>
        )}
      </div>

      {/* Title */}
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--sacred-white)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {link.title}
      </span>

      {/* Domain */}
      <span
        style={{
          fontSize: '9px',
          color: 'var(--parchment-dim)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {domain}
      </span>

      {/* Hover reveal remove button via CSS class */}
      <style>{`
        .quicklink-remove-btn {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        *:hover > .quicklink-remove-btn {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
};

export default QuickLinkTile;
