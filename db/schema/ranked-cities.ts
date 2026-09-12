import { pgTable, uuid, varchar, text, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { rankTiers } from './rank-tiers';

export const rankedCities = pgTable(
  'ranked_cities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    city: varchar('city', { length: 255 }).notNull(),
    state: varchar('state', { length: 255 }).notNull().default(''),
    country: varchar('country', { length: 255 }).notNull(),
    normalizedCity: varchar('normalized_city', { length: 255 }).notNull(),
    normalizedState: varchar('normalized_state', { length: 255 }).notNull().default(''),
    normalizedCountry: varchar('normalized_country', { length: 255 }).notNull(),
    rankOrder: integer('rank_order'),
    rankTierId: uuid('rank_tier_id').references(() => rankTiers.id, { onDelete: 'set null' }),
    rankLabels: text('rank_labels').array().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('ranked_cities_account_location_unique').on(
      t.accountId,
      t.normalizedCity,
      t.normalizedState,
      t.normalizedCountry,
    ),
    index('ranked_cities_account_id_idx').on(t.accountId),
    index('ranked_cities_rank_tier_id_idx').on(t.rankTierId),
  ],
);
