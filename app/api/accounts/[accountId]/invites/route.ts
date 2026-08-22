import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { eq, and, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountMembers, accountInvites } from '@/db/schema';

const PLAN_SEAT_LIMITS: Record<string, number | null> = {
  free: 2,
  pro: 6,
  premium: null,
};

const createInviteSchema = z.object({
  email: z.string().email().optional(),
});

async function requireAccountOwner(accountId: string, userId: string) {
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
  if (!membership || membership.role !== 'owner') return null;
  return membership;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, session.user.id)),
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const invites = await db.query.accountInvites.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.accountId, accountId),
    with: { invitedByUser: true },
  });

  return NextResponse.json(invites);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const owner = await requireAccountOwner(accountId, session.user.id);
  if (!owner) return NextResponse.json({ error: 'Only the account owner can invite users' }, { status: 403 });

  const account = await db.query.accounts.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, accountId),
  });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const body = await request.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const seatLimit = PLAN_SEAT_LIMITS[account.plan];

  if (seatLimit !== null) {
    const [memberCount] = await db
      .select({ value: count() })
      .from(accountMembers)
      .where(eq(accountMembers.accountId, accountId));

    const [pendingInviteCount] = await db
      .select({ value: count() })
      .from(accountInvites)
      .where(
        and(
          eq(accountInvites.accountId, accountId),
          eq(accountInvites.status, 'pending')
        )
      );

    const totalSeats = (memberCount?.value ?? 0) + (pendingInviteCount?.value ?? 0);
    if (totalSeats >= seatLimit) {
      return NextResponse.json(
        { error: `Your ${account.plan} plan allows ${seatLimit} total users (including you). Remove a member or revoke a pending invite to add more.` },
        { status: 403 }
      );
    }
  }

  const email = parsed.data.email;
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(accountInvites)
    .values({
      accountId,
      invitedByUserId: session.user.id,
      email,
      token,
      expiresAt,
    })
    .returning();

  return NextResponse.json(invite, { status: 201 });
}
