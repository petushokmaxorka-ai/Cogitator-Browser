// ═══ USE HISTORY ═══
// Chronicle of navigations through the Noosphere.
// Storage: localStorage key "cogitator_history", max 1000 entries.

import { useState, useCallback, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  favicon: string;
  timestamp: number;
}

export interface UseHistoryReturn {
  history: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  searchHistory: (query: string) => HistoryEntry[];
  getRecent: (count: number) => HistoryEntry[];
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_history';
const MAX_ENTRIES = 1000;

// ── Helper: generate unique ID ──────────────────────────────

const generateId = (): string => {
  return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ── Helper: load from localStorage ──────────────────────────

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ── Helper: save to localStorage ────────────────────────────

const saveHistory = (history: HistoryEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('[COGITATOR] Failed to save history:', err);
  }
};

// ── Hook ────────────────────────────────────────────────────

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Persist on change
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // ── Add entry ─────────────────────────────────────────────

  const addEntry = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
      setHistory((prev) => {
        // Avoid duplicate consecutive entries for same URL
        if (prev.length > 0 && prev[0].url === entry.url) {
          // Update title if changed
          if (prev[0].title !== entry.title) {
            const updated = [...prev];
            updated[0] = { ...updated[0], title: entry.title };
            return updated;
          }
          return prev;
        }

        const newEntry: HistoryEntry = {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        };

        const next = [newEntry, ...prev];
        // Enforce max limit
        if (next.length > MAX_ENTRIES) {
          return next.slice(0, MAX_ENTRIES);
        }
        return next;
      });
    },
    []
  );

  // ── Clear all history ─────────────────────────────────────

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[COGITATOR] Failed to clear history:', err);
    }
  }, []);

  // ── Search history ────────────────────────────────────────

  const searchHistory = useCallback(
    (query: string): HistoryEntry[] => {
      const lower = query.toLowerCase().trim();
      if (!lower) return history;
      return history.filter(
        (entry) =>
          entry.title.toLowerCase().includes(lower) ||
          entry.url.toLowerCase().includes(lower)
      );
    },
    [history]
  );

  // ── Get recent entries ────────────────────────────────────

  const getRecent = useCallback(
    (count: number): HistoryEntry[] => {
      return history.slice(0, Math.max(1, count));
    },
    [history]
  );

  return {
    history,
    addEntry,
    clearHistory,
    searchHistory,
    getRecent,
  };
}

export default useHistory;
