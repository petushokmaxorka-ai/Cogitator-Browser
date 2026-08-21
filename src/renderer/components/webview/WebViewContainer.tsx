// ═══════════════════════════════════════════════════════════
// WebView Container — Renderer Component
// ═══════════════════════════════════════════════════════════
//
// This component renders a DIV that acts as a spatial marker
// for the main-process WebContentsView overlays. The actual
// web content is rendered by WebContentsView instances created
// and managed in the main process (tab-manager.ts).
//
// When no tab is active, the Start Page (sacred home page) is
// displayed instead of the old splash screen.
//
// ═══════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';
import { StartPage } from '../startpage';
import LoadingScreen from './LoadingScreen';

// ── Types ───────────────────────────────────────────────

interface WebViewContainerProps {
  activeTabId: string | null;
  activeTabUrl?: string | null;
  sidebarOpen: boolean;
  isLoading?: boolean;
  loadProgress?: number;
  /** Navigate callback for Start Page */
  onNavigate?: (url: string) => void;
  /** Search callback for Start Page */
  onSearch?: (query: string) => void;
}

// ── Constants ───────────────────────────────────────────

const WEBVIEW_CONTAINER_ID = 'webview-container';

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

const WebViewContainer: React.FC<WebViewContainerProps> = ({
  activeTabId,
  activeTabUrl,
  sidebarOpen,
  isLoading,
  loadProgress = 0,
  onNavigate,
  onSearch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevSidebarRef = useRef(sidebarOpen);

  // ── Sidebar State Sync ──────────────────────────────────
  // Notify main process whenever sidebar opens/closes so it
  // can recalculate WebContentsView bounds.

  useEffect(() => {
    // Only call when value actually changes to avoid loops
    if (prevSidebarRef.current !== sidebarOpen) {
      prevSidebarRef.current = sidebarOpen;
      if (window.electronAPI?.sidebar?.toggle) {
        window.electronAPI.sidebar.toggle(sidebarOpen);
      }
    }
  }, [sidebarOpen]);

  // ── Resize Observer ─────────────────────────────────────
  // Watch container size changes and notify main process
  // to update all WebContentsView bounds.

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Notify main process to recalculate bounds.
      // We use the sidebar IPC as a trigger since it causes
      // updateBounds() to run in tab-manager.
      if (window.electronAPI?.sidebar?.toggle) {
        window.electronAPI.sidebar.toggle(sidebarOpen);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sidebarOpen]);

  // ── Keyboard: F12 DevTools ──────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        if (window.electronAPI?.devtools?.open) {
          window.electronAPI.devtools.open();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Start Page Navigation ───────────────────────────────

  const handleStartPageNavigate = useCallback((url: string) => {
    if (onNavigate) {
      onNavigate(url);
    }
  }, [onNavigate]);

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  // No active tab or start page URL — show the sacred Start Page
  if (!activeTabId || activeTabUrl?.includes('cogitator://start')) {
    return (
      <div
        id={WEBVIEW_CONTAINER_ID}
        ref={containerRef}
        className="webview-container transition-all duration-300 ease-out"
        style={{
          width: sidebarOpen ? 'calc(100% - 400px)' : '100%',
          height: '100%',
          backgroundColor: 'var(--void-black, #000000)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <StartPage
          onNavigate={handleStartPageNavigate}
        />
      </div>
    );
  }

  // Active tab — render container div for WebContentsView overlay
  return (
    <div
      id={WEBVIEW_CONTAINER_ID}
      ref={containerRef}
      className="webview-container transition-all duration-300 ease-out"
      style={{
        width: sidebarOpen ? 'calc(100% - 400px)' : '100%',
        height: '100%',
        backgroundColor: 'var(--void-black, #000000)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/*
        WebContentsView instances from the main process are positioned
        OVER this div. The main process (tab-manager.ts) handles bounds
        calculation and setBounds() calls.

        This div serves as:
        1. A spatial marker (the views align to the window, not this div)
        2. A CSS layout element that shrinks when sidebar opens
        3. A mount point for future DOM-based overlays
      */}
      <div
        className="w-full h-full"
        data-webview-container
        data-active-tab={activeTabId}
      />
      {isLoading && <LoadingScreen loadProgress={loadProgress} />}
    </div>
  );
};

export default WebViewContainer;
