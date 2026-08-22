import { Metadata } from 'next';
import { db } from '@/db';
import InviteLanding from './InviteLanding';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { token } = await params;
  const invite = await db.query.tripInvites.findFirst({
    where: (t, { eq }) => eq(t.token, token),
    with: { trip: true },
  });
  if (!invite) return { title: 'Invite not found' };
  return { title: `You're invited to ${invite.trip.title}` };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  const invite = await db.query.tripInvites.findFirst({
    where: (t, { eq }) => eq(t.token, token),
    with: {
      trip: {
        with: { tripDestinations: true },
      },
      invitedByUser: true,
    },
  });

  if (!invite) {
    return <InviteLanding status="not_found" token={token} invite={null} />;
  }

  const isLinkInvite = invite.email === null;

  if (invite.status === 'accepted' && !isLinkInvite) {
    return <InviteLanding status="already_accepted" token={token} invite={null} />;
  }

  if (invite.expiresAt < new Date()) {
    return <InviteLanding status="expired" token={token} invite={null} />;
  }

  const inviteData = {
    id: invite.id,
    token: invite.token,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    trip: {
      id: invite.trip.id,
      title: invite.trip.title,
      startDate: invite.trip.startDate,
      endDate: invite.trip.endDate,
      destinationCity: invite.trip.destinationCity,
      destinationCountry: invite.trip.destinationCountry,
      coverImage: invite.trip.coverImage,
      tripDestinations: invite.trip.tripDestinations.map((d) => ({
        id: d.id,
        city: d.city,
        state: d.state,
        country: d.country,
        sortOrder: d.sortOrder,
      })),
    },
    invitedByUser: {
      id: invite.invitedByUser.id,
      name: invite.invitedByUser.name,
      image: invite.invitedByUser.image,
    },
  };

  return <InviteLanding status="valid" token={token} invite={inviteData} />;
}
