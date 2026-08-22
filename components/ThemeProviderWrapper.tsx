'use client';

import { createContext, useContext, useSyncExternalStore, useCallback, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, type ColorMode } from '../lib/theme';

interface ThemeContextValue {
  mode: ColorMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggleMode: () => {},
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

const SERVER_MODE: ColorMode = 'light';
const colorModeListeners = new Set<() => void>();

function getColorMode(): ColorMode {
  const stored = localStorage.getItem('color-mode') as ColorMode | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribeColorMode(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => callback();
  media.addEventListener('change', handleChange);
  window.addEventListener('storage', handleChange);
  colorModeListeners.add(callback);
  return () => {
    media.removeEventListener('change', handleChange);
    window.removeEventListener('storage', handleChange);
    colorModeListeners.delete(callback);
  };
}

function setStoredColorMode(mode: ColorMode) {
  localStorage.setItem('color-mode', mode);
  colorModeListeners.forEach((callback) => callback());
}

function useColorMode(): ColorMode {
  return useSyncExternalStore(subscribeColorMode, getColorMode, () => SERVER_MODE);
}

export default function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const mode = useColorMode();

  const toggleMode = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light';
    setStoredColorMode(next);
  }, [mode]);

  const theme = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
