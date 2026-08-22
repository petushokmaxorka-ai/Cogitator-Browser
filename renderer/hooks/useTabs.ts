// ═══ useTabs ═══
/**
 * Custom hook for managing browser tabs in the COGITATOR BROWSER.
 * Handles tab creation, closing, switching, navigation, and listens to
 * real-time tab updates broadcast from the Electron main process.
 *
 * In the Dark Mechanicus, each tab is a viewport into the noospheric data-streams.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Tab } from '../../shared/types';

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface UseTabsReturn {
  /** All open tabs */
  tabs: Tab[];
  /** The currently active (focused) tab */
  activeTab: Tab | null;
  /** ID of the active tab */
  activeTabId: string | null;
  /** Open a new tab */
  createTab: (url?: string) => Promise<void>;
  /** Close a tab by its ID */
  closeTab: (id: string) => Promise<void>;
  /** Switch focus to a specific tab */
  switchTab: (id: string) => Promise<void>;
  /** Navigate the active tab to a URL */
  navigate: (url: string) => Promise<void>;
  /** Go back in the active tab's history */
  goBack: () => Promise<void>;
  /** Go forward in the active tab's history */
  goForward: () => Promise<void>;
  /** Reload the active tab */
  reload: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

const useTabs = (): UseTabsReturn => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // ── Tab Lifecycle ──────────────────────────────────────────────────────────

  const createTab = useCallback(async (url?: string): Promise<void> => {
    try {
      await window.electronAPI.tabs.create(url);
    } catch (error) {
      console.error('[useTabs] createTab error:', error);
    }
  }, []);

  const closeTab = useCallback(async (id: string): Promise<void> => {
    try {
      await window.electronAPI.tabs.close(id);
    } catch (error) {
      console.error('[useTabs] closeTab error:', error);
    }
  }, []);

  const switchTab = useCallback(async (id: string): Promise<void> => {
    try {
      await window.electronAPI.tabs.switch(id);
    } catch (error) {
      console.error('[useTabs] switchTab error:', error);
    }
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigate = useCallback(async (url: string): Promise<void> => {
    if (!activeTabId) return;
    try {
      await window.electronAPI.tabs.navigate(activeTabId, url);
    } catch (error) {
      console.error('[useTabs] navigate error:', error);
    }
  }, [activeTabId]);

  const goBack = useCallback(async (): Promise<void> => {
    if (!activeTabId) return;
    try {
      await window.electronAPI.tabs.goBack(activeTabId);
    } catch (error) {
      console.error('[useTabs] goBack error:', error);
    }
  }, [activeTabId]);

  const goForward = useCallback(async (): Promise<void> => {
    if (!activeTabId) return;
    try {
      await window.electronAPI.tabs.goForward(activeTabId);
    } catch (error) {
      console.error('[useTabs] goForward error:', error);
    }
  }, [activeTabId]);

  const reload = useCallback(async (): Promise<void> => {
    if (!activeTabId) return;
    try {
      await window.electronAPI.tabs.reload(activeTabId);
    } catch (error) {
      console.error('[useTabs] reload error:', error);
    }
  }, [activeTabId]);

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Load initial tab state */
  useEffect(() => {
    let cancelled = false;

    const loadTabs = async (): Promise<void> => {
      try {
        const allTabs = await window.electronAPI.tabs.getAll();
        const active = await window.electronAPI.tabs.getActive();

        if (cancelled) return;

        setTabs(allTabs);
        setActiveTab(active);
        setActiveTabId(active?.id ?? null);
      } catch (error) {
        console.error('[useTabs] loadTabs error:', error);
      }
    };

    loadTabs();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Subscribe to real-time tab updates from the main process */
  useEffect(() => {
    const handleUpdate = (updatedTabs: Tab[], activeId: string): void => {
      setTabs(updatedTabs);
      setActiveTabId(activeId);
      const newActive = updatedTabs.find((t) => t.id === activeId) ?? null;
      setActiveTab(newActive);
    };

    const unsubscribe = window.electronAPI.tabs.onUpdate(handleUpdate);
    return () => {
      unsubscribe?.();
    };
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    tabs,
    activeTab,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    navigate,
    goBack,
    goForward,
    reload,
  };
};

export default useTabs;
