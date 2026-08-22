import { Worker } from 'bullmq';
import { createNotification } from '@/lib/notifications';
import { getRedisConnection, type NotificationsJob } from '@/lib/queue';

export const notificationsWorker = new Worker<NotificationsJob>(
  'notifications',
  async (job) => {
    const { userId, tripId, reservationId, eventTitle, isNewTrip } = job.data;

    await createNotification({
      userId,
      type: isNewTrip ? 'trip_created' : 'trip_detail_imported',
      title: isNewTrip ? `New trip created from Gmail` : `Imported ${eventTitle} from Gmail`,
      body: isNewTrip
        ? `A new trip was created and ${eventTitle} was imported.`
        : `Reservation imported from Gmail: ${eventTitle}`,
      tripId,
      link: `/tripdetails/${tripId}`,
      reservationId,
    });
  },
  { connection: getRedisConnection() }
);

export default notificationsWorker;
