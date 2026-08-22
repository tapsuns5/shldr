import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getCityForAirport } from '@/lib/airport-cities';
import {
  trips,
  tripMembers,
  tripDestinations,
  accountMembers,
  reservations,
  travelers,
  documents,
  tripNotes,
  tripExpenses,
  tripChecklists,
} from '@/db/schema';

const mergeSchema = z.object({
  targetTripIds: z.array(z.string().uuid()).min(1),
});

async function requireTripAccess(tripId: string, userId: string, requireEditor = false) {
  const member = await db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
  if (member) {
    if (requireEditor && member.role === 'viewer') return null;
    return member;
  }

  const trip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
  });
  if (!trip) return null;

  const accountMember = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, trip.accountId), eqOp(t.userId, userId)),
  });
  if (!accountMember) return null;
  if (requireEditor && accountMember.role === 'viewer') return null;
  return accountMember;
}

interface TripDestination {
  city: string;
  state?: string | null;
  country: string;
}

interface ReservationInput {
  type: string;
  title: string;
  notes?: string | null;
  location?: string | null;
  startDateTime: Date;
  flightDetails?: { departureAirport: string; arrivalAirport: string } | null;
  hotelDetails?: { city: string; state?: string | null; country: string } | null;
}

function extractAirportCodes(text: string): string[] {
  return [...text.matchAll(/\b([A-Z]{3})\b/g)].map((m) => m[1]);
}

function parseFlightAirports(res: ReservationInput): { departureAirport: string; arrivalAirport: string } | null {
  if (res.flightDetails) {
    return {
      departureAirport: res.flightDetails.departureAirport,
      arrivalAirport: res.flightDetails.arrivalAirport,
    };
  }
  const titleCodes = extractAirportCodes(res.title);
  if (titleCodes.length >= 2) {
    return { departureAirport: titleCodes[0], arrivalAirport: titleCodes[titleCodes.length - 1] };
  }
  const allText = [res.title, res.notes, res.location].filter(Boolean).join(' ');
  const codes = extractAirportCodes(allText);
  if (codes.length >= 2) {
    return { departureAirport: codes[0], arrivalAirport: codes[codes.length - 1] };
  }
  return null;
}

function parseHotelLocation(res: ReservationInput): TripDestination | null {
  if (res.hotelDetails) {
    return { city: res.hotelDetails.city, state: res.hotelDetails.state, country: res.hotelDetails.country };
  }
  const location = res.location;
  if (!location) return null;
  // Try to parse "... City, Country" or "City, Country, ZIP".
  const parts = location.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    return { city, state: null, country };
  }
  return { city: location, state: null, country: '' };
}

interface DestinationInput {
  tripDestinations?: { city: string; state?: string | null; country: string; sortOrder: string }[];
  destinationCity?: string | null;
  destinationCountry?: string | null;
  startDate: string;
  reservations?: ReservationInput[];
}

function getTripDestinations(trip: DestinationInput): TripDestination[] {
  // 1. Prefer explicitly stored destinations.
  if (trip.tripDestinations && trip.tripDestinations.length > 0) {
    return trip.tripDestinations
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((d) => ({ city: d.city, state: d.state, country: d.country }));
  }

  const reservations = trip.reservations || [];

  // 2. Derive from hotel reservations.
  const hotels = reservations
    .filter((r) => r.type === 'hotel')
    .map((r) => ({ res: r, dest: parseHotelLocation(r) }))
    .filter((item): item is { res: ReservationInput; dest: TripDestination } => !!item.dest)
    .sort((a, b) => a.res.startDateTime.toISOString().localeCompare(b.res.startDateTime.toISOString()));
  if (hotels.length > 0) {
    return hotels.map((h) => h.dest);
  }

  // 3. Derive from flight reservations, excluding the origin/return airport.
  const flightAirports = reservations
    .filter((r) => r.type === 'flight')
    .map((r) => ({ res: r, airports: parseFlightAirports(r) }))
    .filter((item): item is { res: ReservationInput; airports: { departureAirport: string; arrivalAirport: string } } => !!item.airports)
    .sort((a, b) => a.res.startDateTime.toISOString().localeCompare(b.res.startDateTime.toISOString()));
  if (flightAirports.length > 0) {
    const origin = flightAirports[0].airports.departureAirport.toUpperCase();
    const result: TripDestination[] = [];
    for (let i = 0; i < flightAirports.length; i++) {
      const arrival = flightAirports[i].airports.arrivalAirport.toUpperCase();
      const city = getCityForAirport(arrival) || arrival;
      // Skip the final return to the origin airport.
      if (i === flightAirports.length - 1 && arrival === origin) continue;
      result.push({ city, state: null, country: '' });
    }
    return result;
  }

  // 4. Fallback to the trip-level destination city.
  if (trip.destinationCity) {
    return [
      {
        city: trip.destinationCity,
        state: null,
        country: trip.destinationCountry || '',
      },
    ];
  }
  return [];
}

