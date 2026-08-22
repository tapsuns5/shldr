import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { accountInvites } from '@/db/schema';

async function requireAccountOwner(accountId: string, userId: string) {
  const membership = await db.query.accountMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.accountId, accountId), eqOp(t.userId, userId)),
  });
  if (!membership || membership.role !== 'owner') return null;
  return membership;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; inviteId: string }> }
) {
  const { accountId, inviteId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const owner = await requireAccountOwner(accountId, session.user.id);
  if (!owner) return NextResponse.json({ error: 'Only the account owner can revoke invites' }, { status: 403 });

  const [revoked] = await db
    .update(accountInvites)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(
      and(
        eq(accountInvites.id, inviteId),
        eq(accountInvites.accountId, accountId)
      )
    )
    .returning();

  if (!revoked) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
