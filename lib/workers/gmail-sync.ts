import { Worker } from 'bullmq';
import { db } from '@/db';
import { gmailAccounts, gmailSyncEvents, importedEmails } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGmailClientForAccount } from '@/lib/gmail';
import { getRedisConnection, enqueueEmailParser, type GmailSyncJob } from '@/lib/queue';

export const gmailSyncWorker = new Worker<GmailSyncJob>(
  'gmail-sync',
  async (job) => {
    const { gmailAccountId, historyId: jobHistoryId, syncEventId } = job.data;

    if (syncEventId) {
      await db
        .update(gmailSyncEvents)
        .set({ status: 'PROCESSING' })
        .where(eq(gmailSyncEvents.id, syncEventId));
    }

    const account = await db.query.gmailAccounts.findFirst({
      where: eq(gmailAccounts.id, gmailAccountId),
    });
    if (!account) {
      throw new Error('Gmail account not found');
    }

    const gmail = await getGmailClientForAccount(gmailAccountId);
    const startHistoryId = jobHistoryId ?? account.historyId ?? undefined;
    if (!startHistoryId) {
      console.log('[gmail-sync] No startHistoryId, skipping sync for account:', gmailAccountId);
      if (syncEventId) {
        await db
          .update(gmailSyncEvents)
          .set({ status: 'COMPLETED', processedAt: new Date() })
          .where(eq(gmailSyncEvents.id, syncEventId));
      }
      return;
    }

    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: String(startHistoryId),
      historyTypes: ['messageAdded'],
    });

    const history = historyRes.data.history ?? [];
    const currentHistoryId = historyRes.data.historyId ?? account.historyId;

    const messageIds = new Set<string>();
    for (const entry of history) {
      for (const added of entry.messagesAdded ?? []) {
        if (added.message?.id) {
          messageIds.add(added.message.id);
        }
      }
    }

    console.log('[gmail-sync] Messages to fetch:', messageIds.size);

    let enqueued = 0;
    let skipped = 0;
    let failed = 0;

    for (const messageId of messageIds) {
      try {
        const existing = await db.query.importedEmails.findFirst({
          where: and(eq(importedEmails.gmailAccountId, gmailAccountId), eq(importedEmails.gmailMessageId, messageId)),
        });
        if (existing) {
          console.log('[gmail-sync] Already imported, skipping:', messageId);
          skipped++;
          continue;
        }

        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'raw',
        });

        const raw = msgRes.data.raw;
        if (!raw) {
          console.warn('[gmail-sync] No raw content for message:', messageId);
          continue;
        }

        const [record] = await db
          .insert(importedEmails)
          .values({
            gmailAccountId,
            gmailMessageId: messageId,
            gmailThreadId: msgRes.data.threadId ?? null,
            processingStatus: 'QUEUED',
            rawPayload: raw,
          })
          .returning();

        await enqueueEmailParser({
          gmailAccountId,
          importedEmailId: record.id,
        });
        enqueued++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error('[gmail-sync] Failed to fetch message:', messageId, message);
        await db.insert(importedEmails).values({
          gmailAccountId,
          gmailMessageId: messageId,
          processingStatus: 'FAILED',
        }).onConflictDoNothing({ target: [importedEmails.gmailAccountId, importedEmails.gmailMessageId] });
      }
    }

    await db
      .update(gmailAccounts)
      .set({
        historyId: currentHistoryId ? String(currentHistoryId) : account.historyId,
        lastSyncAt: new Date(),
        syncStatus: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, gmailAccountId));

    if (syncEventId) {
      await db
        .update(gmailSyncEvents)
        .set({ status: 'COMPLETED', processedAt: new Date() })
        .where(eq(gmailSyncEvents.id, syncEventId));
    }

    console.log('[gmail-sync] Completed. enqueued:', enqueued, 'skipped:', skipped, 'failed:', failed);
  },
  { connection: getRedisConnection() }
);

gmailSyncWorker.on('failed', (job, err) => {
  console.error('[gmail-sync-worker] Job failed:', job?.id, err);
  const syncEventId = job?.data.syncEventId;
  if (syncEventId) {
    db.update(gmailSyncEvents)
      .set({ status: 'FAILED', error: err.message, processedAt: new Date() })
      .where(eq(gmailSyncEvents.id, syncEventId))
      .catch(console.error);
  }
});

export default gmailSyncWorker;
