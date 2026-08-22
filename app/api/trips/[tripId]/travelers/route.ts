import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelers, tripMembers } from '@/db/schema';

const travelerSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  birthDate: z.string().optional(),
  passportNumberEncrypted: z.string().optional(),
  passportCountry: z.string().max(100).optional(),
  passportExpiration: z.string().optional(),
  knownTravelerNumber: z.string().max(100).optional(),
  redressNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
});

async function requireTripMember(tripId: string, userId: string) {
  return db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripMember(tripId, session.user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = await db.query.travelers.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
  });

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await requireTripMember(tripId, session.user.id);
  if (!member || member.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = travelerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [traveler] = await db
    .insert(travelers)
    .values({ tripId, ...parsed.data })
    .returning();

  return NextResponse.json(traveler, { status: 201 });
}
