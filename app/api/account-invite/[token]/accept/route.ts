import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accountInvites, accountMembers, accounts } from '@/db/schema';

const PLAN_SEAT_LIMITS: Record<string, number | null> = {
  free: 2,
  pro: 6,
  premium: null,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invite = await db.query.accountInvites.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.token, token),
    with: { account: true },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  }

  if (invite.status === 'revoked') {
    return NextResponse.json({ error: 'Invite has been revoked' }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    await db
      .update(accountInvites)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(accountInvites.id, invite.id));
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  const existingMember = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, invite.accountId), eqOp(t.userId, session.user.id)),
  });

  if (existingMember) {
    return NextResponse.json({ accountId: invite.accountId, alreadyMember: true });
  }

  const account = invite.account;
  const seatLimit = PLAN_SEAT_LIMITS[account.plan];

  if (seatLimit !== null) {
    const allMembers = await db.query.accountMembers.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.accountId, invite.accountId),
    });
    if (allMembers.length >= seatLimit) {
      return NextResponse.json(
        { error: `This account has reached its user limit (${seatLimit}) for the ${account.plan} plan.` },
        { status: 403 }
      );
    }
  }

  await db.insert(accountMembers).values({
    accountId: invite.accountId,
    userId: session.user.id,
    role: 'admin',
    invitedBy: invite.invitedByUserId,
    joinedAt: new Date(),
  });

  await db
    .update(accountInvites)
    .set({
      status: 'accepted',
      acceptedByUserId: session.user.id,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accountInvites.id, invite.id));

  return NextResponse.json({ accountId: invite.accountId, accepted: true });
}
