export type LocationDisplayMode = 'map' | 'image';

export function getLocationMapUrl(location: string) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!location || !key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(location)}&zoom=11&size=300x300&scale=2&key=${key}`;
}

export function getLocationPhotoUrl(location: string) {
  if (!location) return null;
  return `/api/location-photo?location=${encodeURIComponent(location)}`;
}

export function getLocationImage(location: string, fallbackImage: string, mode: LocationDisplayMode = 'map') {
  if (mode === 'image') {
    return getLocationPhotoUrl(location) || fallbackImage;
  }
  return getLocationMapUrl(location) || fallbackImage;
}
