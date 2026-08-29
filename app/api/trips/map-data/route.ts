import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import { trips, reservations, flightReservations, wishlistDestinations } from '@/db/schema';
import fs from 'fs';
import path from 'path';

// File-backed geocode cache — survives Next.js hot-reloads in dev
const CACHE_FILE = path.join(process.cwd(), '.geocode-cache.json');

function loadCacheFromDisk(): Map<string, { lat: number; lng: number } | null> {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const obj = JSON.parse(raw) as Record<string, { lat: number; lng: number } | null>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveCacheToDisk(cache: Map<string, { lat: number; lng: number } | null>) {
  try {
    const obj = Object.fromEntries(cache.entries());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // Non-fatal — will just re-geocode next time
  }
}

// Module-level cache loaded once per process (survives hot-reload via disk)
const geocodeCache = loadCacheFromDisk();
let lastGeocodeFetch = 0;

async function geocodeCity(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city.toLowerCase()}|${country.toLowerCase()}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null;
  }

  // Nominatim rate limit: max 1 req/sec
  const now = Date.now();
  const elapsed = now - lastGeocodeFetch;
  if (elapsed < 1100) await new Promise((r) => setTimeout(r, 1100 - elapsed));
  lastGeocodeFetch = Date.now();

  try {
    const query = encodeURIComponent(`${city}, ${country}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'shldr-travel-app/1.0 (contact@shldr.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // Don't cache failures — allow retry next request
      return null;
    }
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(key, result);
      saveCacheToDisk(geocodeCache);
      return result;
    }

    // Retry with city name only (handles country name mismatches)
    const now2 = Date.now();
    const elapsed2 = now2 - lastGeocodeFetch;
    if (elapsed2 < 1100) await new Promise((r) => setTimeout(r, 1100 - elapsed2));
    lastGeocodeFetch = Date.now();

    const retryUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=0`;
    const retryRes = await fetch(retryUrl, {
      headers: { 'User-Agent': 'shldr-travel-app/1.0 (contact@shldr.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (retryRes.ok) {
      const retryData = await retryRes.json() as Array<{ lat: string; lon: string }>;
      if (retryData.length > 0) {
        const result = { lat: parseFloat(retryData[0].lat), lng: parseFloat(retryData[0].lon) };
        geocodeCache.set(key, result);
        saveCacheToDisk(geocodeCache);
        return result;
      }
    }

    geocodeCache.set(key, null);
    saveCacheToDisk(geocodeCache);
    return null;
  } catch {
    // Don't cache network errors — allow retry
    return null;
  }
}

async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = `place|${query.toLowerCase()}`;
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const elapsed = Date.now() - lastGeocodeFetch;
  if (elapsed < 1100) await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  lastGeocodeFetch = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'shldr-travel-app/1.0 (contact@shldr.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json() as Array<{ lat: string; lon: string }>;
      if (data[0]) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.set(key, result);
        saveCacheToDisk(geocodeCache);
        return result;
      }
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const googleResponse = await fetch(googleUrl, { signal: AbortSignal.timeout(5000) });
    if (!googleResponse.ok) return null;
    const googleData = await googleResponse.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    const location = googleData.results[0]?.geometry.location;
    if (!location) return null;
    geocodeCache.set(key, location);
    saveCacheToDisk(geocodeCache);
    return location;
  } catch {
    return null;
  }
}

