import { Queue } from 'bullmq';
import type {
  TripImportConfirmationOptions,
  TripImportFailureOptions,
} from '@/lib/email-templates';

let cachedConnection: ReturnType<typeof buildConnection> | null = null;

function buildConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  const parsed = new URL(url);
  const db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) || 0 : 0;
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    db,
    maxRetriesPerRequest: null,
  } as const;
}

export function getRedisConnection() {
  if (!cachedConnection) {
    cachedConnection = buildConnection();
  }
  return cachedConnection;
}

export interface GmailWebhookJob {
  emailAddress: string;
  historyId?: string;
  rawPayload?: string;
}

export interface GmailSyncJob {
  gmailAccountId: string;
  historyId?: string | null;
  syncEventId?: string;
}

export interface EmailParserJob {
  gmailAccountId: string;
  importedEmailId: string;
}

export interface ReservationImportJob {
  gmailAccountId: string;
  importedEmailId: string;
  eventIndex: number;
}

export interface TripMatcherJob {
  gmailAccountId: string;
  importedEmailId: string;
  eventIndex: number;
}

export interface NotificationsJob {
  userId: string;
  tripId: string;
  reservationId: string;
  eventTitle: string;
  importedEmailId: string;
  isNewTrip: boolean;
}

export type EmailDeliveryJob =
  | { kind: 'trip-import-confirmation'; options: TripImportConfirmationOptions }
  | { kind: 'trip-import-failure'; options: TripImportFailureOptions };

const queueCache = new Map<string, Queue>();

function getQueue(name: string) {
  let queue = queueCache.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
    queueCache.set(name, queue);
  }
  return queue;
}

export async function enqueueGmailWebhook(job: GmailWebhookJob) {
  const queue = getQueue('gmail-webhook');
  await queue.add('webhook', job);
}

export async function enqueueGmailSync(job: GmailSyncJob) {
  const queue = getQueue('gmail-sync');
  await queue.add('sync', job, {
    jobId: job.syncEventId ? `sync-${job.syncEventId}` : undefined,
  });
}

export async function enqueueEmailParser(job: EmailParserJob) {
  const queue = getQueue('email-parser');
  await queue.add('parse', job, {
    jobId: `parse-${job.importedEmailId}`,
  });
}

export async function enqueueReservationImport(job: ReservationImportJob) {
  const queue = getQueue('reservation-import');
  await queue.add('import', job, {
    jobId: `import-${job.importedEmailId}-${job.eventIndex}`,
  });
}

export async function enqueueTripMatcher(job: TripMatcherJob) {
  const queue = getQueue('trip-matcher');
  await queue.add('match', job, {
    jobId: `match-${job.importedEmailId}-${job.eventIndex}`,
  });
}

export async function enqueueNotification(job: NotificationsJob) {
  const queue = getQueue('notifications');
  await queue.add('notify', job);
}

export async function enqueueEmailDelivery(job: EmailDeliveryJob, jobId?: string) {
  const queue = getQueue('email-delivery');
  await queue.add('send-email', job, {
    jobId,
  });
}

export async function scheduleWatchRenewal() {
  const queue = getQueue('gmail-watch-renewal');
  await queue.add(
    'renew-all',
    {},
    {
      repeat: { every: 60 * 60 * 1000 },
      jobId: 'gmail-watch-renewal-hourly',
    }
  );
}

const BULLBOARD_QUEUE_NAMES = [
  'gmail-webhook',
  'gmail-sync',
  'email-parser',
  'reservation-import',
  'trip-matcher',
  'notifications',
  'email-delivery',
  'gmail-watch-renewal',
];

export function getBullBoardQueues() {
  return BULLBOARD_QUEUE_NAMES.map((name) => new Queue(name, { connection: getRedisConnection() }));
}
