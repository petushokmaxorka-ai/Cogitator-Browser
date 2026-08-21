// ═══ TITLE BAR ═══
// Custom frameless window title bar — Dark Mechanicus style
// Omnissiah guide this window through the void...

import React, { useState, useEffect, useCallback } from 'react';
import {
  Minus,
  Square,
  X,
  Minimize2,
  Maximize2,
  Usb,
} from 'lucide-react';

// Detect portable mode from main process via IPC
function usePortableMode(): boolean {
  const [isPortable, setIsPortable] = useState(false);

  useEffect(() => {
    // Check via command-line or filesystem in main
    const checkPortable = async () => {
      try {
        // Portable mode flag is exposed via electronAPI
        const portable = await window.electronAPI?.window?.isPortable?.();
        if (typeof portable === 'boolean') {
          setIsPortable(portable);
        }
      } catch {
        // Fallback: check a global flag set by preload
        setIsPortable(false);
      }
    };
    checkPortable();
  }, []);

  return isPortable;
}

// ── Component ──────────────────────────────────────────────
const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isPortable = usePortableMode();

  // Check initial maximized state
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.electronAPI?.window?.isMaximized?.();
        if (typeof maximized === 'boolean') {
          setIsMaximized(maximized);
        }
      } catch {
        // Preload not available — ignore
      }
    };
    checkMaximized();
  }, []);

  // Listen for maximize/unmaximize events
  useEffect(() => {
    const api = window.electronAPI?.window;
    if (!api?.onMaximize || !api?.onUnmaximize) return;

    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    const unsubMaximize = api.onMaximize(handleMaximize);
    const unsubUnmaximize = api.onUnmaximize(handleUnmaximize);

    return () => {
      unsubMaximize?.();
      unsubUnmaximize?.();
    };
  }, []);

  // ── Window Controls ──────────────────────────────────────
  const handleMinimize = useCallback(() => {
    window.electronAPI?.window?.minimize?.();
  }, []);

  const handleMaximize = useCallback(() => {
    window.electronAPI?.window?.maximize?.();
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.window?.close?.();
  }, []);

  return (
    <div
      className={[
        'flex items-center justify-between',
        'h-9 min-h-[36px]',
        'bg-[var(--void-black)]',
        'border-b border-[var(--cogitator-gold)]',
        'select-none',
      ].join(' ')}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* ── Left: Traffic Lights ───────────────────────────── */}
      <div
        className="flex items-center gap-2 pl-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleClose}
          className={[
            'w-3 h-3 rounded-full flex items-center justify-center',
            'bg-[#FF5F57] hover:bg-[#FF5F57]',
            'transition-all duration-100',
            'group',
          ].join(' ')}
          title="Close"
          type="button"
        >
          <X
            size={8}
            strokeWidth={2.5}
            className="text-black opacity-0 group-hover:opacity-100"
          />
        </button>
        <button
          onClick={handleMinimize}
          className={[
            'w-3 h-3 rounded-full flex items-center justify-center',
            'bg-[#FFBD2E] hover:bg-[#FFBD2E]',
            'transition-all duration-100',
            'group',
          ].join(' ')}
          title="Minimize"
          type="button"
        >
          <Minus
            size={8}
            strokeWidth={2.5}
            className="text-black opacity-0 group-hover:opacity-100"
          />
        </button>
        <button
          onClick={handleMaximize}
          className={[
            'w-3 h-3 rounded-full flex items-center justify-center',
            'bg-[#28CA41] hover:bg-[#28CA41]',
            'transition-all duration-100',
            'group',
          ].join(' ')}
          title="Maximize"
          type="button"
        >
          <Square
            size={6}
            strokeWidth={2.5}
            className="text-black opacity-0 group-hover:opacity-100"
          />
        </button>
      </div>

      {/* ── Center: Title ──────────────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {isPortable && (
          <Usb
            size={12}
            aria-label="Portable Mode"
            style={{
              color: 'var(--led-green, #33ff00)',
              filter: 'drop-shadow(0 0 4px rgba(51, 255, 0, 0.5))',
              marginRight: 4,
            }}
          />
        )}
        <span className="cog-mark" title="cogitator" aria-hidden="true"><span>⚙</span></span>
        <span className="live-led" title="cogitator online" />
        <span className="text-[var(--cogitator-gold-bright,#e8c87e)] text-[11px] font-mono tracking-[0.2em] uppercase text-glow-gold">
          COGITATOR BROWSER
        </span>
        <span className="dm-badge">◆ DARK MECHANICUS</span>
      </div>

      {/* ── Right: Window Controls ─────────────────────────── */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className={[
            'flex items-center justify-center',
            'w-10 h-8',
            'text-[var(--text-muted)]',
            'hover:text-[var(--parchment)] hover:bg-[var(--iron-dark)]',
            'transition-all duration-100',
          ].join(' ')}
          title="Minimize"
          type="button"
        >
          <Minimize2 size={12} strokeWidth={1.5} />
        </button>

        <button
          onClick={handleMaximize}
          className={[
            'flex items-center justify-center',
            'w-10 h-8',
            'text-[var(--text-muted)]',
            'hover:text-[var(--parchment)] hover:bg-[var(--iron-dark)]',
            'transition-all duration-100',
          ].join(' ')}
          title={isMaximized ? 'Restore' : 'Maximize'}
          type="button"
        >
          {isMaximized ? (
            <Minimize2 size={12} strokeWidth={1.5} />
          ) : (
            <Maximize2 size={12} strokeWidth={1.5} />
          )}
        </button>

        <button
          onClick={handleClose}
          className={[
            'flex items-center justify-center',
            'w-10 h-8',
            'text-[var(--text-muted)]',
            'hover:text-white hover:bg-[var(--omnissiah-red-dim)]',
            'transition-all duration-100',
          ].join(' ')}
          title="Close"
          type="button"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
