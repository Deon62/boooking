// Light / dark theme, mirroring the b2b dashboard's themeStore: the whole UI
// is driven by CSS custom properties, so a theme is just a `data-theme`
// attribute on <html> that swaps the token values (see the
// [data-theme='dark'] block in index.css).
//
// Per-device preference (localStorage), light-first to match the brand.

import { useSyncExternalStore } from 'react';

const KEY = 'ardena-theme';

// Keep the browser chrome (mobile address bar) in step with the page bg.
const THEME_COLOR = { light: '#f4f5f7', dark: '#25272c' };

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* storage blocked — fall through to default */
  }
  return 'light';
}

let theme = readSaved();
const listeners = new Set();

export function getTheme() {
  return theme;
}

export function applyTheme() {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
}

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme();
  listeners.forEach((fn) => fn());
}

/** React hook: current theme, re-renders on toggle. */
export function useTheme() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => theme
  );
}
