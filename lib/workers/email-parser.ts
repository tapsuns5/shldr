import { Worker } from 'bullmq';
import { simpleParser } from 'mailparser';
import { db } from '@/db';
import { importedEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseConfirmationEmail } from '@/lib/email-parser';
import { getRedisConnection, enqueueReservationImport, type EmailParserJob } from '@/lib/queue';

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export const emailParserWorker = new Worker<EmailParserJob>(
  'email-parser',
  async (job) => {
    const { importedEmailId } = job.data;

    const email = await db.query.importedEmails.findFirst({
      where: eq(importedEmails.id, importedEmailId),
    });
    if (!email) {
      throw new Error('Imported email not found');
    }
    if (!email.rawPayload) {
      throw new Error('Missing raw payload');
    }

    const raw = base64UrlDecode(email.rawPayload);
    const parsed = await simpleParser(raw);

    const subject = parsed.subject ?? '(no subject)';
    const sender = typeof parsed.from?.text === 'string' ? parsed.from.text : null;
    const receivedAt = parsed.date && parsed.date instanceof Date ? parsed.date : new Date();

    const bodyText = typeof parsed.text === 'string' ? parsed.text : '';
    const bodyHtml = typeof parsed.html === 'string' ? parsed.html : undefined;

    const parseResult = parseConfirmationEmail({ subject, bodyText, bodyHtml });

    if (parseResult.events.length === 0) {
      await db
        .update(importedEmails)
        .set({
          sender,
          subject,
          receivedAt,
          processingStatus: 'SKIPPED',
        })
        .where(eq(importedEmails.id, importedEmailId));
      return;
    }

    await db
      .update(importedEmails)
      .set({
        sender,
        subject,
        receivedAt,
        reservationType: parseResult.events[0]?.type ?? null,
        processingStatus: 'PROCESSING',
        parsedPayload: JSON.stringify(parseResult.events),
        bodyHtml: bodyHtml ?? null,
      })
      .where(eq(importedEmails.id, importedEmailId));

    for (let i = 0; i < parseResult.events.length; i++) {
      await enqueueReservationImport({
        gmailAccountId: email.gmailAccountId,
        importedEmailId,
        eventIndex: i,
      });
    }
  },
  { connection: getRedisConnection() }
);

export default emailParserWorker;
