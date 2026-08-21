// ═══ USE BOOKMARKS ═══
// Data persistence for the sacred bookmarks of the Machine God.
// Storage: localStorage key "cogitator_bookmarks"

import { useState, useCallback, useEffect } from 'react';
import type { BookmarkTreeItem } from '../components/bookmarks/BookmarkTree';

// ── Types ───────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon: string;
  folder: string;
  createdAt: number;
}

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  folders: string[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;
  toggleBookmark: (title: string, url: string, favicon: string) => void;
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_bookmarks';
const TREE_KEY = 'cogitator_bookmark_tree';

// ── Helper: generate unique ID ──────────────────────────────

const generateId = (): string => {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ── Helper: flatten tree to bookmarks ───────────────────────

const flattenTree = (items: BookmarkTreeItem[]): Bookmark[] => {
  const result: Bookmark[] = [];
  const walk = (list: BookmarkTreeItem[]) => {
    for (const item of list) {
      if (item.type === 'bookmark' && item.url) {
        result.push({
          id: item.id,
          title: item.title,
          url: item.url,
          favicon: item.favicon || '',
          folder: 'general',
          createdAt: Date.now(),
        });
      }
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return result;
};

// ── Helper: load from localStorage ──────────────────────────

const loadBookmarks = (): Bookmark[] => {
  try {
    // Prefer unified tree format (shared with BookmarkTree)
    const treeRaw = localStorage.getItem(TREE_KEY);
    if (treeRaw) {
      const tree = JSON.parse(treeRaw) as BookmarkTreeItem[];
      if (Array.isArray(tree) && tree.length > 0) {
        return flattenTree(tree);
      }
    }
    // Fallback to old flat format
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Bookmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ── Helper: save to localStorage ────────────────────────────

const saveBookmarks = (bookmarks: Bookmark[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (err) {
    console.error('[COGITATOR] Failed to save bookmarks:', err);
  }
};

// ── Hook ────────────────────────────────────────────────────

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);

  // Persist on change
  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  // ── Derived: unique folders ───────────────────────────────

  const folders = Array.from(
    new Set(bookmarks.map((b) => b.folder))
  ).sort();

  // ── Add bookmark ──────────────────────────────────────────

  const addBookmark = useCallback(
    (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: generateId(),
        createdAt: Date.now(),
      };
      setBookmarks((prev) => [newBookmark, ...prev]);
    },
    []
  );

  // ── Remove bookmark ───────────────────────────────────────

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Check if URL is bookmarked ────────────────────────────

  const isBookmarked = useCallback(
    (url: string): boolean => {
      return bookmarks.some((b) => b.url === url);
    },
    [bookmarks]
  );

  // ── Toggle bookmark ───────────────────────────────────────

  const toggleBookmark = useCallback(
    (title: string, url: string, favicon: string) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.url === url);
        if (exists) {
          return prev.filter((b) => b.url !== url);
        }
        const newBookmark: Bookmark = {
          id: generateId(),
          title: title || url,
          url,
          favicon: favicon || '',
          folder: 'general',
          createdAt: Date.now(),
        };
        return [newBookmark, ...prev];
      });
    },
    []
  );

  return {
    bookmarks,
    folders,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}

export default useBookmarks;
