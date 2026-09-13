import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Trips the user is a direct member of
  const memberRows = await db.query.tripMembers.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
    columns: { tripId: true },
  });

  // Trips belonging to accounts the user is a member of
  const accountRows = await db.query.accountMembers.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
    columns: { accountId: true },
  });
  const accountIds = accountRows.map((r) => r.accountId);
  const accountTrips = accountIds.length
    ? await db.query.trips.findMany({
        where: (t, { inArray }) => inArray(t.accountId, accountIds),
        columns: { id: true },
      })
    : [];

  const tripIds = [
    ...new Set([...memberRows.map((r) => r.tripId), ...accountTrips.map((t) => t.id)]),
  ];
  if (tripIds.length === 0) return NextResponse.json([]);

  const docs = await db.query.documents.findMany({
    where: (t, { inArray }) => inArray(t.tripId, tripIds),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      trip: { columns: { id: true, title: true } },
      reservation: { columns: { id: true, title: true } },
    },
  });

  return NextResponse.json(docs);
}
