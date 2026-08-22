import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trips, tripMembers, accountMembers } from '@/db/schema';

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
  });
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const options = await db.query.trips.findMany({
    where: (t, { eq: eqOp, and: andOp, ne: neOp }) =>
      andOp(eqOp(t.accountId, trip.accountId), neOp(t.id, tripId)),
    orderBy: (t, { asc }) => [asc(t.startDate)],
    with: { tripDestinations: true },
  });

  return NextResponse.json(options);
}
