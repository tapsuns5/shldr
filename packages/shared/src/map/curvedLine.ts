/**
 * Mirrors the quadratic-bezier curve generateCurvedLine() in
 * components/map/TripRouteMap.tsx (web). Used for trip-level flight/transit
 * segments, where the already-geocoded from/to points are more accurate than
 * a great-circle built from the static airport table (that's what
 * buildFlightRoute in ./arcRoutes is for — the account-level map).
 */
export function generateCurvedLine(
  fromLngLat: [number, number],
  toLngLat: [number, number],
  offsetFactor = 0.12,
  numPoints = 64
): GeoJSON.LineString {
  const [lng1, lat1] = fromLngLat;
  const [lng2, lat2] = toLngLat;

  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.5) {
    return { type: 'LineString', coordinates: [fromLngLat, toLngLat] };
  }

  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  const normX = -dy / dist;
  const normY = dx / dist;

  const offset = dist * offsetFactor;
  const ctrlLng = midLng + normX * offset;
  const ctrlLat = midLat + normY * offset;

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
    const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
    coordinates.push([lng, lat]);
  }

  return { type: 'LineString', coordinates };
}
