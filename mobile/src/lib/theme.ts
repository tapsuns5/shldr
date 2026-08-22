import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { brand, gray, green, orange, red } from '@shldr/design-tokens';

export type ColorMode = 'light' | 'dark';

/**
 * Maps the same brand/gray/green/orange/red ramps that lib/theme.ts feeds into
 * MUI's createTheme() on web into a react-native-paper MD3 theme, so both
 * clients render the same palette from one source of truth.
 */
export function getMobileTheme(mode: ColorMode): MD3Theme {
  const isDark = mode === 'dark';
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: isDark ? brand[300] : brand[400],
      onPrimary: brand[50],
      primaryContainer: isDark ? brand[800] : brand[100],
      onPrimaryContainer: isDark ? brand[100] : brand[800],
      secondary: isDark ? brand[400] : brand[600],
      background: isDark ? '#000902' : '#f3faf9',
      onBackground: isDark ? '#ffffff' : gray[800],
      surface: isDark ? '#151917' : '#e5f0e5',
      onSurface: isDark ? '#ffffff' : gray[800],
      surfaceVariant: isDark ? '#1d2621' : '#d8e7db',
      onSurfaceVariant: isDark ? gray[400] : gray[600],
      outline: isDark ? gray[700] : gray[300],
      error: isDark ? red[400] : red[400],
      onError: '#ffffff',
      errorContainer: isDark ? red[900] : red[50],
      onErrorContainer: isDark ? red[100] : red[800],
    },
    roundness: 10,
  };
}

export const semanticColors = { brand, gray, green, orange, red };
