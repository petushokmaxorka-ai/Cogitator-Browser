// ═══════════════════════════════════════════════════════════
// App.tsx — Root Component
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import TitleBar from './components/chrome/TitleBar';
import AddressBar from './components/chrome/AddressBar';
import TabBar from './components/chrome/TabBar';
import Navigation from './components/chrome/Navigation';
import FindBar from './components/chrome/FindBar';
import AdBlockCounter from './components/chrome/AdBlockCounter';
import WebViewContainer from './components/webview/WebViewContainer';
import { SplitView } from './components/split';
import { BookmarkTree } from './components/bookmarks';
import Sidebar, { TabContent as SidebarTabContent } from './components/sidebar/Sidebar';
import { ReaderMode } from './components/reader';
import { PDFViewer } from './components/pdf';
import { ScreenshotTool } from './components/screenshot';
import { StickyNotesOverlay } from './components/stickynotes/StickyNotes';
import { useTabs, useBookmarks, useHistory, useDownloads, useVoiceSearch } from './hooks';
import { dispatchChatPrefill } from './lib/chat-bridge';
import { dispatchEditorOpenFile, onEditorOpenRequest } from './lib/editor-bridge';
import type { SidebarTab } from '../shared/types';
import './styles/theme.css';
import './styles/crt.css';
import './styles/scanlines.css';
import './styles/glow.css';
import './styles/mechanicus.css';
import './styles/gold-mechanicus.css';

// ── Types ──────────────────────────────────────────────────

interface SplitViewState {
  enabled: boolean;
  primaryTabId: string | null;
  secondaryTabId: string | null;
}

