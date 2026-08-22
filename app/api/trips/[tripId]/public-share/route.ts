import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { publicShares } from '@/db/schema';

const createShareSchema = z.object({
  durationHours: z.number().int().min(1).optional(),
  durationDays: z.number().int().min(1).optional(),
  indefinite: z.boolean().optional(),
}).refine(
  (data) => data.durationHours || data.durationDays || data.indefinite,
  { message: 'Must specify a duration' }
);

async function requireTripEditor(tripId: string, userId: string) {
  const member = await db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, tripId), eqOp(t.userId, userId)),
  });
  if (member && member.role !== 'viewer') return true;

  const trip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
  });
  if (!trip) return false;

  const accountMember = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, trip.accountId), eqOp(t.userId, userId)),
  });
  return accountMember && accountMember.role !== 'viewer';
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getExpiresAt(data: z.infer<typeof createShareSchema>): Date | null {
  if (data.indefinite) return null;
  const d = new Date();
  if (data.durationHours) {
    d.setHours(d.getHours() + data.durationHours);
  } else if (data.durationDays) {
    d.setDate(d.getDate() + data.durationDays);
  }
  return d;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await requireTripEditor(tripId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expiresAt = getExpiresAt(parsed.data);
  const token = generateToken();

  const [share] = await db.insert(publicShares).values({
    tripId,
    token,
    createdBy: session.user.id,
    expiresAt,
  }).returning();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  const shareUrl = `${appUrl}/public/${share.token}`;

  return NextResponse.json({ shareUrl, token: share.token, expiresAt: share.expiresAt?.toISOString() ?? null });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await requireTripEditor(tripId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const shares = await db.query.publicShares.findMany({
    where: (t, { eq: eqOp, and: andOp, isNull: isNullOp }) =>
      andOp(eqOp(t.tripId, tripId), isNullOp(t.revokedAt)),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  return NextResponse.json(
    shares.map((s) => ({
      ...s,
      shareUrl: `${appUrl}/public/${s.token}`,
      expiresAt: s.expiresAt?.toISOString() ?? null,
    }))
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await requireTripEditor(tripId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  await db
    .update(publicShares)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(publicShares.tripId, tripId), eq(publicShares.token, token)));

  return NextResponse.json({ success: true });
}
