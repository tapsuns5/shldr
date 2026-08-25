import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorMode } from './theme';

const STORAGE_KEY = 'shldr-color-mode';

type StoredMode = ColorMode | 'system';

interface ColorModeContextValue {
  mode: ColorMode;
  preference: StoredMode;
  setPreference: (mode: StoredMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

/** Mirrors web's ThemeProviderWrapper: a mode toggle persisted across launches, defaulting to system. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<StoredMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((next: StoredMode) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const mode: ColorMode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  if (!loaded) return null;

  return (
    <ColorModeContext.Provider value={{ mode, preference, setPreference }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}
