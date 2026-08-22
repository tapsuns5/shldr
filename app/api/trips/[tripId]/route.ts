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
});

const updateTripSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'confirmed', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  originAirport: z.string().max(10).optional(),
  destinationCity: z.string().max(255).optional(),
  destinationCountry: z.string().max(255).optional(),
  coverImage: z.string().optional(),
  destinations: z.array(destinationSchema).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await requireTripAccess(tripId, session.user.id);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const trip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
    with: { tripMembers: { with: { user: true } }, tripDestinations: true },
  });
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(trip);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await requireTripAccess(tripId, session.user.id, true);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = updateTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { destinations, ...tripData } = parsed.data;

  const [updated] = await db
    .update(trips)
    .set({ ...tripData, updatedAt: new Date() })
    .where(eq(trips.id, tripId))
    .returning();

  if (destinations) {
    await db.delete(tripDestinations).where(eq(tripDestinations.tripId, tripId));
    if (destinations.length > 0) {
      await db.insert(tripDestinations).values(
        destinations.map((d, idx) => ({
          tripId,
          city: d.city,
          state: d.state || null,
          country: d.country,
          sortOrder: String(idx),
        }))
      );
    }
  }

  const tripWithDestinations = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
    with: { tripDestinations: true },
  });

  return NextResponse.json(tripWithDestinations);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await requireTripAccess(tripId, session.user.id, true);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await db.delete(trips).where(eq(trips.id, tripId));
  return NextResponse.json({ success: true });
}
