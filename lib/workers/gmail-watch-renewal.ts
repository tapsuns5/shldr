import { Worker } from 'bullmq';
import { db } from '@/db';
import { gmailAccounts } from '@/db/schema';
import { lte, eq } from 'drizzle-orm';
import { refreshAccessToken, registerGmailWatch } from '@/lib/gmail';
import { getRedisConnection } from '@/lib/queue';

export const gmailWatchRenewalWorker = new Worker(
  'gmail-watch-renewal',
  async () => {
    const renewalWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const accounts = await db.query.gmailAccounts.findMany({
      where: lte(gmailAccounts.watchExpiration, renewalWindow),
    });

    console.log('[gmail-watch-renewal] Accounts needing renewal:', accounts.length);

    for (const account of accounts) {
      try {
        const { accessToken, refreshToken } = await refreshAccessToken(account.id);
        const watch = await registerGmailWatch({ access_token: accessToken, refresh_token: refreshToken });
        await db
          .update(gmailAccounts)
          .set({
            historyId: watch.historyId ?? account.historyId,
            watchExpiration: watch.expiration ? new Date(watch.expiration) : account.watchExpiration,
            syncStatus: 'ACTIVE',
            updatedAt: new Date(),
          })
          .where(eq(gmailAccounts.id, account.id));
        console.log('[gmail-watch-renewal] Renewed watch for:', account.email);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[gmail-watch-renewal] Failed to renew watch for:', account.email, msg);
        await db
          .update(gmailAccounts)
          .set({
            syncStatus: 'ERROR',
            updatedAt: new Date(),
          })
          .where(eq(gmailAccounts.id, account.id));
      }
    }
  },
  { connection: getRedisConnection() }
);

export default gmailWatchRenewalWorker;
