import type { MapPin } from './deriveMapData';

export interface WishlistMatchInput {
  type: 'city' | 'country';
  city: string | null;
  country: string;
  countryCode: string | null;
}

/**
 * Mirrors shldr's lib/map/wishlistMatcher.ts (web). Determines whether a
 * wishlist destination has already been visited, based on the account's
 * derived trip pins / visited country codes.
 */
export function isWishlistItemVisited(
  item: WishlistMatchInput,
  pins: MapPin[],
  visitedCountryCodes: string[]
): boolean {
  if (item.type === 'country') {
    if (!item.countryCode) return false;
    return visitedCountryCodes.includes(item.countryCode);
  }

  if (!item.city) return false;
  const key = `${item.city}|${item.country}`.toLowerCase();
  return pins.some((p) => `${p.city}|${p.country}`.toLowerCase() === key);
}