function App() {
  // ═══ Sidebar States ═══
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookmarkTreeOpen, setBookmarkTreeOpen] = useState(false);

  // ═══ Split View State ═══
  const [splitView, setSplitView] = useState<SplitViewState>({
    enabled: false,
    primaryTabId: null,
    secondaryTabId: null,
  });

  // ═══ UI States ═══
  const [findBarVisible, setFindBarVisible] = useState(false);
  const [readerModeActive, setReaderModeActive] = useState(false);
  const [pageReadable, setPageReadable] = useState(false);
  const [pageHtml, setPageHtml] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('browser');
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  // ═══ PiP State ═══
  const [pipState, setPipState] = useState({ active: false, hasVideo: false, video: null as any });
  const [contentFullscreen, setContentFullscreen] = useState(false);


  const zoomLevelRef = useRef(0);

  // ── Hooks ──────────────────────────────────────────────
  const {
    tabs,
    activeTab,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    goBack,
    goForward,
    reload,
  } = useTabs();

  const bookmarks = useBookmarks();
  const history = useHistory();

  // ── Voice Search ─────────────────────────────────────────
  const {
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    error: voiceError,
    supported: voiceSupported,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
    reset: resetVoiceSearch,
  } = useVoiceSearch();

  // ── Track history on navigation ──────────────────────────
  const lastTrackedUrl = useRef<string>('');

  useEffect(() => {
    if (activeTab?.url && activeTab.url !== lastTrackedUrl.current && activeTab.url !== 'about:blank') {
      lastTrackedUrl.current = activeTab.url;
      history.addEntry({
        title: activeTab.title || activeTab.url,
        url: activeTab.url,
        favicon: activeTab.favicon || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.url, activeTab?.title]);

  // ── Voice Search: auto-navigate on transcript complete ───
  // NOTE: handleNavigate is defined below but useEffect runs after render,
  // so the callback will be available by then.
  useEffect(() => {
    if (!isVoiceListening && voiceTranscript.trim()) {
      // Small delay to let the final transcript settle
      const timer = setTimeout(() => {
        // Navigate via electron API directly to avoid dependency ordering issues
        if (activeTabId) {
          window.electronAPI?.tabs?.navigate?.(activeTabId, voiceTranscript.trim());
        }
        resetVoiceSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceListening, voiceTranscript, activeTabId, resetVoiceSearch]);

  // ── Voice Search Error Logging ───────────────────────────
  useEffect(() => {
    if (voiceError) {
      console.warn('[VoiceSearch]', voiceError);
    }
  }, [voiceError]);

  // ── PDF Detection: show PDF viewer for .pdf URLs ─────────
  useEffect(() => {
    const url = activeTab?.url ?? '';
    if (url.endsWith('.pdf') || url.includes('.pdf?')) {
      setActivePdfUrl(url);
    } else {
      setActivePdfUrl(null);
    }
  }, [activeTab?.url]);

  // ── Reader Mode: close when tab changes ──────────────────
  useEffect(() => {
    setReaderModeActive(false);
    setPageHtml(null);
  }, [activeTabId, activeTab?.url]);

  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      const url = activeTab?.url ?? '';
      if (!url || url.startsWith('cogitator://')) {
        if (!cancelled) setPageReadable(false);
        return;
      }
      if (/^https?:\/\//i.test(url)) {
        if (!cancelled) setPageReadable(true);
        return;
      }
      try {
        const res = await window.electronAPI?.reader?.detect?.();
        if (!cancelled) setPageReadable(!!res?.readable);
      } catch {
        if (!cancelled) setPageReadable(false);
      }
    };
    void detect();
    return () => {
      cancelled = true;
    };
  }, [activeTabId, activeTab?.url]);

  // ── Zoom Handling ──────────────────────────────────────
  const adjustZoom = useCallback((delta: number) => {
    const newLevel = zoomLevelRef.current + delta;
    zoomLevelRef.current = newLevel;
    if (window.electronAPI?.zoom?.set) {
      window.electronAPI.zoom.set(newLevel);
    }
  }, []);

  const resetZoom = useCallback(() => {
    zoomLevelRef.current = 0;
    if (window.electronAPI?.zoom?.set) {
      window.electronAPI.zoom.set(0);
    }
  }, []);

  // ── Global Keyboard Shortcuts ──────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      switch (e.key) {
        case 'f':
          e.preventDefault();
          setFindBarVisible((prev) => !prev);
          break;
        case 's':
          if (e.shiftKey) {
            e.preventDefault();
            setScreenshotOpen(true);
          }
          break;
        case '=':
        case '+':
          e.preventDefault();
          adjustZoom(0.5);
          break;
        case '-':
        case '_':
          e.preventDefault();
          adjustZoom(-0.5);
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustZoom, resetZoom]);

  // ── Reader Mode Handlers ───────────────────────────────
  const handleToggleReaderMode = useCallback(async () => {
    if (readerModeActive) {
      setReaderModeActive(false);
      setPageHtml(null);
      return;
    }

    // Fetch real page HTML from the active tab via IPC
    try {
      setReaderModeActive(true);
      const html = await window.electronAPI?.reader?.getHTML?.() ?? '';
      if (html) {
        setPageHtml(html);
      } else {
        setReaderModeActive(false);
        setPageHtml(null);
      }
    } catch (err) {
      console.warn('[ReaderMode] Failed to extract content:', err);
      setReaderModeActive(false);
      setPageHtml(null);
    }
  }, [readerModeActive]);

  // ── Screenshot Handler ─────────────────────────────────
  const handleScreenshot = useCallback(() => {
    setScreenshotOpen(true);
  }, []);

  // ── Session Restore Handler ────────────────────────────
  const handleRestoreSession = useCallback((urls: string[]) => {
    urls.forEach((url, index) => {
      if (index === 0 && activeTabId) {
        // Navigate in current tab
        window.electronAPI?.tabs?.navigate?.(activeTabId, url);
      } else {
        // Create new tabs for remaining URLs
        setTimeout(() => {
          window.electronAPI?.tabs?.create?.(url);
        }, index * 100);
      }
    });
  }, [activeTabId]);

  // ── Handlers ───────────────────────────────────────────

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const openAiChat = useCallback((query: string, autoSend = true) => {
    setSidebarOpen(true);
    setActiveSidebarTab('browser');
    window.setTimeout(() => {
      dispatchChatPrefill({ query, autoSend });
    }, 150);
  }, []);

  useEffect(() => {
    const unsub = window.electronAPI?.anathemetron?.onSearch?.((text: string) => {
      if (text.trim()) {
        openAiChat(text.trim(), true);
      }
    });
    return () => {
      unsub?.();
    };
  }, [openAiChat]);

  useEffect(() => {
    return onEditorOpenRequest((path) => {
      setSidebarOpen(true);
      setActiveSidebarTab('editor');
      window.setTimeout(() => {
        dispatchEditorOpenFile(path);
      }, 150);
    });
  }, []);

  const toggleBookmarkTree = useCallback(() => {
    setBookmarkTreeOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (url: string) => {
      if (activeTabId) {
        window.electronAPI?.tabs?.navigate?.(activeTabId, url);
      } else {
        window.electronAPI?.tabs?.create?.(url);
      }
    },
    [activeTabId],
  );

  // ── Split View Handlers ────────────────────────────────

  const handleEnableSplitView = useCallback((secondaryTabId: string) => {
    setSplitView({
      enabled: true,
      primaryTabId: activeTabId,
      secondaryTabId,
    });
  }, [activeTabId]);

  const handleCloseSplitView = useCallback(() => {
    setSplitView({
      enabled: false,
      primaryTabId: null,
      secondaryTabId: null,
    });
  }, []);

  const handleNavigatePrimary = useCallback((url: string) => {
    if (splitView.primaryTabId) {
      window.electronAPI?.tabs?.navigate?.(splitView.primaryTabId, url);
    }
  }, [splitView.primaryTabId]);

  const handleNavigateSecondary = useCallback((url: string) => {
    if (splitView.secondaryTabId) {
      window.electronAPI?.tabs?.navigate?.(splitView.secondaryTabId, url);
    }
  }, [splitView.secondaryTabId]);

  const handleToggleSplitView = useCallback(() => {
    if (splitView.enabled) {
      handleCloseSplitView();
    } else {
      // Enable split view with current tab as primary
      // Try to use the second tab as secondary if available
      const otherTab = tabs.find((t) => t.id !== activeTabId);
      if (otherTab) {
        setSplitView({
          enabled: true,
          primaryTabId: activeTabId,
          secondaryTabId: otherTab.id,
        });
      } else {
        // No other tab — enable with empty secondary
        setSplitView({
          enabled: true,
          primaryTabId: activeTabId,
          secondaryTabId: null,
        });
      }
    }
  }, [splitView.enabled, activeTabId, tabs, handleCloseSplitView]);

  const handleCreateTab = useCallback(() => {
    createTab();
  }, [createTab]);

  const handleCloseTab = useCallback(
    (id: string) => {
      closeTab(id);
      // If closing a tab in split view, update split view
      if (splitView.enabled) {
        if (id === splitView.primaryTabId) {
          handleCloseSplitView();
        } else if (id === splitView.secondaryTabId) {
          setSplitView((prev) => ({ ...prev, secondaryTabId: null }));
        }
      }
    },
    [closeTab, splitView, handleCloseSplitView],
  );

  const handleSwitchTab = useCallback(
    (id: string) => {
      switchTab(id);
      // If in split view, update primary to the switched tab
      if (splitView.enabled) {
        setSplitView((prev) => ({
          ...prev,
          primaryTabId: id,
        }));
      }
    },
    [switchTab, splitView.enabled],
  );

  // ── Tab Context Menu Handler ───────────────────────────
  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      // Create a simple context menu
      const menuItems = [
        {
          label: 'Open in Split View',
          action: () => handleEnableSplitView(tabId),
        },
        {
          label: 'Close Tab',
          action: () => handleCloseTab(tabId),
        },
      ];

      // Render a simple inline context menu
      const menu = document.createElement('div');
      menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: var(--iron-dark, #1E1E1E);
        border: 1px solid var(--omnissiah-red, #FF0000);
        box-shadow: 0 4px 20px rgba(255, 0, 0, 0.15);
        z-index: 9999;
        min-width: 160px;
        padding: 4px 0;
        font-family: 'Courier New', monospace;
      `;

      menuItems.forEach((item) => {
        const button = document.createElement('button');
        button.textContent = item.label;
        button.style.cssText = `
          display: block;
          width: 100%;
          padding: 6px 12px;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--parchment, #D4C5A0);
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.1s;
        `;
        button.onmouseenter = () => {
          button.style.background = 'rgba(255, 0, 0, 0.1)';
          button.style.color = 'var(--cogitator-gold, #C8A84B)';
        };
        button.onmouseleave = () => {
          button.style.background = 'transparent';
          button.style.color = 'var(--parchment, #D4C5A0)';
        };
        button.onclick = () => {
          item.action();
          document.body.removeChild(menu);
        };
        menu.appendChild(button);
      });

      document.body.appendChild(menu);

      const closeMenu = () => {
        if (menu.parentNode) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('keydown', closeMenuKey);
      };

      const closeMenuKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') closeMenu();
      };

      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', closeMenuKey);
      }, 0);
    },
    [handleEnableSplitView, handleCloseTab],
  );

  const handleToggleBookmark = useCallback(() => {
    if (activeTab) {
      bookmarks.toggleBookmark(
        activeTab.title || activeTab.url,
        activeTab.url,
        activeTab.favicon || ''
      );
    }
  }, [activeTab, bookmarks]);

  const handleVoiceSearchToggle = useCallback(() => {
    if (isVoiceListening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  }, [isVoiceListening, startVoiceListening, stopVoiceListening]);

  // ── PiP Handlers ───────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.pip?.onStateChange) return;
    const unsubscribe = window.electronAPI.pip.onStateChange((state: any) => {
      setPipState({
        active: state?.active ?? false,
        hasVideo: state?.hasVideo ?? false,
        video: state?.video ?? null,
      });
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    const onChange = window.electronAPI?.window?.onContentFullscreenChange;
    if (!onChange) return;
    const unsubscribe = onChange((active: boolean) => {
      setContentFullscreen(active);
      if (active) setSidebarOpen(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleTogglePiP = useCallback(() => {
    window.electronAPI?.pip?.toggle?.();
  }, []);

  const handleFindBarClose = useCallback(() => {
    setFindBarVisible(false);
  }, []);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={`app-container crt-overlay${contentFullscreen ? ' app-container--content-fullscreen' : ''}`}>
      {/* CRT Scanline overlay */}
      <div className="scanlines" />
      <div className="crt-flicker" />
      <div className="scan-line" />

      {/* Top Chrome */}
      <div className="chrome-area">
        <div className="chrome-red-flicker" aria-hidden="true">
          <div className="red-band b1" />
          <div className="red-band b2" />
          <div className="red-band b3" />
        </div>
        <TitleBar />
        <div className="toolbar-row">
          <Navigation
            canGoBack={activeTab?.canGoBack ?? false}
            canGoForward={activeTab?.canGoForward ?? false}
            isLoading={activeTab?.isLoading ?? false}
            onGoBack={goBack}
            onGoForward={goForward}
            onReload={reload}
          />
          <div className="toolbar-address">
            <AddressBar
            url={activeTab?.url ?? ''}
            title={activeTab?.title ?? ''}
            favicon={activeTab?.favicon ?? ''}
            onNavigate={handleNavigate}
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            isBookmarked={bookmarks.isBookmarked(activeTab?.url ?? '')}
            onToggleBookmark={handleToggleBookmark}
            isReadable={pageReadable}
            onToggleReaderMode={handleToggleReaderMode}
            readerModeActive={readerModeActive}
            onVoiceSearch={handleVoiceSearchToggle}
            isVoiceListening={isVoiceListening}
            voiceTranscript={voiceTranscript}
            voiceSupported={voiceSupported}
            bookmarkTreeOpen={bookmarkTreeOpen}
            onToggleBookmarkTree={toggleBookmarkTree}
            splitViewEnabled={splitView.enabled}
            onToggleSplitView={handleToggleSplitView}
            onScreenshot={handleScreenshot}
            pipActive={pipState.active}
            pipAvailable={pipState.hasVideo}
            onTogglePiP={handleTogglePiP}
            onOpenAiChat={(query, autoSend) => openAiChat(query, autoSend ?? true)}
            />
          </div>
          <AdBlockCounter />
        </div>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onCreateTab={handleCreateTab}
          onCloseTab={handleCloseTab}
          onSwitchTab={handleSwitchTab}
          onContextMenu={handleTabContextMenu}
        />
      </div>

      {/* ═══ Main Content Area ═══ */}
      <div className="content-area" style={{ position: 'relative', display: 'flex', flexDirection: 'row' }}>
        {/* Bookmark Tree Sidebar (left of content, like Opera) */}
        <BookmarkTree
          onNavigate={handleNavigate}
          onCreateTab={handleCreateTab}
          isOpen={bookmarkTreeOpen}
          onToggle={toggleBookmarkTree}
        />

        {/* FindBar overlay */}
        <FindBar
          activeTabId={activeTabId}
          visible={findBarVisible}
          onClose={handleFindBarClose}
        />

        {/* ═══ Content: Split View or Normal WebView ═══ */}
        {splitView.enabled ? (
          <SplitView
            primaryTabId={splitView.primaryTabId}
            secondaryTabId={splitView.secondaryTabId}
            sidebarOpen={sidebarOpen}
            onClose={handleCloseSplitView}
            onNavigatePrimary={handleNavigatePrimary}
            onNavigateSecondary={handleNavigateSecondary}
          />
        ) : (
          <WebViewContainer
            activeTabId={activeTabId}
            activeTabUrl={activeTab?.url ?? null}
            sidebarOpen={sidebarOpen}
            isLoading={activeTab?.isLoading ?? false}
            loadProgress={activeTab?.loadProgress ?? 0}
            onNavigate={handleNavigate}
          />
        )}

        {/* Reader Mode Overlay */}
        {readerModeActive && pageHtml && (
          <ReaderMode
            html={pageHtml}
            url={activeTab?.url ?? ''}
            onClose={() => {
              setReaderModeActive(false);
              setPageHtml(null);
            }}
          />
        )}

        {/* PDF Viewer Overlay */}
        {activePdfUrl && (
          <PDFViewer
            url={activePdfUrl}
            onClose={() => setActivePdfUrl(null)}
          />
        )}

        {/* ═══ Screenshot Tool Overlay ═══ */}
        {screenshotOpen && (
          <ScreenshotTool onClose={() => setScreenshotOpen(false)} />
        )}

        {/* AI Sidebar (right side) */}
        {sidebarOpen && (
          <div className="sidebar-panel" style={{ display: 'flex', flexDirection: 'row', width: 'auto' }}>
            <Sidebar
              activeTab={activeSidebarTab}
              onTabChange={setActiveSidebarTab}
            />
            <div style={{ flex: 1, width: '100%', overflow: 'auto', minWidth: 0 }}>
              <SidebarTabContent activeTab={activeSidebarTab} browserTab={activeTab ?? null} />
            </div>
          </div>
        )}

        {/* ═══ Sticky Notes Overlay ═══ */}
        <StickyNotesOverlay />
      </div>
    </div>
  );
}

export default App;
