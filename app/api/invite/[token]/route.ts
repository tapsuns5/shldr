import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await db.query.tripInvites.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.token, token),
    with: {
      trip: {
        with: { tripDestinations: true },
      },
      invitedByUser: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const isLinkInvite = invite.email === null;

  if (invite.status === 'accepted' && !isLinkInvite) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    trip: invite.trip,
    invitedByUser: {
      id: invite.invitedByUser.id,
      name: invite.invitedByUser.name,
      image: invite.invitedByUser.image,
    },
  });
}
