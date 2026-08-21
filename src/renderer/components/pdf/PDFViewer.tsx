// ═══ PDF VIEWER ═══
// Built-in PDF document viewer using Chrome's native PDF engine via <embed>.
// Invoked when navigating to URLs ending in .pdf or containing .pdf? query.
// Part of the Dark Mechanicus cogitation apparatus.

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────
interface PDFViewerProps {
  /** Blob:, file://, or http(s) URL of the PDF document */
  url: string;
  /** Callback invoked when the viewer is closed */
  onClose?: () => void;
}

// ── Component ──────────────────────────────────────────────
/**
 * PDFViewer — Renders a PDF document using the browser's built-in PDF engine.
 * Displays a Mechanicus-styled toolbar with document URL and close button.
 */
export default function PDFViewer({ url, onClose }: PDFViewerProps) {
  const [loadError, setLoadError] = useState(false);

  // Handle PDF load errors
  const handleError = useCallback(() => {
    setLoadError(true);
  }, []);

  // Reset error state when URL changes
  useEffect(() => {
    setLoadError(false);
  }, [url]);

  // Extract filename from URL for display
  const fileName = (() => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'document.pdf';
      return decodeURIComponent(fileName);
    } catch {
      // For blob: or file:// URLs, try simple extraction
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.split('?')[0] || 'document.pdf';
    }
  })();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000000',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          height: 40,
          background: '#1E1E1E',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* PDF Viewer label */}
        <span
          style={{
            color: '#C8A84B',
            fontSize: 11,
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          ◉ PDF VIEWER
        </span>

        {/* Document name */}
        <span
          style={{
            color: '#8B7D6B',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginLeft: 4,
          }}
          title={url}
        >
          {fileName}
        </span>

        {/* Status indicator */}
        {loadError ? (
          <span
            style={{
              color: '#FF0000',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            ⚠ Load Failed
          </span>
        ) : (
          <span
            style={{
              color: '#00BFBF',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            ● Ready
          </span>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '4px 12px',
              background: '#8B0000',
              color: '#E8E8E8',
              border: '1px solid #FF0000',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF0000';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#8B0000';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            ✕ CLOSE
          </button>
        )}
      </div>

      {/* ═══ PDF Content Area ═══ */}
      {loadError ? (
        /* Error State */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ fontSize: 32, color: '#FF0000' }}>⚠</span>
          <span
            style={{
              color: '#E8E8E8',
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Failed to Load PDF
          </span>
          <span
            style={{
              color: '#8B7D6B',
              fontSize: 11,
              maxWidth: 400,
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {url}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                marginTop: 8,
                padding: '6px 16px',
                background: '#1E1E1E',
                color: '#C8A84B',
                border: '1px solid #C8A84B',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      ) : (
        /* PDF Embed — uses Chrome's built-in PDF viewer */
        <embed
          src={`${url}#toolbar=1&navpanes=0`}
          type="application/pdf"
          style={{
            width: '100%',
            height: 'calc(100% - 40px)',
            border: 'none',
            background: '#000000',
          }}
          onError={handleError}
        />
      )}
    </div>
  );
}
