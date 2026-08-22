import { Metadata } from 'next';
import { db } from '@/db';
import AccountInviteLanding from './AccountInviteLanding';

interface AccountInvitePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: AccountInvitePageProps): Promise<Metadata> {
  const { token } = await params;
  const invite = await db.query.accountInvites.findFirst({
    where: (t, { eq }) => eq(t.token, token),
    with: { account: true },
  });
  if (!invite) return { title: 'Invite not found' };
  return { title: `You're invited to join ${invite.account.name}` };
}

export default async function AccountInvitePage({ params }: AccountInvitePageProps) {
  const { token } = await params;

  const invite = await db.query.accountInvites.findFirst({
    where: (t, { eq }) => eq(t.token, token),
    with: {
      account: true,
      invitedByUser: true,
    },
  });

  if (!invite) {
    return <AccountInviteLanding status="not_found" token={token} invite={null} />;
  }

  if (invite.status === 'accepted') {
    return <AccountInviteLanding status="already_accepted" token={token} invite={null} />;
  }

  if (invite.status === 'revoked') {
    return <AccountInviteLanding status="revoked" token={token} invite={null} />;
  }

  if (invite.expiresAt < new Date()) {
    return <AccountInviteLanding status="expired" token={token} invite={null} />;
  }

  const inviteData = {
    id: invite.id,
    token: invite.token,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
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
  };

  return <AccountInviteLanding status="valid" token={token} invite={inviteData} />;
}