function normalizeCountry(country: string): string {
  return country.trim().toLowerCase();
}

function cityNamePart(city: string): string {
  return city.split(',')[0].trim().toLowerCase();
}

function destinationKey(d: TripDestination): string {
  return [cityNamePart(d.city), d.state || '', normalizeCountry(d.country)].join('|');
}

function getOriginCity(tripsToMerge: DestinationInput[]): string | null {
  // Find the earliest flight across all trips; its departure airport is the home origin.
  const flightReservations = tripsToMerge
    .flatMap((t) => t.reservations || [])
    .filter((r) => r.type === 'flight')
    .sort((a, b) => a.startDateTime.toISOString().localeCompare(b.startDateTime.toISOString()));
  const earliestAirports = flightReservations.length > 0 ? parseFlightAirports(flightReservations[0]) : null;
  if (!earliestAirports) return null;
  const originCode = earliestAirports.departureAirport.toUpperCase();
  return (getCityForAirport(originCode) || originCode).toLowerCase();
}

function mergeDestinations(tripsToMerge: DestinationInput[]): TripDestination[] {
  // Order trips chronologically so the destination sequence makes sense.
  const ordered = [...tripsToMerge].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const all = ordered.flatMap((trip) => getTripDestinations(trip));

  const seen = new Set<string>();
  const result: TripDestination[] = [];

  for (const d of all) {
    const key = destinationKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(d);
  }

  // If the final destination is a return to the starting area, drop it.
  if (result.length > 1 && destinationKey(result[result.length - 1]) === destinationKey(result[0])) {
    result.pop();
  }

  // Drop the home origin city (e.g., the airport a trip departs from and returns to).
  const originCity = getOriginCity(tripsToMerge);
  if (originCity) {
    const filtered = result.filter((d) => cityNamePart(d.city) !== originCity);
    // Only use the filtered list if we still have real destinations left.
    if (filtered.length > 0) {
      return filtered;
    }
  }

  return result;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sourceAccess = await requireTripAccess(tripId, session.user.id, true);
  if (!sourceAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { targetTripIds } = parsed.data;
  const uniqueTargetIds = Array.from(new Set(targetTripIds));
  if (uniqueTargetIds.includes(tripId)) {
    return NextResponse.json({ error: 'Cannot merge a trip into itself' }, { status: 400 });
  }

  for (const targetId of uniqueTargetIds) {
    const targetAccess = await requireTripAccess(targetId, session.user.id, true);
    if (!targetAccess) {
      return NextResponse.json({ error: `Forbidden for trip ${targetId}` }, { status: 403 });
    }
  }

  const sourceTrip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
    with: { tripDestinations: true },
  });
  if (!sourceTrip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const targetTrips = await Promise.all(
    uniqueTargetIds.map((id) =>
      db.query.trips.findFirst({
        where: (t, { eq: eqOp }) => eqOp(t.id, id),
        with: { tripDestinations: true },
      })
    )
  );

  const allTripIds = [tripId, ...uniqueTargetIds];
  const allReservations = await db.query.reservations.findMany({
    where: (r, { eq: eqOp, inArray: inArrayOp }) => inArrayOp(r.tripId, allTripIds),
    with: { flightDetails: true, hotelDetails: true },
  });
  const reservationsByTripId = new Map<string, ReservationInput[]>();
  for (const res of allReservations) {
    const arr = reservationsByTripId.get(res.tripId) || [];
    arr.push(res);
    reservationsByTripId.set(res.tripId, arr);
  }
  if (targetTrips.some((t) => !t)) {
    return NextResponse.json({ error: 'One or more target trips not found' }, { status: 404 });
  }
  const validTargets = targetTrips.filter((t): t is NonNullable<typeof t> => t !== null);
  if (validTargets.some((t) => t.accountId !== sourceTrip.accountId)) {
    return NextResponse.json({ error: 'All trips must belong to the same account' }, { status: 400 });
  }

  const destinationInputs: DestinationInput[] = [sourceTrip, ...validTargets].map((t) => ({
    ...t,
    reservations: reservationsByTripId.get(t.id),
  }));

  console.log('[merge] source trip:', { id: sourceTrip.id, title: sourceTrip.title, destinationCity: sourceTrip.destinationCity, destinationCountry: sourceTrip.destinationCountry, tripDestinations: sourceTrip.tripDestinations });
  for (const t of validTargets) {
    console.log('[merge] target trip:', { id: t.id, title: t.title, destinationCity: t.destinationCity, destinationCountry: t.destinationCountry, tripDestinations: t.tripDestinations });
  }
  for (const [id, resList] of reservationsByTripId.entries()) {
    console.log('[merge] reservations for trip', id, resList.map((r) => ({ type: r.type, title: r.title, location: r.location, notes: r.notes, flightDetails: r.flightDetails, hotelDetails: r.hotelDetails })));
  }
  console.log('[merge] destination inputs:', destinationInputs.map((d) => ({ startDate: d.startDate, destinations: getTripDestinations(d) })));
  console.log('[merge] origin city:', getOriginCity(destinationInputs));
  console.log('[merge] merged destinations before transaction:', mergeDestinations(destinationInputs));

  const mergedTrip = await db.transaction(async (tx) => {
    const allTrips = [sourceTrip, ...validTargets];
    let sourceMemberIds = new Set(
      (await tx.query.tripMembers.findMany({
        where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
      })).map((m) => m.userId)
    );

    for (const target of validTargets) {
      // Move all child records from the target trip into the source trip.
      await tx.update(reservations).set({ tripId: tripId }).where(eq(reservations.tripId, target.id));
      await tx.update(travelers).set({ tripId: tripId }).where(eq(travelers.tripId, target.id));
      await tx.update(documents).set({ tripId: tripId }).where(eq(documents.tripId, target.id));
      await tx.update(tripNotes).set({ tripId: tripId }).where(eq(tripNotes.tripId, target.id));
      await tx.update(tripExpenses).set({ tripId: tripId }).where(eq(tripExpenses.tripId, target.id));
      await tx.update(tripChecklists).set({ tripId: tripId }).where(eq(tripChecklists.tripId, target.id));

      // Merge target trip members into the source without duplicating.
      const targetMembers = await tx.query.tripMembers.findMany({
        where: (t, { eq: eqOp }) => eqOp(t.tripId, target.id),
      });
      for (const member of targetMembers) {
        if (!sourceMemberIds.has(member.userId)) {
          await tx.insert(tripMembers).values({
            tripId: tripId,
            userId: member.userId,
            role: member.role,
          });
          sourceMemberIds.add(member.userId);
        }
      }

      // Delete the target trip (cascade removes its former destinations).
      await tx.delete(trips).where(eq(trips.id, target.id));
    }

    // Combine destinations and update the source trip's date range.
    const mergedDestinations = mergeDestinations(destinationInputs);
    console.log('[merge] final merged destinations:', mergedDestinations);
    const newStart = allTrips.reduce((min, t) => (t.startDate < min ? t.startDate : min), allTrips[0].startDate);
    const newEnd = allTrips.reduce((max, t) => (t.endDate > max ? t.endDate : max), allTrips[0].endDate);
    const firstDest = mergedDestinations[0];

    await tx
      .update(trips)
      .set({
        startDate: newStart,
        endDate: newEnd,
        destinationCity: firstDest?.city ?? sourceTrip.destinationCity,
        destinationCountry: firstDest?.country ?? sourceTrip.destinationCountry,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId));

    await tx.delete(tripDestinations).where(eq(tripDestinations.tripId, tripId));
    if (mergedDestinations.length > 0) {
      await tx.insert(tripDestinations).values(
        mergedDestinations.map((d, idx) => ({
          tripId: tripId,
          city: d.city,
          state: d.state || null,
          country: d.country,
          sortOrder: String(idx),
        }))
      );
    }

    return tx.query.trips.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
      with: { tripDestinations: true },
    });
  });

  if (!mergedTrip) {
    return NextResponse.json({ error: 'Failed to merge trips' }, { status: 500 });
  }

  return NextResponse.json(mergedTrip);
}
