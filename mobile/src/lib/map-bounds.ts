import type { LngLatBounds } from '@maplibre/maplibre-react-native';

/** [west, south, east, north] bounding box around a set of lng/lat points, with padding. */
export function boundsFromPoints(points: { lat: number; lng: number }[], padding = 0.5): LngLatBounds | null {
  const valid = points.filter((p) => p.lat !== 0 || p.lng !== 0);
  if (valid.length === 0) return null;

  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);

  return [
    Math.min(...lngs) - padding,
    Math.min(...lats) - padding,
    Math.max(...lngs) + padding,
    Math.max(...lats) + padding,
  ];
}
