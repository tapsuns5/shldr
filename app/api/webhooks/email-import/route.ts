/**
 * POST /api/webhooks/email-import
 *
 * Inbound webhook that accepts a forwarded or parsed confirmation email and:
 *   1. Verifies the shared secret (WEBHOOK_SECRET header or query param)
 *   2. Parses the email body to extract trip/reservation details
 *   3. Matches the event to an existing trip (by date window + location) or
 *      creates a new trip
 *   4. Upserts the reservation on that trip
 *   5. Sends a confirmation email to the trip owner, CC-ing any accepted
 *      trip members who have an email address
 *
 * Expected JSON payload:
 * {
 *   accountId: string (UUID)      — which account to import into
 *   userId:    string             — the user triggering the import
 *   messageId: string             — unique identifier for this email (used for dedup)
 *   subject:   string             — email subject line
 *   bodyText:  string             — plain-text body
 *   bodyHtml?: string             — optional HTML body (preferred for parsing)
 *   suggestedTripTitle?: string   — optional override for new-trip name
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { accountMembers, tripMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseConfirmationEmail } from '@/lib/email-parser';
import { matchOrCreateTrip, upsertEmailReservation } from '@/lib/trip-matcher';
import { sendTripImportConfirmation } from '@/lib/mailer';
import { createNotification } from '@/lib/notifications';

const payloadSchema = z.object({
  accountId: z.string().uuid(),
  userId: z.string().min(1),
  messageId: z.string().min(1),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
  suggestedTripTitle: z.string().optional(),
});

function verifySecret(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook/email-import] WEBHOOK_SECRET not set — accepting all requests');
    return true;
  }
  const headerSecret = request.headers.get('x-webhook-secret');
  const querySecret = new URL(request.url).searchParams.get('secret');
  return headerSecret === secret || querySecret === secret;
}

export async function POST(request: NextRequest) {
  console.log('[webhook/email-import] Received request');

  if (!verifySecret(request)) {
    console.warn('[webhook/email-import] Secret verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error('[webhook/email-import] Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[webhook/email-import] Validation error:', parsed.error.flatten());
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { accountId, userId, messageId, subject, bodyText, bodyHtml, suggestedTripTitle } = parsed.data;

  console.log('[webhook/email-import] Payload validated:', {
    accountId,
    userId,
    messageId,
    subject,
    bodyLength: bodyText.length,
    hasHtml: !!bodyHtml,
  });

  // ── 1. Verify the user is a member of the account ─────────────────────────
  const membership = await db.query.accountMembers.findFirst({
    where: and(eq(accountMembers.accountId, accountId), eq(accountMembers.userId, userId)),
  });
  if (!membership) {
    console.error('[webhook/email-import] User not a member of account');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  console.log('[webhook/email-import] User authorized for account');

  // ── 2. Parse the email ────────────────────────────────────────────────────
  const parseResult = parseConfirmationEmail({ subject, bodyText, bodyHtml });

  if (parseResult.events.length === 0) {
    console.error('[webhook/email-import] No events parsed from email');
    return NextResponse.json(
      { error: 'No recognisable trip events found in the email' },
      { status: 422 }
    );
  }

  console.log('[webhook/email-import] Parsed events:', parseResult.events.length);

  // ── 3. Match / create trip and upsert reservations ────────────────────────
  const importedItems: Array<{ type: string; title: string; date: string }> = [];
  let tripOutcome: Awaited<ReturnType<typeof matchOrCreateTrip>> | null = null;

  for (let i = 0; i < parseResult.events.length; i++) {
    const event = parseResult.events[i];

    if (!tripOutcome) {
      tripOutcome = await matchOrCreateTrip({
        accountId,
        userId,
        event,
        suggestedTitle: suggestedTripTitle,
      });
    }

    const externalUid = `email::${messageId}::${i}`;
    await upsertEmailReservation({
      tripId: tripOutcome.tripId,
      userId,
      event,
      externalUid,
      rawEmailHtml: bodyHtml ?? bodyText,
      rawEmailSubject: subject,
    });

    importedItems.push({
      type: event.type,
      title: event.title,
      date: event.startDateTime
        ? event.startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Unknown date',
    });
  }

  if (!tripOutcome) {
    console.error('[webhook/email-import] Failed to match or create trip');
    return NextResponse.json({ error: 'Failed to match or create trip' }, { status: 500 });
  }

  console.log('[webhook/email-import] Trip outcome:', {
    tripId: tripOutcome.tripId,
    tripTitle: tripOutcome.tripTitle,
    isNewTrip: tripOutcome.isNewTrip,
  });

  // ── 3b. Create notifications for all trip members ─────────────────────────
  const tripMembersList = await db.query.tripMembers.findMany({
    where: eq(tripMembers.tripId, tripOutcome.tripId),
  });

  const importItemsSummary = importedItems
    .map((item) => `${item.title} (${item.date})`)
    .join(', ');

  const notifTitle = tripOutcome.isNewTrip
    ? `New trip created: ${tripOutcome.tripTitle}`
    : `New details imported to ${tripOutcome.tripTitle}`;
  const notifBody = `Imported from email: ${importItemsSummary}`;
  const notifLink = `/tripdetails/${tripOutcome.tripId}`;

  for (const member of tripMembersList) {
    try {
      await createNotification({
        userId: member.userId,
        type: tripOutcome.isNewTrip ? 'trip_created' : 'trip_detail_imported',
        title: notifTitle,
        body: notifBody,
        tripId: tripOutcome.tripId,
        link: notifLink,
      });
    } catch (err) {
      console.error('[webhook/email-import] Failed to create notification for user:', member.userId, err);
    }
  }
  console.log('[webhook/email-import] Notifications created for', tripMembersList.length, 'members');

  // ── 4. Build confirmation email recipient list ────────────────────────────
  const ownerUser = await db.query.user.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, userId),
  });

  // Fetch all accepted trip members (excluding the owner) who have a user account
  const members = await db.query.tripMembers.findMany({
    where: eq(tripMembers.tripId, tripOutcome.tripId),
    with: { user: true },
  });

  const ccEmails: string[] = members
    .filter((m) => m.userId !== userId && m.user?.email)
    .map((m) => m.user!.email);

  console.log('[webhook/email-import] Email recipients:', {
    to: ownerUser?.email,
    cc: ccEmails,
  });

  // ── 5. Send confirmation email ────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  const tripUrl = `${appUrl}/tripdetails/${tripOutcome.tripId}`;

  const tripDates = (() => {
    const s = parseResult.tripStartDate;
    const e = parseResult.tripEndDate;
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!s) return 'Dates TBD';
    if (!e || s.toDateString() === e.toDateString()) return fmt(s);
    return `${fmt(s)} – ${fmt(e)}`;
  })();

  if (ownerUser?.email) {
    try {
      await sendTripImportConfirmation({
        ownerEmail: ownerUser.email,
        ownerName: ownerUser.name ?? 'there',
        ccEmails,
        tripTitle: tripOutcome.tripTitle,
        tripDates,
        tripLocation: parseResult.tripLocation,
        tripUrl,
        isNewTrip: tripOutcome.isNewTrip,
        importedItems,
      });
      console.log('[webhook/email-import] Confirmation email sent');
    } catch (err) {
      console.error('[webhook/email-import] Failed to send confirmation email:', err);
    }
  } else {
    console.warn('[webhook/email-import] No owner email found, skipping confirmation email');
  }

  console.log('[webhook/email-import] Request completed successfully');

  return NextResponse.json({
    success: true,
    tripId: tripOutcome.tripId,
    tripTitle: tripOutcome.tripTitle,
    isNewTrip: tripOutcome.isNewTrip,
    importedCount: importedItems.length,
    items: importedItems,
  });
}
