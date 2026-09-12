import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { tripInvites } from '@/db/schema';
import { sendMail } from '@/lib/mailer';
import { buildInviteEmailHtml } from '@/lib/email-templates';

const inviteSchema = z.object({
  emails: z.array(z.string().email()).optional(),
  role: z.enum(['editor', 'viewer', 'traveler']).default('viewer'),
});

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

function getExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
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

  const trip = await db.query.trips.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, tripId),
    with: { tripDestinations: true },
  });
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { emails, role } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  const results: { email?: string; token: string; inviteUrl: string }[] = [];

  const emailsToInvite = emails && emails.length > 0 ? emails : [];

  if (emailsToInvite.length === 0) {
    const token = generateToken();
    const [invite] = await db.insert(tripInvites).values({
      tripId,
      invitedByUserId: session.user.id,
      email: null,
      token,
      role,
      status: 'pending',
      expiresAt: getExpiresAt(),
    }).returning();
    results.push({ token: invite.token, inviteUrl: `${appUrl}/invite/${invite.token}` });
  } else {
    for (const email of emailsToInvite) {
      const token = generateToken();
      const [invite] = await db.insert(tripInvites).values({
        tripId,
        invitedByUserId: session.user.id,
        email,
        token,
        role,
        status: 'pending',
        expiresAt: getExpiresAt(),
      }).returning();

      const inviteUrl = `${appUrl}/invite/${invite.token}`;
      results.push({ email, token: invite.token, inviteUrl });

      await sendMail({
        to: email,
        subject: `${session.user.name} invited you to "${trip.title}"`,
        html: buildInviteEmailHtml({
          inviterName: session.user.name,
          tripTitle: trip.title,
          tripDates: `${trip.startDate} – ${trip.endDate}`,
          inviteUrl,
        }),
      });
    }
  }

  return NextResponse.json({ invites: results });
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

  const invites = await db.query.tripInvites.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.tripId, tripId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  return NextResponse.json(
    invites.map((inv) => ({ ...inv, inviteUrl: `${appUrl}/invite/${inv.token}` }))
  );
}
