import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type NotificationType =
  | 'trip_created'
  | 'trip_detail_imported'
  | 'trip_updated'
  | 'trip_shared'
  | 'email_imported'
  | 'system';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  tripId?: string;
  reservationId?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      tripId: input.tripId ?? null,
      reservationId: input.reservationId ?? null,
      link: input.link ?? null,
    })
    .returning();

  return notification;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];

  const created = await db
    .insert(notifications)
    .values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        tripId: input.tripId ?? null,
        reservationId: input.reservationId ?? null,
        link: input.link ?? null,
      }))
    )
    .returning();

  return created;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const unread = await db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), eq(notifications.read, false)),
  });
  return unread.length;
}

export async function getNotifications(userId: string, limit = 50) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}

export async function markAsRead(notificationId: string) {
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
