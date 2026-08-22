import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { trips } from './trips';
import { reservations } from './reservations';

export const notificationTypeEnum = pgEnum('notification_type', [
  'trip_created',
  'trip_detail_imported',
  'trip_updated',
  'trip_shared',
  'email_imported',
  'system',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull().default('system'),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    reservationId: uuid('reservation_id').references(() => reservations.id, {
      onDelete: 'cascade',
    }),
    link: text('link'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('notifications_user_id_idx').on(t.userId),
    index('notifications_read_idx').on(t.read),
    index('notifications_created_at_idx').on(t.createdAt),
  ]
);
