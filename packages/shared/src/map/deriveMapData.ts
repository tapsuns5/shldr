import dayjs from 'dayjs';
import { buildFlightRoute, type FlightRoute } from './arcRoutes';
import { getAirportInfo } from './airportCoords';
import { getCityCoords, getCountryCode } from './cityCoords';
import { isWishlistItemVisited } from './wishlistMatcher';

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
}

export interface RawFlight {
  reservationId: string;
  tripId: string;
  startDateTime: string;
  providerName: string | null;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
}

export interface RawTripDest {
  id: string;
  city: string;
  country: string;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface RawTrip {
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

export type RawWishlistItem = Omit<WishlistDestination, 'visited'>;

export interface RawTravelMapData {
  trips: RawTrip[];
  flights: RawFlight[];
  wishlist: RawWishlistItem[];
}

/**
 * Mirrors the useMemo body of shldr's hooks/useTravelMapData.ts (web),
 * pulled out as a plain function so both clients derive pins, flight arcs,
 * and wishlist-visited status from GET /api/trips/map-data the same way —
 * the fetch/memoization shell around it differs per client (a mobile
 * TanStack Query `select`, the web hook's useEffect/useMemo).
 */
export function deriveTravelMapData(raw: RawTravelMapData | null): TravelMapData {
  if (!raw) return { pins: [], flightRoutes: [], visitedCountryCodes: [], trips: [], wishlist: [] };

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

  for (const trip of raw.trips) {
    const destinations = trip.tripDestinations || [];
    for (const dest of destinations) {
      const serverCoords = dest.lat != null && dest.lng != null ? { lat: dest.lat, lng: dest.lng } : null;
      const coords = serverCoords ?? getCityCoords(dest.city, dest.country);
      const cc = getCountryCode(dest.country);
      countryCodeSet.add(cc);

      const key = `${dest.city}|${dest.country}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.visitCount += 1;
        addTripToPin(existing, trip);
      } else {
        cityMap.set(key, {
          id: key,
          city: dest.city,
          country: dest.country,
          countryCode: cc,
          lat: coords?.lat ?? 0,
          lng: coords?.lng ?? 0,
          visitCount: 1,
          tripIds: [trip.id],
          trips: [tripMeta(trip)],
        });
      }
    }

    if (destinations.length === 0 && trip.destinationCity && trip.destinationCountry) {
      const serverCoords =
        trip.destinationLat != null && trip.destinationLng != null
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
        cityMap.set(key, {
          id: key,
          city: trip.destinationCity,
          country: trip.destinationCountry,
          countryCode: cc,
          lat: coords?.lat ?? 0,
          lng: coords?.lng ?? 0,
          visitCount: 1,
          tripIds: [trip.id],
          trips: [tripMeta(trip)],
        });
      }
    }
  }

  const flightRoutes: FlightRoute[] = [];

  for (const flight of raw.flights) {
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
          const flightTrip = raw.trips.find((t) => t.id === flight.tripId);
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

  const trips: MapTrip[] = raw.trips.map((t) => ({
    id: t.id,
    title: t.title,
    startDate: t.startDate,
    endDate: t.endDate,
    destinations: (t.tripDestinations || []).map((d) => ({ city: d.city, country: d.country })),
  }));

  const wishlist: WishlistDestination[] = (raw.wishlist || []).map((w) => ({
    ...w,
    visited: !!w.visitedAt || isWishlistItemVisited(w, pins, visitedCountryCodes),
  }));

  return { pins, flightRoutes, visitedCountryCodes, trips, wishlist };
}
