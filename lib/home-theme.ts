import { brand, gray } from './colors';

/**
 * Mode-aware home dashboard theme built from Apple Action Blue + neutral grey palette.
 *
 * Banner:  Action Blue gradient
 * Cards:   four shades across the brand blue spectrum
 */

export interface HomeTheme {
  banner: {
    gradient: string;
    overline: string;
    subtitle: string;
  };
  card: {
    bg: string;
    border: string;
    shadow: string;
  };
  accents: {
    activeTrips: string;
    upcomingTrips: string;
    nextAdventure: string;
    totalTrips: string;
    footprint: string;
    history: string;
  };
  secondaryText: string;
  glass: string;
  progressTrack: string;
  chip: string;
  chipBorder: string;
}

export function getHomeTheme(mode: 'light' | 'dark'): HomeTheme {
  const light = mode === 'light';

  const accents = {
    activeTrips:   brand[400],
    upcomingTrips: brand[300],
    nextAdventure: brand[600],
    totalTrips:    brand[700],
    footprint:     brand[400],
    history:       brand[300],
  };

  return {
    banner: {
      gradient: `linear-gradient(135deg, ${brand[700]} 0%, ${brand[400]} 45%, ${brand[300]} 100%)`,
      overline: 'rgba(255,255,255,0.75)',
      subtitle: 'rgba(255,255,255,0.9)',
    },
    card: {
      bg:     light ? '#ffffff'               : gray[800],
      border: light ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.07)',
      shadow: light ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
    },
    accents,
    secondaryText: light ? 'rgba(0,0,0,0.48)' : 'rgba(255,255,255,0.5)',
    glass:         light ? 'rgba(0,0,0,0.03)'  : 'rgba(255,255,255,0.05)',
    progressTrack: light ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.1)',
    chip:          `${brand[400]}18`,
    chipBorder:    `${brand[400]}44`,
  };
}
