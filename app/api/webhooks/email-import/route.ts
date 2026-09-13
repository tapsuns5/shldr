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
import { accountMembers, tripMembers, notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseConfirmationEmail } from '@/lib/email-parser';
import {
  enrichHostingerBody,
  isHostingerMessageReceived,
  normalizeHostingerPayload,
  resolveImportAccount,
  verifyHostingerBearerToken,
} from '@/lib/hostinger-email';
import { matchOrCreateTrip, upsertEmailReservation } from '@/lib/trip-matcher';
import { enqueueEmailDelivery } from '@/lib/queue';
import { createNotification } from '@/lib/notifications';

function notifyImportFailure(opts: {
  to: string;
  recipientName: string;
  originalSubject?: string;
  reason: string;
  tips?: string[];
}, jobId?: string) {
  // Queue delivery so Hostinger receives an acknowledgement without waiting
  // for SMTP, while a persistent worker retries failed email sends.
  void enqueueEmailDelivery({ kind: 'trip-import-failure', options: opts }, jobId).catch((err) => {
    console.error('[webhook/email-import] Failed to enqueue failure email:', err);
  });
}

const payloadSchema = z.object({
  accountId: z.string().uuid(),
  userId: z.string().min(1),
  messageId: z.string().min(1),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
  suggestedTripTitle: z.string().optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function valueAsString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function verifySecret(request: NextRequest): boolean {
  const hostingerToken = process.env.HOSTINGER_WEBHOOK_BEARER_TOKEN;
  if (hostingerToken) {
    return verifyHostingerBearerToken(request.headers.get('authorization'), hostingerToken);
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook/email-import] No webhook secret configured — accepting request');
    return true;
  }
  const headerSecret = request.headers.get('x-webhook-secret');
  const querySecret = new URL(request.url).searchParams.get('secret');
  return headerSecret === secret || querySecret === secret;
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'email-import' });
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

  let accountId: string;
  let userId: string;
  let messageId: string;
  let subject: string;
  let bodyText: string;
  let bodyHtml: string | undefined;
  let suggestedTripTitle: string | undefined;

  const raw = isRecord(body) ? body : null;
  const looksLikeHostinger = !!raw && (
    'event' in raw || 'event_type' in raw || 'type' in raw || 'data' in raw || 'message' in raw
  );

  if (looksLikeHostinger) {
    if (!isHostingerMessageReceived(raw)) {
      const eventType = valueAsString(raw.event_type) ?? valueAsString(raw.event) ?? valueAsString(raw.type);
      return NextResponse.json({ ok: true, ignored: true, eventType });
    }

    const normalized = normalizeHostingerPayload(raw);
    if (!normalized) {
      return NextResponse.json({ error: 'Unparseable Hostinger message' }, { status: 400 });
    }
    const message = await enrichHostingerBody(normalized);
    const accountHint = valueAsString(raw.accountId) ?? valueAsString(raw.account_id)
      ?? (raw.data && isRecord(raw.data) ? valueAsString(raw.data.accountId) ?? valueAsString(raw.data.account_id) : null);
    const resolved = await resolveImportAccount(message.fromEmail, accountHint);
    if (resolved.status === 'unknown_sender') {
      console.warn('[webhook/email-import] Ignoring unknown sender:', message.fromEmail);
      notifyImportFailure({
        to: message.fromEmail,
        recipientName: message.fromName ?? 'there',
        originalSubject: message.subject,
        reason: 'This email address isn\u2019t linked to a Shldr account.',
        tips: [
          'Forward confirmations from the email address you use to sign in to Shldr.',
          'Or connect that email address under Settings \u2192 Integrations.',
        ],
      });
      return NextResponse.json({ ok: true, ignored: true, reason: 'unknown_sender' });
    }
    if (resolved.status === 'ambiguous') {
      console.warn('[webhook/email-import] Ignoring ambiguous sender:', {
        from: message.fromEmail,
        accountIds: resolved.accountIds,
      });
      notifyImportFailure({
        to: message.fromEmail,
        recipientName: message.fromName ?? 'there',
        originalSubject: message.subject,
        reason: 'Your email address is linked to multiple Shldr accounts, so we couldn\u2019t tell which one to import into.',
        tips: [
          'Make sure you only belong to the Shldr accounts you actively use.',
          'Contact support if you need help merging or removing an account.',
        ],
      });
      return NextResponse.json({ ok: true, ignored: true, reason: 'ambiguous_sender', accountIds: resolved.accountIds });
    }

    accountId = resolved.accountId;
    userId = resolved.userId;
    messageId = message.messageId ?? message.eventId;
    subject = message.subject;
    bodyText = message.bodyText ?? message.bodyHtml ?? '';
    bodyHtml = message.bodyHtml ?? undefined;
  } else {
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[webhook/email-import] Validation error:', parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    ({ accountId, userId, messageId, subject, bodyText, bodyHtml, suggestedTripTitle } = parsed.data);
  }

  if (!bodyText.trim() && !bodyHtml?.trim()) {
    return NextResponse.json({ error: 'Email has no body' }, { status: 422 });
  }

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
    const importer = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    });
    if (importer?.email) {
      notifyImportFailure({
        to: importer.email,
        recipientName: importer.name ?? 'there',
        originalSubject: subject,
        reason: 'We couldn\u2019t find any recognizable travel details (flights, hotels, or reservations) in the email.',
        tips: [
          'Forward the original booking confirmation rather than a reply or summary.',
          'Make sure the email includes the full confirmation details.',
          'You can always add plans manually from the trip page.',
        ],
      });
    }
    return NextResponse.json(
      { error: 'No recognisable trip events found in the email' },
      { status: 422 }
    );
  }

  console.log('[webhook/email-import] Parsed events:', parseResult.events.length);

  // ── 3. Match / create trip and upsert reservations ────────────────────────
  const importedItems: Array<{ type: string; title: string; date: string }> = [];
  let tripOutcome: Awaited<ReturnType<typeof matchOrCreateTrip>> | null = null;
  let newReservationCount = 0;

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
    const reservationResult = await upsertEmailReservation({
      tripId: tripOutcome.tripId,
      userId,
      event,
      externalUid,
      rawEmailHtml: bodyHtml ?? bodyText,
      rawEmailSubject: subject,
    });

    if (!reservationResult.isNew) continue;
    newReservationCount += 1;
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
    const importer = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    });
    if (importer?.email) {
      notifyImportFailure({
        to: importer.email,
        recipientName: importer.name ?? 'there',
        originalSubject: subject,
        reason: 'Something went wrong on our side while importing your email.',
        tips: ['Try forwarding it again in a few minutes.', 'Contact support if the problem persists.'],
      });
    }
    return NextResponse.json({ error: 'Failed to match or create trip' }, { status: 500 });
  }

  console.log('[webhook/email-import] Trip outcome:', {
    tripId: tripOutcome.tripId,
    tripTitle: tripOutcome.tripTitle,
    isNewTrip: tripOutcome.isNewTrip,
    newReservationCount,
  });

  // Hostinger retries timed-out deliveries. If every reservation already
  // existed, this is a duplicate delivery and must not create more notifications
  // or confirmation emails.
  if (newReservationCount === 0) {
    return NextResponse.json({
      success: true,
      duplicate: true,
      tripId: tripOutcome.tripId,
      tripTitle: tripOutcome.tripTitle,
      isNewTrip: tripOutcome.isNewTrip,
      importedCount: 0,
      items: [],
    });
  }

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

  void (async () => {
    for (const member of tripMembersList) {
      try {
        const existing = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, member.userId),
            eq(notifications.tripId, tripOutcome!.tripId),
            eq(notifications.type, tripOutcome!.isNewTrip ? 'trip_created' : 'trip_detail_imported'),
            eq(notifications.body, notifBody),
          ),
        });
        if (existing) continue;

        await createNotification({
          userId: member.userId,
          type: tripOutcome!.isNewTrip ? 'trip_created' : 'trip_detail_imported',
          title: notifTitle,
          body: notifBody,
          tripId: tripOutcome!.tripId,
          link: notifLink,
        });
      } catch (err) {
        console.error('[webhook/email-import] Failed to create notification for user:', member.userId, err);
      }
    }
    console.log('[webhook/email-import] Notifications created for', tripMembersList.length, 'members');
  })();

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
    void enqueueEmailDelivery({
      kind: 'trip-import-confirmation',
      options: {
        ownerEmail: ownerUser.email,
        ownerName: ownerUser.name ?? 'there',
        ccEmails,
        tripTitle: tripOutcome.tripTitle,
        tripDates,
        tripLocation: parseResult.tripLocation,
        tripUrl,
        isNewTrip: tripOutcome.isNewTrip,
        isUncategorized: tripOutcome.tripTitle === 'Uncategorized',
        importedItems,
      },
    }, `trip-import-confirmation-${messageId}`).then(() => {
      console.log('[webhook/email-import] Confirmation email queued');
    }).catch((err) => {
      console.error('[webhook/email-import] Failed to enqueue confirmation email:', err);
    });
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
