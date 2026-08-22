'use client';

import { useEffect, useState, useMemo } from 'react';
import { buildFlightRoute, type FlightRoute } from '@/lib/map/arcRoutes';
import { getAirportInfo } from '@/lib/map/airportCoords';
import AIRPORT_COORDS from '@/lib/map/airportCoords';
import { isWishlistItemVisited } from '@/lib/map/wishlistMatcher';
import dayjs from 'dayjs';

export interface MapPinTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

export interface MapPin {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  visitCount: number;
  tripIds: string[];
  trips: MapPinTrip[];
}

export interface MapTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  destinations: { city: string; country: string }[];
}

export interface WishlistDestination {
  id: string;
  type: 'city' | 'country';
  city: string | null;
  country: string;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  visitedAt: string | null;
  visited: boolean;
}

export interface TravelMapData {
  pins: MapPin[];
  flightRoutes: FlightRoute[];
  visitedCountryCodes: string[];
  trips: MapTrip[];
  wishlist: WishlistDestination[];
  loading: boolean;
  error: string | null;
}

const COUNTRY_CODE_MAP: Record<string, string> = {
  'United States': 'US',
  'USA': 'US',
  'UK': 'GB',
  'United Kingdom': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'France': 'FR',
  'Germany': 'DE',
  'Italy': 'IT',
  'Spain': 'ES',
  'Portugal': 'PT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Greece': 'GR',
  'Turkey': 'TR',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Hungary': 'HU',
  'Croatia': 'HR',
  'Slovenia': 'SI',
  'Serbia': 'RS',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Japan': 'JP',
  'China': 'CN',
  'South Korea': 'KR',
  'Korea': 'KR',
  'India': 'IN',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Ecuador': 'EC',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Qatar': 'QA',
  'Saudi Arabia': 'SA',
  'Israel': 'IL',
  'Jordan': 'JO',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'South Africa': 'ZA',
  'Kenya': 'KE',
  'Nigeria': 'NG',
  'Ghana': 'GH',
  'Ethiopia': 'ET',
  'Tanzania': 'TZ',
  'Cuba': 'CU',
  'Dominican Republic': 'DO',
  'Puerto Rico': 'PR',
  'Jamaica': 'JM',
  'Costa Rica': 'CR',
  'Panama': 'PA',
  'Guatemala': 'GT',
  'Bahamas': 'BS',
  'Barbados': 'BB',
  'Trinidad and Tobago': 'TT',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Cambodia': 'KH',
  'Laos': 'LA',
  'Myanmar': 'MM',
  'Sri Lanka': 'LK',
  'Nepal': 'NP',
};

