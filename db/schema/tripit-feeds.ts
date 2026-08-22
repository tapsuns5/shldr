import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const tripitFeedStatusEnum = pgEnum('tripit_feed_status', [
  'active',
  'paused',
  'error',
]);

export const tripitFeeds = pgTable(
  'tripit_feeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    icalUrl: text('ical_url').notNull(),
    status: tripitFeedStatusEnum('status').notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('tripit_feeds_account_id_idx').on(t.accountId)]
);