function parseFlightAirports(reservation: {
  title: string;
  location?: string | null;
  flightDetails?: { departureAirport: string; arrivalAirport: string } | null;
}): { dep: string | null; arr: string | null } {
  if (reservation.flightDetails?.departureAirport && reservation.flightDetails?.arrivalAirport) {
    return {
      dep: reservation.flightDetails.departureAirport,
      arr: reservation.flightDetails.arrivalAirport,
    };
  }

  const title = reservation.title || '';
  const arrowMatch = title.match(/([A-Z]{3})\s*(?:→|->|-|to)\s*([A-Z]{3})/i);
  if (arrowMatch) {
    return { dep: arrowMatch[1].toUpperCase(), arr: arrowMatch[2].toUpperCase() };
  }

  const parenMatches = [...title.matchAll(/\(([A-Z]{3})\)/gi)];
  if (parenMatches.length >= 2) {
    return { dep: parenMatches[0][1].toUpperCase(), arr: parenMatches[1][1].toUpperCase() };
  }

  return { dep: null, arr: null };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const tripId = searchParams.get('tripId');
  if (!accountId && !tripId) return NextResponse.json({ error: 'accountId or tripId required' }, { status: 400 });

  if (tripId) {
    const trip = await db.query.trips.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
    });
    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tripMembership = await db.query.accountMembers.findFirst({
      where: (t, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(t.accountId, trip.accountId), eqOp(t.userId, session.user.id)),
    });
    if (!tripMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tripReservations = await db.query.reservations.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
      orderBy: (t, { asc }) => [asc(t.startDateTime)],
      with: {
        flightDetails: true,
        hotelDetails: true,
        carRentalDetails: true,
        activityDetails: true,
        transportDetails: true,
      },
    });

    const locations = [];
    const flights = [];
    const transits = [];

    for (const reservation of tripReservations) {
      if (reservation.type === 'flight' || reservation.flightDetails) {
        const { dep, arr } = parseFlightAirports(reservation);
        if (dep && arr) {
          const [from, to] = await Promise.all([
            geocodePlace(`airport ${dep}`),
            geocodePlace(`airport ${arr}`),
          ]);
          if (from) {
            locations.push({
              reservationId: reservation.id,
              date: reservation.startDateTime,
              title: `Depart ${dep}`,
              type: 'flight',
              ...from,
            });
          }
          if (to) {
            const isNaiveUtc = reservation.source === 'email_import';
            const startDayjs = isNaiveUtc ? dayjs.utc(reservation.startDateTime) : dayjs(reservation.startDateTime);
            const arrDate = reservation.endDateTime || startDayjs.add(2, 'hour').toISOString();
            locations.push({
              reservationId: reservation.id,
              date: arrDate,
              title: `Arrive ${arr}`,
              type: 'flight',
              ...to,
            });
          }
          if (from && to) {
            flights.push({
              reservationId: reservation.id,
              from,
              to,
              title: reservation.title,
              date: reservation.startDateTime,
              source: reservation.source,
              dep,
              arr,
              isReturnHome: false,
            });
          }
          continue;
        }
      }

      if (['rail', 'transport', 'cruise'].includes(reservation.type)) {
        const depLoc = reservation.transportDetails?.departureLocation || reservation.location?.split('→')[0]?.trim();
        const arrLoc = reservation.transportDetails?.arrivalLocation || reservation.location?.split('→')[1]?.trim();
        if (depLoc && arrLoc) {
          const [from, to] = await Promise.all([geocodePlace(depLoc), geocodePlace(arrLoc)]);
          if (from && to) {
            transits.push({
              reservationId: reservation.id,
              type: reservation.type,
              title: reservation.title,
              date: reservation.startDateTime,
              from,
              to,
            });
          }
        }
      }

      const query = reservation.hotelDetails
        ? `${reservation.hotelDetails.city}, ${reservation.hotelDetails.country}`
        : reservation.carRentalDetails?.pickupLocation || reservation.carRentalDetails?.dropoffLocation || reservation.activityDetails?.address || reservation.activityDetails?.venue || reservation.location
          ? reservation.carRentalDetails?.pickupLocation || reservation.carRentalDetails?.dropoffLocation || reservation.activityDetails?.address || reservation.activityDetails?.venue || reservation.location
          : reservation.transportDetails?.arrivalLocation;
      if (!query) continue;
      const coords = await geocodePlace(query);
      if (!coords) continue;
      locations.push({
        reservationId: reservation.id,
        date: reservation.startDateTime,
        title: reservation.title,
        type: reservation.type,
        ...coords,
      });
    }

    // Identify return home flight (arriving at origin airport or starting point)
    const originAirport = (trip.originAirport || flights[0]?.dep || '').toUpperCase();
    if (flights.length > 0) {
      for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        if (originAirport && f.arr.toUpperCase() === originAirport) {
          f.isReturnHome = true;
        } else if (i === flights.length - 1 && flights.length > 1) {
          f.isReturnHome = true;
        }
      }
    }

    // Adjust hotel location sequence if there are arrival flights or car rentals on the same day
    const byDay = new Map<string, typeof locations>();
    for (const loc of locations) {
      const dayKey = dayjs(loc.date).format('YYYY-MM-DD');
      const list = byDay.get(dayKey) || [];
      list.push(loc);
      byDay.set(dayKey, list);
    }

    const adjustedLocations: typeof locations = [];
    for (const [, dayLocs] of byDay) {
      let maxArrivalTs = 0;
      for (const loc of dayLocs) {
        const ts = dayjs(loc.date).valueOf();
        if (
          (loc.type === 'flight' && (loc.title.startsWith('Arrive') || loc.title.includes('→'))) ||
          loc.type === 'car' ||
          loc.type === 'transport'
        ) {
          if (ts > maxArrivalTs) maxArrivalTs = ts;
        }
      }

      for (const loc of dayLocs) {
        if (loc.type === 'hotel' && maxArrivalTs > 0) {
          const hotelTs = dayjs(loc.date).valueOf();
          if (hotelTs <= maxArrivalTs) {
            adjustedLocations.push({
              ...loc,
              date: dayjs(maxArrivalTs).add(1, 'minute').toISOString(),
            });
            continue;
          }
        }
        adjustedLocations.push(loc);
      }
    }

    adjustedLocations.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

    return NextResponse.json({ locations: adjustedLocations, flights, transits });
  }

  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const accountTrips = await db.query.trips.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    with: { tripDestinations: true },
  });

  if (accountTrips.length === 0) {
    const wishlistRows = await db.query.wishlistDestinations.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    });
    return NextResponse.json({
      trips: [],
      flights: [],
      wishlist: wishlistRows.map((w) => ({
        id: w.id,
        type: w.type,
        city: w.city,
        country: w.country,
        countryCode: w.countryCode,
        lat: w.lat,
        lng: w.lng,
        note: w.note,
        visitedAt: w.visitedAt,
      })),
    });
  }

  // Collect all unique city+country pairs across destinations and trip-level fields
  const cityPairs = new Map<string, { city: string; country: string }>();
  for (const trip of accountTrips) {
    for (const dest of trip.tripDestinations ?? []) {
      const key = `${dest.city.toLowerCase()}|${dest.country.toLowerCase()}`;
      if (!cityPairs.has(key)) cityPairs.set(key, { city: dest.city, country: dest.country });
    }
    if (trip.destinationCity && trip.destinationCountry) {
      const key = `${trip.destinationCity.toLowerCase()}|${trip.destinationCountry.toLowerCase()}`;
      if (!cityPairs.has(key)) cityPairs.set(key, { city: trip.destinationCity, country: trip.destinationCountry });
    }
  }

  // Geocode only the cities not already cached (sequential to respect rate limit)
  for (const { city, country } of cityPairs.values()) {
    const result = await geocodeCity(city, country);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[map-data] geocode "${city}, ${country}" →`, result ?? 'NULL');
    }
  }

  // Attach geocoded coords to each destination so the client never needs to look them up
  const tripsWithCoords = accountTrips.map((trip) => ({
    ...trip,
    tripDestinations: (trip.tripDestinations ?? []).map((dest) => {
      const coords = geocodeCache.get(`${dest.city.toLowerCase()}|${dest.country.toLowerCase()}`);
      return { ...dest, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
    }),
    destinationLat: trip.destinationCity && trip.destinationCountry
      ? (geocodeCache.get(`${trip.destinationCity.toLowerCase()}|${trip.destinationCountry.toLowerCase()}`)?.lat ?? null)
      : null,
    destinationLng: trip.destinationCity && trip.destinationCountry
      ? (geocodeCache.get(`${trip.destinationCity.toLowerCase()}|${trip.destinationCountry.toLowerCase()}`)?.lng ?? null)
      : null,
  }));

  const tripIds = accountTrips.map((t) => t.id);

  const flightResRows = await db
    .select({
      reservationId: reservations.id,
      tripId: reservations.tripId,
      startDateTime: reservations.startDateTime,
      providerName: reservations.providerName,
      airline: flightReservations.airline,
      flightNumber: flightReservations.flightNumber,
      departureAirport: flightReservations.departureAirport,
      arrivalAirport: flightReservations.arrivalAirport,
    })
    .from(reservations)
    .innerJoin(flightReservations, eq(flightReservations.reservationId, reservations.id))
    .where(
      and(
        inArray(reservations.tripId, tripIds),
        eq(reservations.type, 'flight')
      )
    );

  const wishlistRows = await db.query.wishlistDestinations.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
  });

  const wishlist = wishlistRows.map((w) => ({
    id: w.id,
    type: w.type,
    city: w.city,
    country: w.country,
    countryCode: w.countryCode,
    lat: w.lat,
    lng: w.lng,
    note: w.note,
    visitedAt: w.visitedAt,
  }));

  return NextResponse.json({
    trips: tripsWithCoords,
    flights: flightResRows,
    wishlist,
  });
}