export const CITY_COORDS: Record<string, { lat: number; lng: number; countryCode: string }> = {
  'New York': { lat: 40.7128, lng: -74.0060, countryCode: 'US' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, countryCode: 'US' },
  'Chicago': { lat: 41.8781, lng: -87.6298, countryCode: 'US' },
  'Houston': { lat: 29.7604, lng: -95.3698, countryCode: 'US' },
  'Miami': { lat: 25.7617, lng: -80.1918, countryCode: 'US' },
  'San Francisco': { lat: 37.7749, lng: -122.4194, countryCode: 'US' },
  'Seattle': { lat: 47.6062, lng: -122.3321, countryCode: 'US' },
  'Boston': { lat: 42.3601, lng: -71.0589, countryCode: 'US' },
  'Atlanta': { lat: 33.7490, lng: -84.3880, countryCode: 'US' },
  'Dallas': { lat: 32.7767, lng: -96.7970, countryCode: 'US' },
  'Denver': { lat: 39.7392, lng: -104.9903, countryCode: 'US' },
  'Phoenix': { lat: 33.4484, lng: -112.0740, countryCode: 'US' },
  'Las Vegas': { lat: 36.1699, lng: -115.1398, countryCode: 'US' },
  'Orlando': { lat: 28.5383, lng: -81.3792, countryCode: 'US' },
  'Nashville': { lat: 36.1627, lng: -86.7816, countryCode: 'US' },
  'Austin': { lat: 30.2672, lng: -97.7431, countryCode: 'US' },
  'Portland': { lat: 45.5152, lng: -122.6784, countryCode: 'US' },
  'Minneapolis': { lat: 44.9778, lng: -93.2650, countryCode: 'US' },
  'San Diego': { lat: 32.7157, lng: -117.1611, countryCode: 'US' },
  'Philadelphia': { lat: 39.9526, lng: -75.1652, countryCode: 'US' },
  'Washington D.C.': { lat: 38.9072, lng: -77.0369, countryCode: 'US' },
  'Washington, D.C.': { lat: 38.9072, lng: -77.0369, countryCode: 'US' },
  'New Orleans': { lat: 29.9511, lng: -90.0715, countryCode: 'US' },
  'Charlotte': { lat: 35.2271, lng: -80.8431, countryCode: 'US' },
  'Salt Lake City': { lat: 40.7608, lng: -111.8910, countryCode: 'US' },
  'Honolulu': { lat: 21.3069, lng: -157.8583, countryCode: 'US' },
  'London': { lat: 51.5074, lng: -0.1278, countryCode: 'GB' },
  'Paris': { lat: 48.8566, lng: 2.3522, countryCode: 'FR' },
  'Rome': { lat: 41.9028, lng: 12.4964, countryCode: 'IT' },
  'Barcelona': { lat: 41.3851, lng: 2.1734, countryCode: 'ES' },
  'Madrid': { lat: 40.4168, lng: -3.7038, countryCode: 'ES' },
  'Amsterdam': { lat: 52.3676, lng: 4.9041, countryCode: 'NL' },
  'Berlin': { lat: 52.5200, lng: 13.4050, countryCode: 'DE' },
  'Munich': { lat: 48.1351, lng: 11.5820, countryCode: 'DE' },
  'Vienna': { lat: 48.2082, lng: 16.3738, countryCode: 'AT' },
  'Prague': { lat: 50.0755, lng: 14.4378, countryCode: 'CZ' },
  'Budapest': { lat: 47.4979, lng: 19.0402, countryCode: 'HU' },
  'Athens': { lat: 37.9838, lng: 23.7275, countryCode: 'GR' },
  'Istanbul': { lat: 41.0082, lng: 28.9784, countryCode: 'TR' },
  'Lisbon': { lat: 38.7223, lng: -9.1393, countryCode: 'PT' },
  'Dublin': { lat: 53.3498, lng: -6.2603, countryCode: 'IE' },
  'Copenhagen': { lat: 55.6761, lng: 12.5683, countryCode: 'DK' },
  'Stockholm': { lat: 59.3293, lng: 18.0686, countryCode: 'SE' },
  'Oslo': { lat: 59.9139, lng: 10.7522, countryCode: 'NO' },
  'Brussels': { lat: 50.8503, lng: 4.3517, countryCode: 'BE' },
  'Zurich': { lat: 47.3769, lng: 8.5417, countryCode: 'CH' },
  'Geneva': { lat: 46.2044, lng: 6.1432, countryCode: 'CH' },
  'Milan': { lat: 45.4654, lng: 9.1859, countryCode: 'IT' },
  'Venice': { lat: 45.4408, lng: 12.3155, countryCode: 'IT' },
  'Florence': { lat: 43.7696, lng: 11.2558, countryCode: 'IT' },
  'Tokyo': { lat: 35.6762, lng: 139.6503, countryCode: 'JP' },
  'Osaka': { lat: 34.6937, lng: 135.5023, countryCode: 'JP' },
  'Seoul': { lat: 37.5665, lng: 126.9780, countryCode: 'KR' },
  'Beijing': { lat: 39.9042, lng: 116.4074, countryCode: 'CN' },
  'Shanghai': { lat: 31.2304, lng: 121.4737, countryCode: 'CN' },
  'Hong Kong': { lat: 22.3193, lng: 114.1694, countryCode: 'HK' },
  'Singapore': { lat: 1.3521, lng: 103.8198, countryCode: 'SG' },
  'Bangkok': { lat: 13.7563, lng: 100.5018, countryCode: 'TH' },
  'Dubai': { lat: 25.2048, lng: 55.2708, countryCode: 'AE' },
  'Sydney': { lat: -33.8688, lng: 151.2093, countryCode: 'AU' },
  'Melbourne': { lat: -37.8136, lng: 144.9631, countryCode: 'AU' },
  'Toronto': { lat: 43.6532, lng: -79.3832, countryCode: 'CA' },
  'Vancouver': { lat: 49.2827, lng: -123.1207, countryCode: 'CA' },
  'Montreal': { lat: 45.5017, lng: -73.5673, countryCode: 'CA' },
  'Mexico City': { lat: 19.4326, lng: -99.1332, countryCode: 'MX' },
  'Cancun': { lat: 21.1619, lng: -86.8515, countryCode: 'MX' },
  'São Paulo': { lat: -23.5505, lng: -46.6333, countryCode: 'BR' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, countryCode: 'BR' },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816, countryCode: 'AR' },
  'Bogotá': { lat: 4.7110, lng: -74.0721, countryCode: 'CO' },
  'Lima': { lat: -12.0464, lng: -77.0428, countryCode: 'PE' },
  'Santiago': { lat: -33.4489, lng: -70.6693, countryCode: 'CL' },
  'Cairo': { lat: 30.0444, lng: 31.2357, countryCode: 'EG' },
  'Nairobi': { lat: -1.2921, lng: 36.8219, countryCode: 'KE' },
  'Cape Town': { lat: -33.9249, lng: 18.4241, countryCode: 'ZA' },
  'Johannesburg': { lat: -26.2041, lng: 28.0473, countryCode: 'ZA' },
  'Marrakech': { lat: 31.6295, lng: -7.9811, countryCode: 'MA' },
  'Casablanca': { lat: 33.5731, lng: -7.5898, countryCode: 'MA' },
  'Punta Cana': { lat: 18.5601, lng: -68.3725, countryCode: 'DO' },
  'San Juan': { lat: 18.4655, lng: -66.1057, countryCode: 'PR' },
  'Havana': { lat: 23.1136, lng: -82.3666, countryCode: 'CU' },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818, countryCode: 'IL' },
  'Doha': { lat: 25.2854, lng: 51.5310, countryCode: 'QA' },
  'San José': { lat: 9.9281, lng: -84.0907, countryCode: 'CR' },
  'Bali': { lat: -8.3405, lng: 115.0920, countryCode: 'ID' },
  'Hilton Head Island': { lat: 32.2163, lng: -80.7526, countryCode: 'US' },
  'Hilton Head': { lat: 32.2163, lng: -80.7526, countryCode: 'US' },
  'Fort Pierce': { lat: 27.4467, lng: -80.3256, countryCode: 'US' },
  'Fort Lauderdale': { lat: 26.1224, lng: -80.1373, countryCode: 'US' },
  'Tampa': { lat: 27.9506, lng: -82.4572, countryCode: 'US' },
  'Jacksonville': { lat: 30.3322, lng: -81.6557, countryCode: 'US' },
  'Savannah': { lat: 32.0835, lng: -81.0998, countryCode: 'US' },
  'Richmond': { lat: 37.5407, lng: -77.4360, countryCode: 'US' },
  'Pittsburgh': { lat: 40.4406, lng: -79.9959, countryCode: 'US' },
  'Cincinnati': { lat: 39.1031, lng: -84.5120, countryCode: 'US' },
  'Columbus': { lat: 39.9612, lng: -82.9988, countryCode: 'US' },
  'Cleveland': { lat: 41.4993, lng: -81.6944, countryCode: 'US' },
  'Detroit': { lat: 42.3314, lng: -83.0458, countryCode: 'US' },
  'Indianapolis': { lat: 39.7684, lng: -86.1581, countryCode: 'US' },
  'Kansas City': { lat: 39.0997, lng: -94.5786, countryCode: 'US' },
  'St. Louis': { lat: 38.6270, lng: -90.1994, countryCode: 'US' },
  'Memphis': { lat: 35.1495, lng: -90.0490, countryCode: 'US' },
  'Louisville': { lat: 38.2527, lng: -85.7585, countryCode: 'US' },
  'Raleigh': { lat: 35.7796, lng: -78.6382, countryCode: 'US' },
  'Virginia Beach': { lat: 36.8529, lng: -75.9780, countryCode: 'US' },
  'Tucson': { lat: 32.2226, lng: -110.9747, countryCode: 'US' },
  'Albuquerque': { lat: 35.0844, lng: -106.6504, countryCode: 'US' },
  'Sacramento': { lat: 38.5816, lng: -121.4944, countryCode: 'US' },
  'Omaha': { lat: 41.2565, lng: -95.9345, countryCode: 'US' },
  'Anchorage': { lat: 61.2181, lng: -149.9003, countryCode: 'US' },
  'Juneau': { lat: 58.3005, lng: -134.4197, countryCode: 'US' },
  'Maui': { lat: 20.7984, lng: -156.3319, countryCode: 'US' },
  'Kauai': { lat: 22.0964, lng: -159.5261, countryCode: 'US' },
  'Palm Springs': { lat: 33.8303, lng: -116.5453, countryCode: 'US' },
  'Sedona': { lat: 34.8697, lng: -111.7609, countryCode: 'US' },
  'Aspen': { lat: 39.1911, lng: -106.8175, countryCode: 'US' },
  'Park City': { lat: 40.6461, lng: -111.4980, countryCode: 'US' },
  'Jackson': { lat: 43.4799, lng: -110.7624, countryCode: 'US' },
  'Jackson Hole': { lat: 43.4799, lng: -110.7624, countryCode: 'US' },
  'Napa': { lat: 38.2975, lng: -122.2869, countryCode: 'US' },
  'Santa Barbara': { lat: 34.4208, lng: -119.6982, countryCode: 'US' },
  'Monterey': { lat: 36.6002, lng: -121.8947, countryCode: 'US' },
  'Charleston': { lat: 32.7765, lng: -79.9311, countryCode: 'US' },
  'Myrtle Beach': { lat: 33.6891, lng: -78.8867, countryCode: 'US' },
  'Key West': { lat: 24.5551, lng: -81.7800, countryCode: 'US' },
  'Naples': { lat: 26.1420, lng: -81.7948, countryCode: 'US' },
  'Sarasota': { lat: 27.3364, lng: -82.5307, countryCode: 'US' },
  'Destin': { lat: 30.3935, lng: -86.4958, countryCode: 'US' },
  'Pensacola': { lat: 30.4213, lng: -87.2169, countryCode: 'US' },
  'Gulf Shores': { lat: 30.2460, lng: -87.7006, countryCode: 'US' },
};

