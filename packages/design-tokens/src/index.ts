export * from './colors';

export type ColorMode = 'light' | 'dark';

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const spacing = (multiplier: number) => multiplier * 8;

export const fontFamily = {
  sans: 'Inter',
};
