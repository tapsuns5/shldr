import 'dotenv/config';
import '@/lib/workers/gmail-webhook';
import '@/lib/workers/gmail-sync';
import '@/lib/workers/email-parser';
import '@/lib/workers/reservation-import';
import '@/lib/workers/trip-matcher';
import '@/lib/workers/notifications';
import '@/lib/workers/email-delivery';
import '@/lib/workers/gmail-watch-renewal';
import { scheduleWatchRenewal } from '@/lib/queue';

scheduleWatchRenewal()
  .then(() => {
    console.log('[gmail-worker] Scheduled hourly watch-renewal job');
  })
  .catch((err) => {
    console.error('[gmail-worker] Failed to schedule renewal job:', err);
  });

console.log('[gmail-worker] Pipeline workers started');