export function getCountryCode(country: string): string {
  return COUNTRY_CODE_MAP[country] || country.substring(0, 2).toUpperCase();
}

export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.09, lng: -95.71 }, GB: { lat: 55.38, lng: -3.44 }, FR: { lat: 46.23, lng: 2.21 },
  DE: { lat: 51.17, lng: 10.45 }, IT: { lat: 41.87, lng: 12.57 }, ES: { lat: 40.46, lng: -3.75 },
  PT: { lat: 39.40, lng: -8.22 }, NL: { lat: 52.13, lng: 5.29 }, BE: { lat: 50.50, lng: 4.47 },
  CH: { lat: 46.82, lng: 8.23 }, AT: { lat: 47.52, lng: 14.55 }, SE: { lat: 60.13, lng: 18.64 },
  NO: { lat: 60.47, lng: 8.47 }, DK: { lat: 56.26, lng: 9.50 }, FI: { lat: 61.92, lng: 25.75 },
  IE: { lat: 53.41, lng: -8.24 }, GR: { lat: 39.07, lng: 21.82 }, TR: { lat: 38.96, lng: 35.24 },
  PL: { lat: 51.92, lng: 19.15 }, CZ: { lat: 49.82, lng: 15.47 }, HU: { lat: 47.16, lng: 19.50 },
  HR: { lat: 45.10, lng: 15.20 }, RO: { lat: 45.94, lng: 24.97 }, JP: { lat: 36.20, lng: 138.25 },
  CN: { lat: 35.86, lng: 104.20 }, KR: { lat: 35.91, lng: 127.77 }, IN: { lat: 20.59, lng: 78.96 },
  TH: { lat: 15.87, lng: 100.99 }, VN: { lat: 14.06, lng: 108.28 }, SG: { lat: 1.35, lng: 103.82 },
  MY: { lat: 4.21, lng: 108.96 }, ID: { lat: -0.79, lng: 113.92 }, PH: { lat: 12.88, lng: 121.77 },
  AU: { lat: -25.27, lng: 133.78 }, NZ: { lat: -40.90, lng: 174.89 }, CA: { lat: 56.13, lng: -106.35 },
  MX: { lat: 23.63, lng: -102.55 }, BR: { lat: -14.24, lng: -51.93 }, AR: { lat: -38.42, lng: -63.62 },
  CL: { lat: -35.68, lng: -71.54 }, CO: { lat: 4.57, lng: -74.30 }, PE: { lat: -9.19, lng: -75.02 },
  AE: { lat: 23.42, lng: 53.85 }, QA: { lat: 25.35, lng: 51.18 }, SA: { lat: 23.89, lng: 45.08 },
  IL: { lat: 31.05, lng: 34.85 }, EG: { lat: 26.82, lng: 30.80 }, MA: { lat: 31.79, lng: -7.09 },
  ZA: { lat: -30.56, lng: 22.94 }, KE: { lat: -0.02, lng: 37.91 }, NG: { lat: 9.08, lng: 8.68 },
  HK: { lat: 22.32, lng: 114.17 }, TW: { lat: 23.70, lng: 121.00 }, DO: { lat: 18.74, lng: -70.16 },
  PR: { lat: 18.22, lng: -66.59 }, CU: { lat: 21.52, lng: -77.78 }, CR: { lat: 9.75, lng: -83.75 },
  PA: { lat: 8.54, lng: -80.78 }, JM: { lat: 18.11, lng: -77.30 }, EC: { lat: -1.83, lng: -78.18 },
};

