// ═══ SPLIT VIEW — DUAL COGITATOR ═══
// Two webviews side by side with a resizable divider.
// For the Tech-Priest who must monitor multiple data-streams simultaneously.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Globe } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

interface SplitViewProps {
  primaryTabId: string | null;
  secondaryTabId: string | null;
  sidebarOpen: boolean;
  onClose: () => void;
  onNavigatePrimary: (url: string) => void;
  onNavigateSecondary: (url: string) => void;
}

// ── Mini Address Bar Sub-component ─────────────────────────

interface MiniAddressBarProps {
  tabId: string | null;
  label: string;
  onNavigate: (url: string) => void;
}

const MiniAddressBar: React.FC<MiniAddressBarProps> = ({ tabId, label, onNavigate }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with tab URL when tab changes
  useEffect(() => {
    if (tabId) {
      const tab = window.electronAPI?.tabs?.getAll
        ? null // will be set via effect
        : null;
      // We rely on the tab's URL being tracked elsewhere
      // The input shows the last navigated URL for this pane
    }
  }, [tabId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        onNavigate(inputValue.trim());
      }
    },
    [inputValue, onNavigate]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1 h-7 px-2 bg-[var(--iron-dark)] border-t border-[var(--iron-gray)] flex-shrink-0"
    >
      <Globe size={10} strokeWidth={1.5} className="text-[var(--noosphere-cyan)] flex-shrink-0" />
      <span className="text-[9px] font-mono text-[var(--cogitator-gold)] uppercase tracking-wider flex-shrink-0">
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter address..."
        className="flex-1 h-full bg-transparent text-[var(--sacred-white)] font-mono text-[11px] placeholder:text-[var(--text-muted)] focus:outline-none px-1"
        spellCheck={false}
        autoComplete="off"
      />
    </form>
  );
};

// ── WebView Pane Sub-component ─────────────────────────────

interface WebViewPaneProps {
  tabId: string | null;
  paneId: string;
}

const WebViewPane: React.FC<WebViewPaneProps> = ({ tabId, paneId }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pane bounds are managed by the main process via WebViewContainer's ResizeObserver
  // No local resize observer needed here to avoid forcing sidebar state

  // When no tab is active, show placeholder
  if (!tabId) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col"
        style={{ backgroundColor: 'var(--void-black)' }}
      >
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <span className="text-[var(--steel-gray)] text-2xl">◈</span>
          <span className="text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-widest">
            No Secondary Tab
          </span>
          <span className="text-[var(--parchment-dim)] font-mono text-[9px]">
            Right-click a tab → "Open in Split View"
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col"
      style={{ backgroundColor: 'var(--void-black)', position: 'relative', overflow: 'hidden' }}
      data-split-pane={paneId}
      data-tab-id={tabId}
    >
      {/*
        WebContentsView from the main process overlays this div.
        The pane serves as a spatial marker for bounds calculation.
        In a full implementation, the main process would position
        two WebContentsView instances side by side.
      */}
      <div className="w-full h-full" data-webview-container data-active-tab={tabId} />
    </div>
  );
};

// ── Main SplitView Component ───────────────────────────────

const SplitView: React.FC<SplitViewProps> = ({
  primaryTabId,
  secondaryTabId,
  sidebarOpen,
  onClose,
  onNavigatePrimary,
  onNavigateSecondary,
}) => {
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Resizer Drag Logic ──────────────────────────────────

  const handleResizerMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const newRatio = Math.max(0.3, Math.min(0.7, x / containerWidth));
      setSplitRatio(newRatio);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Keyboard shortcut: Ctrl+Shift+X to close split ──────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full"
      style={{ position: 'relative' }}
    >
      {/* ═══ Primary Pane ═══ */}
      <div
        className="flex flex-col h-full"
        style={{ width: `${splitRatio * 100}%`, flexShrink: 0 }}
      >
        {/* Mini address bar */}
        <div className="flex items-center justify-between h-7 px-2 bg-[var(--iron-dark)] border-b border-[var(--iron-gray)] flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] font-mono text-[var(--cogitator-gold)] uppercase tracking-wider flex-shrink-0">
              ◈ PRIMARY
            </span>
            <span className="text-[9px] font-mono text-[var(--text-muted)] truncate">
              {primaryTabId ? `Tab: ${primaryTabId.slice(0, 8)}...` : 'No tab'}
            </span>
          </div>
          {/* Close split view button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 text-[var(--text-muted)] hover:text-[var(--omnissiah-red)] hover:bg-[rgba(255,0,0,0.1)] transition-all duration-150 cursor-pointer flex-shrink-0"
            title="Close Split View (Ctrl+Shift+X)"
          >
            <X size={10} strokeWidth={2} />
          </button>
        </div>
        {/* WebView area */}
        <WebViewPane tabId={primaryTabId} paneId="primary" />
        {/* Navigation input */}
        <MiniAddressBar tabId={primaryTabId} label="NAV" onNavigate={onNavigatePrimary} />
      </div>

      {/* ═══ Resizer ═══ */}
      <div
        onMouseDown={handleResizerMouseDown}
        className="flex-shrink-0 h-full relative"
        style={{
          width: 4,
          background: isDragging
            ? 'var(--omnissiah-red)'
            : 'var(--steel-gray)',
          cursor: 'col-resize',
          boxShadow: isDragging
            ? '0 0 10px var(--omnissiah-red-glow), 0 0 20px var(--omnissiah-red-glow)'
            : 'none',
          transition: isDragging ? 'none' : 'background 0.15s, box-shadow 0.15s',
          zIndex: 10,
        }}
        title="Drag to resize"
      >
        {/* Resizer handle indicator */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 2,
            height: 24,
            background: isDragging ? 'var(--sacred-white)' : 'var(--steel-light)',
            borderRadius: 1,
            transition: 'background 0.15s',
          }}
        />
      </div>

      {/* ═══ Secondary Pane ═══ */}
      <div
        className="flex flex-col h-full"
        style={{ width: `${(1 - splitRatio) * 100}%`, flexShrink: 0 }}
      >
        {/* Mini address bar */}
        <div className="flex items-center justify-between h-7 px-2 bg-[var(--iron-dark)] border-b border-[var(--iron-gray)] flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] font-mono text-[var(--noosphere-cyan)] uppercase tracking-wider flex-shrink-0">
              ◈ SECONDARY
            </span>
            <span className="text-[9px] font-mono text-[var(--text-muted)] truncate">
              {secondaryTabId ? `Tab: ${secondaryTabId.slice(0, 8)}...` : 'No tab'}
            </span>
          </div>
          {/* Close split view button (secondary side) */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 text-[var(--text-muted)] hover:text-[var(--omnissiah-red)] hover:bg-[rgba(255,0,0,0.1)] transition-all duration-150 cursor-pointer flex-shrink-0"
            title="Close Split View (Ctrl+Shift+X)"
          >
            <X size={10} strokeWidth={2} />
          </button>
        </div>
        {/* WebView area */}
        <WebViewPane tabId={secondaryTabId} paneId="secondary" />
        {/* Navigation input */}
        <MiniAddressBar tabId={secondaryTabId} label="NAV" onNavigate={onNavigateSecondary} />
      </div>
    </div>
  );
};

export default SplitView;
