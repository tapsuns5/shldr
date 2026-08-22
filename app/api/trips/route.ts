import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trips, tripMembers, tripDestinations, accountMembers } from '@/db/schema';

const destinationSchema = z.object({
  city: z.string().min(1).max(255),
  state: z.string().max(255).optional(),
  country: z.string().min(1).max(255),
  lat: z.number().optional(),
  lng: z.number().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
});

const createTripSchema = z.object({
  accountId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['planning', 'confirmed', 'active', 'completed', 'cancelled']).default('planning'),
  startDate: z.string(),
  endDate: z.string(),
  originAirport: z.string().max(10).optional(),
  destinationCity: z.string().max(255).optional(),
  destinationCountry: z.string().max(255).optional(),
  coverImage: z.string().optional(),
  destinations: z.array(destinationSchema).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, session.user.id)),
  });

  const memberRows = await db.query.tripMembers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.userId, session.user.id),
  });
  const memberTripIds = new Set(memberRows.map((m) => m.tripId));

  if (!membership) {
    if (memberTripIds.size === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sharedTrips = await db.query.trips.findMany({
      where: (t, { eq: eqOp, and: andOp, inArray: inArrayOp }) =>
        andOp(eqOp(t.accountId, accountId), inArrayOp(t.id, [...memberTripIds])),
      orderBy: (t, { asc }) => [asc(t.startDate)],
      with: { tripDestinations: true, tripMembers: { with: { user: true } } },
    });
    return NextResponse.json(sharedTrips);
  }

  const accountTrips = await db.query.trips.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    orderBy: (t, { asc }) => [asc(t.startDate)],
    with: { tripDestinations: true, tripMembers: { with: { user: true } } },
  });

  return NextResponse.json(accountTrips);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, parsed.data.accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { destinations, ...tripData } = parsed.data;
  const [trip] = await db
    .insert(trips)
    .values({ ...tripData, createdBy: session.user.id })
    .returning();

  await db.insert(tripMembers).values({
    tripId: trip.id,
    userId: session.user.id,
    role: 'editor',
  });

  if (destinations && destinations.length > 0) {
    await db.insert(tripDestinations).values(
      destinations.map((d, idx) => ({
        tripId: trip.id,
        city: d.city,
        state: d.state || null,
        country: d.country,
        arrivalDate: d.arrivalDate || null,
        departureDate: d.departureDate || null,
        sortOrder: String(idx),
      }))
    );
  }

  const tripWithDestinations = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, trip.id),
    with: { tripDestinations: true },
  });

  return NextResponse.json(tripWithDestinations, { status: 201 });
}
