import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { tripInvites, tripMembers } from '@/db/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invite = await db.query.tripInvites.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.token, token),
    with: { trip: true },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const isLinkInvite = invite.email === null;

  if (invite.status === 'accepted' && !isLinkInvite) {
    return NextResponse.json({ tripId: invite.tripId, alreadyAccepted: true });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  const existingMember = await db.query.tripMembers.findFirst({
    where: (t, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(t.tripId, invite.tripId), eqOp(t.userId, session.user.id)),
  });

  if (!existingMember) {
    await db.insert(tripMembers).values({
      tripId: invite.tripId,
      userId: session.user.id,
      role: invite.role,
    });
  }

  // Only mark as accepted for email-based invites (single-use).
  // Link-based invites stay open so multiple people can join.
  if (!isLinkInvite) {
    await db
      .update(tripInvites)
      .set({
        status: 'accepted',
        acceptedByUserId: session.user.id,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tripInvites.id, invite.id));
  }

  return NextResponse.json({ tripId: invite.tripId, accepted: true });
}
