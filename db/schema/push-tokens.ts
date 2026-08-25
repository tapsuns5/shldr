import { pgTable, uuid, text, varchar, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const pushPlatformEnum = pgEnum('push_platform', ['ios', 'android']);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: pushPlatformEnum('platform').notNull(),
    deviceId: varchar('device_id', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  },
  (t) => [
    unique('push_tokens_token_unique').on(t.token),
    index('push_tokens_user_id_idx').on(t.userId),
  ]
);
