import { Worker } from 'bullmq';
import { db } from '@/db';
import { importedEmails, reservations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getRedisConnection, enqueueTripMatcher, type ReservationImportJob } from '@/lib/queue';
import { deserializeEvents, type ParsedEmailEvent } from '@/lib/email-parser';

export const reservationImportWorker = new Worker<ReservationImportJob>(
  'reservation-import',
  async (job) => {
    const { gmailAccountId, importedEmailId, eventIndex } = job.data;

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

    const existingRows = await db.query.reservations.findMany({
      where: eq(reservations.providerWebsite, externalUid),
      with: { trip: true },
    });

    const existing = existingRows.find((r) => r.trip?.accountId === account.accountId);
    if (existing) {
      await db
        .update(importedEmails)
        .set({
          processingStatus: 'IMPORTED',
          reservationId: existing.id,
        })
        .where(eq(importedEmails.id, importedEmailId));
      return;
    }

    await enqueueTripMatcher({
      gmailAccountId,
      importedEmailId,
      eventIndex,
    });
  },
  { connection: getRedisConnection() }
);

export default reservationImportWorker;
