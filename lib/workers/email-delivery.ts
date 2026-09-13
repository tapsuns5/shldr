import { Worker } from 'bullmq';
import { sendTripImportConfirmation, sendTripImportFailure } from '@/lib/mailer';
import { getRedisConnection, type EmailDeliveryJob } from '@/lib/queue';

export const emailDeliveryWorker = new Worker<EmailDeliveryJob>(
  'email-delivery',
  async (job) => {
    if (job.data.kind === 'trip-import-confirmation') {
      await sendTripImportConfirmation(job.data.options);
      return;
    }

    await sendTripImportFailure(job.data.options);
  },
  { connection: getRedisConnection() },
);

export default emailDeliveryWorker;
