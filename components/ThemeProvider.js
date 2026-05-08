'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'yeuhoc-theme';
const THEMES = new Set(['light', 'dark']);

const ThemeContext = createContext(null);

function getDefaultTheme(pathname) {
  return pathname?.startsWith('/admin') ? 'dark' : 'light';
}

function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.has(stored) ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const nextTheme = getStoredTheme() || getDefaultTheme(pathname);
    applyTheme(nextTheme);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setThemeState(nextTheme);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const nextTheme = THEMES.has(event.newValue) ? event.newValue : getDefaultTheme(window.location.pathname);
      applyTheme(nextTheme);
      setThemeState(nextTheme);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((nextTheme) => {
    const normalized = THEMES.has(nextTheme) ? nextTheme : 'light';
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Keep the in-memory theme even if storage is unavailable.
    }
    applyTheme(normalized);
    setThemeState(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
  }), [setTheme, theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}

export const themeInitScript = `
(function () {
  try {
    var key = 'yeuhoc-theme';
    var stored = window.localStorage.getItem(key);
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.location.pathname.indexOf('/admin') === 0 ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;
