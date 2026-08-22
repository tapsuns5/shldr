import { Worker } from 'bullmq';
import { db } from '@/db';
import { gmailAccounts, gmailSyncEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getRedisConnection, enqueueGmailSync, type GmailWebhookJob } from '@/lib/queue';

export const gmailWebhookWorker = new Worker<GmailWebhookJob>(
  'gmail-webhook',
  async (job) => {
    const { emailAddress, historyId, rawPayload } = job.data;

    const account = await db.query.gmailAccounts.findFirst({
      where: eq(gmailAccounts.email, emailAddress),
    });
    if (!account) {
      console.warn('[gmail-webhook] No account for email:', emailAddress);
      return;
    }

    const [event] = await db
      .insert(gmailSyncEvents)
      .values({
        gmailAccountId: account.id,
        historyId: historyId ?? null,
        payload: rawPayload ?? null,
        status: 'PENDING',
      })
      .returning();

    await enqueueGmailSync({
      gmailAccountId: account.id,
      historyId: historyId ?? null,
      syncEventId: event.id,
    });
  },
  { connection: getRedisConnection() }
);

export default gmailWebhookWorker;
