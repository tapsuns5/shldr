import { Worker } from 'bullmq';
import { db } from '@/db';
import { importedEmails, gmailAccounts, reservationImportLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { matchOrCreateTrip, upsertEmailReservation } from '@/lib/trip-matcher';
import { getRedisConnection, enqueueNotification, type TripMatcherJob } from '@/lib/queue';
import { deserializeEvents, type ParsedEmailEvent } from '@/lib/email-parser';

function calculateConfidence(event: ParsedEmailEvent): number {
  let score = 0;
  if (event.confirmationNumber) score += 0.35;
  if (event.startDateTime) score += 0.25;
  if (event.providerName) score += 0.15;
  if (event.destinationCity || event.location) score += 0.15;
  if (event.type !== 'other') score += 0.1;
  return Math.min(0.99, score);
}

export const tripMatcherWorker = new Worker<TripMatcherJob>(
  'trip-matcher',
  async (job) => {
    const { gmailAccountId, importedEmailId, eventIndex } = job.data;
    const startedAt = Date.now();

    const email = await db.query.importedEmails.findFirst({
      where: eq(importedEmails.id, importedEmailId),
      with: { gmailAccount: true },
    });
    if (!email) {
      throw new Error('Imported email not found');
    }
    if (!email.parsedPayload) {
      throw new Error('Missing parsed payload');
    }

    const account = email.gmailAccount;
    if (!account) {
      throw new Error('Gmail account not found');
    }

    const events = deserializeEvents(email.parsedPayload);
    const event = events[eventIndex];
    if (!event) {
      throw new Error(`Event index ${eventIndex} not found`);
    }

    const externalUid = `gmail::${gmailAccountId}::${email.gmailMessageId}::${eventIndex}`;

    const tripOutcome = await matchOrCreateTrip({
      accountId: account.accountId,
      userId: account.userId,
      event,
      suggestedTitle: event.destinationCity ? `Trip to ${event.destinationCity}` : undefined,
    });

    const { reservationId, isNew } = await upsertEmailReservation({
      tripId: tripOutcome.tripId,
      userId: account.userId,
      event,
      externalUid,
      rawEmailHtml: email.bodyHtml ?? email.rawPayload,
      rawEmailSubject: email.subject,
    });

    await db.insert(reservationImportLogs).values({
      reservationId,
      source: 'gmail',
      confidence: String(calculateConfidence(event)),
      parserUsed: 'deterministic',
      processingTime: String((Date.now() - startedAt) / 1000),
    });

    await db
      .update(importedEmails)
      .set({
        processingStatus: 'IMPORTED',
        reservationId,
      })
      .where(eq(importedEmails.id, importedEmailId));

    await enqueueNotification({
      userId: account.userId,
      tripId: tripOutcome.tripId,
      reservationId,
      eventTitle: event.title,
      importedEmailId,
      isNewTrip: tripOutcome.isNewTrip,
    });
  },
  { connection: getRedisConnection() }
);

export default tripMatcherWorker;
