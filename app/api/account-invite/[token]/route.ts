import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await db.query.accountInvites.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.token, token),
    with: {
      account: true,
      invitedByUser: true,
    },
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
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    status: invite.status,
    expiresAt: invite.expiresAt,
    account: {
      id: invite.account.id,
      name: invite.account.name,
      slug: invite.account.slug,
    },
    invitedByUser: {
      id: invite.invitedByUser.id,
      name: invite.invitedByUser.name,
      image: invite.invitedByUser.image,
    },
  });
}
