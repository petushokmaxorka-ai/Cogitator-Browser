// ═══ useTheme ═══
/**
 * Custom hook for managing the application theme.
 *
 * COGITATOR BROWSER venerates the Dark Mechanicus — the interface is forged
 * in perpetual darkness. This hook enforces the dark theme as the default,
 * persists user preference to localStorage, and toggles between dark and light
 * modes should the user ever seek the blinding radiance of the Emperor's light.
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface UseThemeReturn {
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Toggle between dark and light themes */
  toggle: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = 'cogitator-theme';

// ─── Hook ───────────────────────────────────────────────────────────────────────

const useTheme = (): UseThemeReturn => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Dark Mechanicus: dark is the sacred default
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      // Default to dark (Dark Mechanicus) when no preference is stored
      return stored === null ? true : stored === 'dark';
    } catch {
      return true;
    }
  });

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Toggle between dark and light themes */
  const toggle = useCallback((): void => {
    setIsDark((prev) => !prev);
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Persist theme preference and apply data attribute to document */
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('[useTheme] Failed to persist theme:', error);
    }

    // Apply theme to the document root for CSS variable / class-based theming
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    isDark,
    toggle,
  };
};

export default useTheme;
