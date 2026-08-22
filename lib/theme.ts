import { createTheme, alpha, type Theme, type Shadows } from '@mui/material/styles';
import { inputsCustomizations } from './customizations/inputs';
import { dataDisplayCustomizations } from './customizations/dataDisplay';
import { feedbackCustomizations } from './customizations/feedback';
import { navigationCustomizations } from './customizations/navigation';
import { surfacesCustomizations } from './customizations/surfaces';
import { brand, gray, green, orange, red } from './colors';

export type ColorMode = 'light' | 'dark';

export { brand, gray, green, orange, red };

const defaultTheme = createTheme();

export function getTheme(mode: ColorMode): Theme {
  const isDark = mode === 'dark';
  const customShadows: Shadows = [...defaultTheme.shadows];
  customShadows[1] = isDark
    ? 'none'
    : 'rgba(0, 0, 0, 0.04) 0 1px 2px 0';

  return createTheme({
    palette: {
      mode,
      primary: {
        light: brand[200],
        main: brand[400],
        dark: brand[700],
        contrastText: brand[50],
        ...(isDark && {
          contrastText: brand[50],
          light: brand[300],
          main: brand[400],
          dark: brand[700],
        }),
      },
      info: {
        light: brand[100],
        main: brand[300],
        dark: brand[600],
        contrastText: gray[50],
        ...(isDark && {
          contrastText: brand[300],
          light: brand[500],
          main: brand[700],
          dark: brand[900],
        }),
      },
      warning: {
        light: orange[300],
        main: orange[400],
        dark: orange[800],
        ...(isDark && {
          light: orange[400],
          main: orange[500],
          dark: orange[700],
        }),
      },
      error: {
        light: red[300],
        main: red[400],
        dark: red[800],
        ...(isDark && {
          light: red[400],
          main: red[500],
          dark: red[700],
        }),
      },
      success: {
        light: green[300],
        main: green[400],
        dark: green[800],
        ...(isDark && {
          light: green[400],
          main: green[500],
          dark: green[700],
        }),
      },
      grey: { ...gray },
      divider: isDark ? alpha(gray[700], 0.6) : alpha(gray[300], 0.4),
      background: {
        default: '#f3faf9',
        paper: '#e5f0e5',
        ...(isDark && { default: '#000902', paper: '#151917' }),
      },
      text: {
        primary: gray[800],
        secondary: gray[600],
        ...(isDark && { primary: 'hsl(0, 0%, 100%)', secondary: gray[400] }),
      },
      action: {
        hover: alpha(gray[200], 0.2),
        selected: alpha(gray[200], 0.3),
        ...(isDark && {
          hover: alpha(gray[600], 0.2),
          selected: alpha(gray[600], 0.3),
        }),
      },
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      h1: {
        fontSize: defaultTheme.typography.pxToRem(56),
        fontWeight: 600,
        lineHeight: 1.07,
        letterSpacing: '-0.28px',
      },
      h2: {
        fontSize: defaultTheme.typography.pxToRem(40),
        fontWeight: 600,
        lineHeight: 1.1,
        letterSpacing: 0,
      },
      h3: {
        fontSize: defaultTheme.typography.pxToRem(34),
        fontWeight: 600,
        lineHeight: 1.47,
        letterSpacing: '-0.374px',
      },
      h4: {
        fontSize: defaultTheme.typography.pxToRem(28),
        fontWeight: 400,
        lineHeight: 1.14,
        letterSpacing: '0.196px',
      },
      h5: {
        fontSize: defaultTheme.typography.pxToRem(21),
        fontWeight: 600,
        lineHeight: 1.19,
        letterSpacing: '0.231px',
      },
      h6: {
        fontSize: defaultTheme.typography.pxToRem(17),
        fontWeight: 600,
        lineHeight: 1.24,
        letterSpacing: '-0.374px',
      },
      subtitle1: {
        fontSize: defaultTheme.typography.pxToRem(17),
        fontWeight: 600,
        lineHeight: 1.24,
        letterSpacing: '-0.374px',
      },
      subtitle2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 600,
        lineHeight: 1.29,
        letterSpacing: '-0.224px',
      },
      body1: {
        fontSize: defaultTheme.typography.pxToRem(17),
        fontWeight: 400,
        lineHeight: 1.47,
        letterSpacing: '-0.374px',
      },
      body2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 400,
        lineHeight: 1.43,
        letterSpacing: '-0.224px',
      },
      caption: {
        fontSize: defaultTheme.typography.pxToRem(12),
        fontWeight: 400,
        lineHeight: 1.0,
        letterSpacing: '-0.12px',
      },
      button: {
        fontSize: defaultTheme.typography.pxToRem(17),
        fontWeight: 400,
        lineHeight: 1.47,
        letterSpacing: '-0.374px',
        textTransform: 'none' as const,
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: customShadows,
    components: {
      ...inputsCustomizations,
      ...dataDisplayCustomizations,
      ...feedbackCustomizations,
      ...navigationCustomizations,
      ...surfacesCustomizations,
      MuiCssBaseline: {
        styleOverrides: {
          // Style the Google Places Autocomplete dropdown (rendered outside
          // of React, directly on document.body) to match the app theme.
          '.pac-container': {
            zIndex: 1500,
            marginTop: 4,
            padding: 4,
            border: `1px solid ${isDark ? alpha(gray[700], 0.6) : alpha(gray[300], 0.4)}`,
            borderRadius: 12,
            boxShadow: isDark
              ? 'rgba(0, 0, 0, 0.5) 0 4px 16px 0'
              : 'rgba(0, 0, 0, 0.08) 0 4px 16px 0',
            backgroundColor: isDark ? gray[800] : '#ffffff',
            backgroundImage: 'none',
            fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          },
          '.pac-item': {
            border: 'none',
            borderRadius: 8,
            margin: '1px 0',
            padding: '8px 12px',
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            color: isDark ? gray[100] : gray[800],
            cursor: 'pointer',
          },
          '.pac-item:hover, .pac-item-selected, .pac-item-selected:hover': {
            backgroundColor: isDark ? alpha(gray[600], 0.3) : alpha(gray[200], 0.5),
          },
          '.pac-item-query': {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: isDark ? '#ffffff' : gray[900],
          },
          '.pac-matched': {
            fontWeight: 700,
            color: isDark ? brand[300] : brand[500],
          },
          '.pac-icon': {
            marginTop: 6,
            filter: isDark ? 'grayscale(1) invert(1) opacity(0.6)' : 'grayscale(1) opacity(0.5)',
          },
          '.pac-logo:after': {
            margin: '4px 8px 2px',
          },
        },
      },
    },
  });
}

export const lightTheme = getTheme('light');
export const darkTheme = getTheme('dark');