export function getCityCoords(city: string, country: string): { lat: number; lng: number; countryCode: string } | null {
  const cc = getCountryCode(country);

  // 1. Direct CITY_COORDS lookup (case-insensitive)
  const directKey = Object.keys(CITY_COORDS).find(
    (k) => k.toLowerCase() === city.toLowerCase()
  );
  if (directKey) return CITY_COORDS[directKey];

  // 2. Search airport coords table by city name (case-insensitive)
  const airportEntry = Object.values(AIRPORT_COORDS).find(
    (a) => a.city.toLowerCase() === city.toLowerCase()
  );
  if (airportEntry) return { lat: airportEntry.lat, lng: airportEntry.lng, countryCode: airportEntry.countryCode };

  // 3. Partial city match in CITY_COORDS (e.g. "New York City" → "New York")
  const partialKey = Object.keys(CITY_COORDS).find(
    (k) => city.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(city.toLowerCase())
  );
  if (partialKey) return CITY_COORDS[partialKey];

  // 4. Country centroid fallback — always returns something
  const centroid = COUNTRY_CENTROIDS[cc];
  if (centroid) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelMap] No coords for city "${city}", ${country} — using country centroid`);
    }
    return { lat: centroid.lat, lng: centroid.lng, countryCode: cc };
  }

  return null;
}

interface RawFlight {
  reservationId: string;
  tripId: string;
  startDateTime: string;
  providerName: string | null;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
}

interface RawTripDest {
  id: string;
  city: string;
  country: string;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface RawTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationCity?: string | null;
  destinationCountry?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  tripDestinations?: RawTripDest[];
}

type RawWishlistItem = Omit<WishlistDestination, 'visited'>;

export function useTravelMapData(accountId: string): TravelMapData {
  const [rawData, setRawData] = useState<{ trips: RawTrip[]; flights: RawFlight[]; wishlist: RawWishlistItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/trips/map-data?accountId=${accountId}`);
        const data = r.ok ? await r.json() : await Promise.reject(r.statusText);
        if (!cancelled) setRawData(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accountId]);

  return useMemo(() => {
    if (!rawData) return { pins: [], flightRoutes: [], visitedCountryCodes: [], trips: [], wishlist: [], loading, error };

    const cityMap = new Map<string, MapPin>();
    const countryCodeSet = new Set<string>();

    function tripMeta(trip: RawTrip): MapPinTrip {
      return { id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate };
    }

    function addTripToPin(pin: MapPin, trip: RawTrip) {
      if (!pin.tripIds.includes(trip.id)) {
        pin.tripIds.push(trip.id);
        pin.trips.push(tripMeta(trip));
      }
    }

    for (const trip of rawData.trips) {
      const destinations = trip.tripDestinations || [];
      for (const dest of destinations) {
        // Prefer server-geocoded coords, fall back to client-side lookup
        const serverCoords = (dest.lat != null && dest.lng != null)
          ? { lat: dest.lat, lng: dest.lng }
          : null;
        const coords = serverCoords ?? getCityCoords(dest.city, dest.country);
        const cc = getCountryCode(dest.country);
        countryCodeSet.add(cc);

        const key = `${dest.city}|${dest.country}`;
        const existing = cityMap.get(key);
        if (existing) {
          existing.visitCount += 1;
          addTripToPin(existing, trip);
        } else {
          const meta = tripMeta(trip);
          cityMap.set(key, {
            id: key,
            city: dest.city,
            country: dest.country,
            countryCode: cc,
            lat: coords?.lat ?? 0,
            lng: coords?.lng ?? 0,
            visitCount: 1,
            tripIds: [trip.id],
            trips: [meta],
          });
        }
      }

      if (destinations.length === 0 && trip.destinationCity && trip.destinationCountry) {
        const serverCoords = (trip.destinationLat != null && trip.destinationLng != null)
          ? { lat: trip.destinationLat, lng: trip.destinationLng }
          : null;
        const coords = serverCoords ?? getCityCoords(trip.destinationCity, trip.destinationCountry);
        const cc = getCountryCode(trip.destinationCountry);
        countryCodeSet.add(cc);
        const key = `${trip.destinationCity}|${trip.destinationCountry}`;
        const existing = cityMap.get(key);
        if (existing) {
          addTripToPin(existing, trip);
        } else {
          const meta = tripMeta(trip);
          cityMap.set(key, {
            id: key,
            city: trip.destinationCity,
            country: trip.destinationCountry,
            countryCode: cc,
            lat: coords?.lat ?? 0,
            lng: coords?.lng ?? 0,
            visitCount: 1,
            tripIds: [trip.id],
            trips: [meta],
          });
        }
      }
    }

    const flightRoutes: FlightRoute[] = [];

    for (const flight of rawData.flights) {
      const key = `${flight.departureAirport}-${flight.arrivalAirport}`;
      const route = buildFlightRoute({
        id: `${flight.reservationId}-${key}`,
        from: flight.departureAirport,
        to: flight.arrivalAirport,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        date: flight.startDateTime ? dayjs(flight.startDateTime).format('MMM D, YYYY') : undefined,
      });

      if (route) {
        flightRoutes.push(route);
        [flight.departureAirport, flight.arrivalAirport].forEach((code) => {
          const info = getAirportInfo(code);
          if (info) {
            countryCodeSet.add(info.countryCode);
            const cityKey = `${info.city}|${info.country}`;
            const flightTrip = rawData.trips.find((t) => t.id === flight.tripId);
            const existingFlightPin = cityMap.get(cityKey);
            if (existingFlightPin && flightTrip) {
              addTripToPin(existingFlightPin, flightTrip);
            } else if (flightTrip) {
              cityMap.set(cityKey, {
                id: cityKey,
                city: info.city,
                country: info.country,
                countryCode: info.countryCode,
                lat: info.lat,
                lng: info.lng,
                visitCount: 1,
                tripIds: [flight.tripId],
                trips: [tripMeta(flightTrip)],
              });
            }
          }
        });
      }
    }

    const pins = Array.from(cityMap.values());
    const visitedCountryCodes = Array.from(countryCodeSet);

    const trips: MapTrip[] = rawData.trips.map((t) => ({
      id: t.id,
      title: t.title,
      startDate: t.startDate,
      endDate: t.endDate,
      destinations: (t.tripDestinations || []).map((d) => ({ city: d.city, country: d.country })),
    }));

    const wishlist: WishlistDestination[] = (rawData.wishlist || []).map((w) => ({
      ...w,
      visited: !!w.visitedAt || isWishlistItemVisited(w, pins, visitedCountryCodes),
    }));

    return {
      pins,
      flightRoutes,
      visitedCountryCodes,
      trips,
      wishlist,
      loading,
      error,
    };
  }, [rawData, loading, error]);
}

/**
 * Persists `visitedAt` the first time a wishlist item is detected as visited,
 * so status remains stable even if trip data changes later.
 */
export function usePersistWishlistVisits(wishlist: WishlistDestination[]) {
  useEffect(() => {
    const toPersist = wishlist.filter((w) => w.visited && !w.visitedAt);
    for (const item of toPersist) {
      fetch('/api/wishlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, visited: true }),
      }).catch(() => {});
    }
  }, [wishlist]);
}
