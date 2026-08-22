import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { accounts } from './accounts';

export const wishlistDestinations = pgTable(
  'wishlist_destinations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 10 }).notNull().default('city'), // 'city' | 'country'
    city: varchar('city', { length: 255 }),
    country: varchar('country', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    note: text('note'),
    visitedAt: timestamp('visited_at'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('wishlist_destinations_account_id_idx').on(t.accountId),
    index('wishlist_destinations_created_by_idx').on(t.createdBy),
  ]
);
